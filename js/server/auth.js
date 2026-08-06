/**
 * auth.js (server)
 * Verifies Firebase ID tokens and enforces the authorized-email allowlist.
 *
 * WHY THIS EXISTS
 * Every /api route used to be completely unauthenticated: an unauthenticated
 * POST to /api/sync returned 200 and could read or overwrite the entire child
 * medical database. All login logic lived in the browser, where it is advisory
 * only. This module makes the server the actual security boundary.
 *
 * HOW VERIFICATION WORKS
 * Firebase ID tokens are RS256 JWTs signed by Google. We fetch Google's public
 * x509 certificates, verify the signature, and check the standard claims
 * (exp/iat/aud/iss/sub). This uses only Node's built-in crypto, so it adds no
 * dependency and needs no service-account key.
 */

const crypto = require('crypto');

// Google's public certs for Firebase ID tokens.
const CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// Firebase project that issues the tokens.
const PROJECT_ID = (process.env.FIREBASE_PROJECT_ID || 'anirudh-449ca').trim();

// Server-side allowlist. Set AUTHORIZED_EMAILS as a comma-separated list.
// This is deliberately independent of Firestore so that a misconfigured or
// compromised database cannot by itself grant API access.
const ALLOWED_EMAILS = new Set(
  (process.env.AUTHORIZED_EMAILS || 'tejassachin2010@gmail.com,sachinsharma.hr@gmail.com,ayushahome@gmail.com')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
);

// Cached certificates, refreshed according to the response's Cache-Control.
let certCache = { keys: null, expiresAt: 0 };

/**
 * Fetch (and cache) Google's token-signing certificates.
 * @returns {Promise<Record<string,string>>} map of kid -> PEM certificate
 */
async function getSigningCerts() {
  const now = Date.now();
  if (certCache.keys && now < certCache.expiresAt) {
    return certCache.keys;
  }

  const res = await fetch(CERT_URL);
  if (!res.ok) throw new Error(`Could not fetch signing certs (${res.status})`);
  const keys = await res.json();

  // Respect Google's cache lifetime; fall back to one hour.
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600 * 1000;

  certCache = { keys, expiresAt: now + maxAgeMs };
  return keys;
}

/** Decode a base64url segment into a UTF-8 string. */
function base64UrlDecode(segment) {
  return Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

/**
 * Verify a Firebase ID token's signature and claims.
 * @param {string} token
 * @returns {Promise<{uid: string, email: string, emailVerified: boolean}>}
 * @throws {Error} when the token is malformed, expired, or not trustworthy
 */
async function verifyIdToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(base64UrlDecode(headerB64));
  const payload = JSON.parse(base64UrlDecode(payloadB64));

  if (header.alg !== 'RS256') throw new Error('Unexpected token algorithm');
  if (!header.kid) throw new Error('Token missing key id');

  // Verify the signature against Google's published certificate.
  const certs = await getSigningCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error('Unknown token signing key');

  const publicKey = new crypto.X509Certificate(cert).publicKey;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  const signature = Buffer.from(
    signatureB64.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  );
  if (!verifier.verify(publicKey, signature)) {
    throw new Error('Invalid token signature');
  }

  // Standard Firebase ID token claim checks.
  const nowSec = Math.floor(Date.now() / 1000);
  const SKEW = 60; // tolerate small clock drift

  if (typeof payload.exp !== 'number' || payload.exp < nowSec - SKEW) {
    throw new Error('Token expired');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + SKEW) {
    throw new Error('Token issued in the future');
  }
  if (payload.aud !== PROJECT_ID) {
    throw new Error('Token audience mismatch');
  }
  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) {
    throw new Error('Token issuer mismatch');
  }
  if (!payload.sub) {
    throw new Error('Token missing subject');
  }

  return {
    uid: payload.sub,
    email: String(payload.email || '').trim().toLowerCase(),
    emailVerified: payload.email_verified === true
  };
}

/**
 * Express middleware: require a valid ID token from an allowlisted account.
 * Responds 401 when the token is missing/invalid and 403 when the verified
 * account is not on the allowlist.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let user;
  try {
    user = await verifyIdToken(match[1]);
  } catch (err) {
    console.warn('[auth] Token rejected:', err.message);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  if (!user.email || !user.emailVerified) {
    return res.status(403).json({ error: 'A verified Google email is required' });
  }

  if (!ALLOWED_EMAILS.has(user.email)) {
    console.warn(`[auth] Denied non-allowlisted account: ${user.email}`);
    return res.status(403).json({ error: 'This account is not authorized' });
  }

  req.user = user;
  next();
}

module.exports = { requireAuth, verifyIdToken, ALLOWED_EMAILS };
