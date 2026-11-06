process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
// Load .env from this folder, not the working directory: hosting panels
// (cPanel / Passenger / LiteSpeed) do not always start the app from its root.
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
// The field encryption key may sit in its own file, kept apart from the other settings.
require('dotenv').config({ path: path.join(__dirname, '.env.fieldkey'), quiet: true });
// The "Ask Ayusha" prototype's API key (sandbox only; the assistant stays off unless ASSISTANT_ENABLED=true).
require('dotenv').config({ path: path.join(__dirname, '.env.assistant'), quiet: true });

// Per-NGO OAuth Integration Module
const {
  driveOwnerFor,
  driveEditorsFor,
  buildOAuthClient,
  getAuthUrl,
  getClientForNgo,
  getNgoIntegration,
  saveNgoIntegration,
  syncChildrenToGoogleSheets: oauthSyncSheets,
  pullChildrenFromGoogleSheets: oauthPullSheets,
  deleteChildFromGoogleSheets: oauthDeleteChild,
  syncExecutiveDocToGoogleDocs,
  uploadDocumentToChildDrive
} = require('./js/server/googleOAuth');

// Server-side authentication (Firebase ID token + email allowlist)
const { requireAuth, requireRole, roleFor, isAuthorizedEmail, IS_PRODUCTION } = require('./js/server/auth');

// Field-level encryption of Aadhaar and insurance IDs (stored encrypted, sent masked)
const { isEncryptionReady, maskPayload, maskForClient, unmaskFromStored, storedValue } = require('./js/server/fieldCrypto');
const { audit } = require('./js/server/auditLog');

// Fail closed: in production, IDs must never be stored unencrypted.
if (IS_PRODUCTION && !isEncryptionReady()) {
  console.error('CRITICAL: FIELD_ENCRYPTION_KEY is missing or invalid. Refusing to start so IDs are never stored unencrypted.');
  process.exit(1);
}

/** Admin-only routes; a refusal is recorded in the audit log. */
const adminOnly = requireRole('Admin', req => audit(req, 'denied', { reason: 'admin-only' }));

const { createRateLimiter } = require('./js/server/rateLimiter');

// Rate Limiters. Every request counts toward siteLimiter, every /api call also
// toward apiLimiter, and document uploads toward uploadLimiter as well. Staff at
// one home can share an address, so the limits leave room for several people.
const siteLimiter = createRateLimiter({ windowMs: 60000, max: 600, message: 'Too many requests. Please wait a minute.' });
const apiLimiter = createRateLimiter({ windowMs: 60000, max: 120, message: 'Too many API calls. Please wait a minute.' });
const uploadLimiter = createRateLimiter({ windowMs: 60000, max: 15, message: 'Too many document uploads. Please wait a minute.' });
const assistantLimiter = createRateLimiter({ windowMs: 60000, max: 10, message: 'Too many questions at once. Please wait a minute.' });

const app = express();
// Don't advertise the framework (OWASP A02).
app.disable('x-powered-by');

// Render terminates TLS at its edge proxy and forwards over plain HTTP, so without
// this `req.protocol` reports "http" and `req.secure` is false for every request.
// One hop only: trusting the whole chain would let a client forge X-Forwarded-For.
// Note this deliberately does NOT affect authentication — js/server/auth.js keys
// its local-development bypass on the TCP peer address, never on a proxy header.
app.set('trust proxy', 1);

// One address for the site: "www." visitors go to the bare domain, which is the
// address registered with Google for sign-in and the Google Workspace connection.
app.use((req, res, next) => {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (/^www\./i.test(host)) {
    return res.redirect(301, `https://${host.replace(/^www\./i, '')}${req.originalUrl}`);
  }
  next();
});

app.use(siteLimiter);
app.use('/api', apiLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } }); // Max 15MB

// CORS & Security Headers
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

// The retired Render site copies its browser-only records here via /api/import.
// Requests still need a valid signed-in admin token; CORS only lets the call through.
const MIGRATION_ORIGINS = ['https://ngo-4xde.onrender.com'];
MIGRATION_ORIGINS.forEach(o => { if (!ALLOWED_ORIGINS.includes(o)) ALLOWED_ORIGINS.push(o); });

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // One inline boot script in index.html; Google sign-in loads apis.google.com.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseio.com https://*.firebaseapp.com",
  "frame-src https://*.firebaseapp.com https://accounts.google.com https://*.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'"
].join('; ');

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Browser features the app never uses stay off.
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  // Google sign-in opens a popup that must be able to report back.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  if (req.secure) {
    // HTTPS only for 180 days. Subdomains are left out: not all of them may serve HTTPS.
    res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  }
  // Content Security Policy in report-only mode first: the browser reports what
  // it would block, nothing is blocked, so sign-in and report reading can't break.
  // Switch the header name to Content-Security-Policy once reports are clean.
  res.setHeader('Content-Security-Policy-Report-Only', CONTENT_SECURITY_POLICY);
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/*
 * Static frontend. ONLY the files the browser needs are served.
 *
 * This used to be `express.static(__dirname)`, which published the whole project
 * folder: data/db.json (every child's medical record), serviceAccountKey.json
 * (Firebase admin key), data/integrations/*.json (Google refresh tokens) and the
 * server source were all downloadable by anyone, without signing in.
 */
const noCacheCode = (res, filePath) => {
  if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
};
const sendPublicFile = (relativePath) => (req, res) => {
  noCacheCode(res, relativePath);
  res.sendFile(path.join(__dirname, relativePath));
};
// Public pages anyone can open (also what Google's OAuth review reads), then the app.
app.get('/', sendPublicFile('public/home.html'));
app.get('/about', sendPublicFile('public/about.html'));
app.get('/privacy', sendPublicFile('public/privacy.html'));
app.get('/terms', sendPublicFile('public/terms.html'));
app.get(['/app', '/index.html'], sendPublicFile('index.html'));
app.get('/js/bundle.js', sendPublicFile('js/bundle.js'));
app.get('/google-logo.png', sendPublicFile('google-logo.png'));
app.use('/css', express.static(path.join(__dirname, 'css'), { etag: true, setHeaders: noCacheCode }));
app.use('/assets', express.static(path.join(__dirname, 'assets'), { etag: true }));
// Report-reading libraries (pdf.js, Tesseract), loaded only when a report is read.
app.use('/vendor', express.static(path.join(__dirname, 'vendor'), { etag: true, maxAge: '30d' }));



/* ───────────────────────────────────────────────────────
   DATABASE SYNC API

   Firestore is the primary store, namespaced per NGO at
   `ngos/{ngoSlug}/...`. The tenant is resolved server-side from the verified
   token email, never from anything the client sends.

   data/db.json remains as a fallback for when no Admin service-account key for
   the Firebase project is installed. That file is a single global blob shared by
   every admin and lives on an ephemeral disk, so it is a development
   convenience, not a deployment target.
   ─────────────────────────────────────────────────────── */
const { isFirestoreEnabled, getStatus: firestoreStatus } = require('./js/server/firebaseAdmin');
const { mergeNamespace } = require('./js/server/syncMerge');
const { resolveNgoForEmail, writeSnapshot, spaceTypeFor } = require('./js/server/ngoStore');
const {
  DB_FILE,
  readFileStore,
  writeFileStore,
  readTenant
} = require('./js/server/dataSource');

const DB_DIR = path.dirname(DB_FILE);

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

/**
 * The NGO whose data this request may touch. Resolved from the verified email so
 * a client cannot read another tenant's records by passing a different slug.
 * @param {import('express').Request} req
 * @returns {Promise<{slug: string, name: string}>}
 */
async function tenantFor(req) {
  const tenant = await resolveNgoForEmail(req.user && req.user.email);
  if (req && tenant) req.tenantSlug = tenant.slug;
  return tenant;
}

// GET /api/sync - Returns this NGO's entire database
app.get('/api/sync', requireAuth, async (req, res) => {
  try {
    if (!isFirestoreEnabled()) {
      return res.json(maskPayload(readFileStore()));
    }
    const tenant = await tenantFor(req);
    const { payload } = await readTenant(tenant.slug);
    // IDs leave the server masked; the full value only through /api/reveal.
    return res.json(maskPayload(payload));
  } catch (err) {
    console.error('[sync] Read failed:', err);
    return res.status(500).json({ error: 'Failed to read database' });
  }
});

// GET /api/health - Which database backend is live, and for whom
app.get('/api/health', requireAuth, async (req, res) => {
  const firestore = isFirestoreEnabled();
  let tenant = null;
  try {
    tenant = await tenantFor(req);
  } catch (e) { }
  res.json({
    backend: firestore ? 'firestore' : 'file',
    detail: firestoreStatus(),
    ngoSlug: tenant ? tenant.slug : null,
    ngoName: tenant ? tenant.name : null,
    email: req.user ? req.user.email : null
  });
});

/* ═══════════════════════════════════════════════════════
   PER-NGO GOOGLE WORKSPACE OAUTH ROUTES & ENDPOINTS
   ═══════════════════════════════════════════════════════ */

// GET /api/google/connect?ngo=<slug> -> Start OAuth flow
// This is an `<a href>` navigation, so it can't send an auth header. Instead, we
// require the user to be signed in *to the callback*, where we verify the email
// from Google's id_token matches an allowlisted admin before storing the refresh
// token. This stops random visitors from binding their Google account to your NGO.
app.get('/api/google/connect', (req, res) => {
  const ngoSlug = (req.query.ngo || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
  const authUrl = getAuthUrl(ngoSlug, req);
  res.redirect(authUrl);
});

// GET /auth/google/callback -> Exchange authorization code for refresh token
/**
 * Spreadsheets and documents the sync creates live in the Drive of whichever
 * Google account connected. They are remembered per account, so switching the
 * connection to another account and back reuses the same files instead of
 * creating a new set each time.
 */
const ACCOUNT_FILE_FIELDS = {
  sheetId: null, spreadsheetUrl: null,
  clinicalSheetId: null, clinicalSpreadsheetUrl: null, childSheetGids: {},
  monthlySheetId: null, monthlySpreadsheetUrl: null, monthlySheetGids: {},
  bloodSheetId: null, bloodSpreadsheetUrl: null, bloodSheetGids: {},
  docId: null, documentUrl: null
};

/** The connected account's file IDs, or an empty object when it has none yet. */
function accountFiles(integration) {
  const files = {};
  Object.keys(ACCOUNT_FILE_FIELDS).forEach(key => {
    const value = integration[key];
    if (value !== undefined && value !== null && !(typeof value === 'object' && Object.keys(value).length === 0)) files[key] = value;
  });
  return files;
}

/** Store the connected account's file IDs under its email before they are replaced or cleared. */
function rememberAccountFiles(integration) {
  const email = String(integration.adminEmail || '').trim().toLowerCase();
  const files = accountFiles(integration);
  if (!email || Object.keys(files).length === 0) return;
  integration.accountFiles = { ...(integration.accountFiles || {}), [email]: files };
}

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    // Reassigned below once the connecting admin's real NGO is known.
    let ngoSlug = (req.query.state || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    if (!code) {
      return res.status(400).send('Authorization code missing from callback');
    }

    const oauthClient = buildOAuthClient(req);
    const { tokens } = await oauthClient.getToken(code);

    let adminEmail = 'Admin';
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
        if (payload && payload.email) adminEmail = payload.email;
      } catch (e) { }
    }

    // Only an authorized admin may bind a Google account to this NGO.
    //
    // The allowlist is the only test. Earlier versions also accepted any address
    // merely *containing* "tejas", "sachin" or "ayusha", and accepted everyone
    // when the allowlist was empty. On localhost that was harmless; on a public
    // URL it let a stranger with a lookalike Gmail address bind their own Google
    // account to this NGO, which would then receive every synced medical record.
    const connectingEmail = String(adminEmail || '').trim().toLowerCase();
    const isAuthorized = await isAuthorizedEmail(connectingEmail);

    if (!isAuthorized) {
      console.warn(`[oauth] Refused workspace connect from non-allowlisted account: ${connectingEmail}`);
      return res.redirect('/index.html?google_error=unauthorized#/settings');
    }
    // Connecting Google Workspace is an Admin action.
    if (roleFor(connectingEmail) !== 'Admin') {
      audit({ user: { email: connectingEmail, role: roleFor(connectingEmail) }, ip: req.ip, originalUrl: req.originalUrl }, 'denied', { reason: 'staff-google-connect' });
      return res.redirect('/index.html?google_error=unauthorized#/settings');
    }


    // The NGO comes from the connecting admin's own allowlist record, not from the
    // `state` slug the browser sent, so a crafted connect link cannot file a
    // refresh token under someone else's tenant.
    const tenant = await resolveNgoForEmail(connectingEmail);
    if (tenant.slug !== ngoSlug) {
      console.warn(
        `[oauth] state slug "${ngoSlug}" does not match ${connectingEmail}'s NGO ` +
        `"${tenant.slug}"; using the account's own NGO.`
      );
    }
    ngoSlug = tenant.slug;

    // The main NGO's files live in its main admin's Drive. Another admin's Google
    // account (even an allowlisted one) is not accepted for it, so the files can
    // never end up split across two Drives. Other NGOs connect their own admin.
    const requiredOwner = driveOwnerFor(ngoSlug);
    if (requiredOwner && connectingEmail !== requiredOwner) {
      console.warn(`[oauth] Refused workspace connect from ${connectingEmail}; only ${requiredOwner} may own ${ngoSlug}'s files.`);
      return res.redirect(`/index.html?google_error=wrong_account&expected=${encodeURIComponent(requiredOwner)}#/settings`);
    }

    console.log(`[OAuth Callback] Successfully authenticated connecting admin: ${connectingEmail} for NGO: ${ngoSlug}`);

    const existing = await getNgoIntegration(ngoSlug);
    const connectingAccount = (adminEmail !== 'Admin' ? adminEmail : (connectingEmail || '')).trim().toLowerCase();
    const isSameAccount = String(existing.adminEmail || '').toLowerCase() === connectingAccount;

    // Keep the outgoing account's files, then use the connecting account's own:
    // its current ones when it is reconnecting, the ones remembered from an
    // earlier connection when it is switching back, or none (a fresh set).
    rememberAccountFiles(existing);
    const files = isSameAccount ? accountFiles(existing)
      : ((existing.accountFiles || {})[connectingAccount] || {});

    const updated = {
      ...existing,
      ...ACCOUNT_FILE_FIELDS,
      ...files,
      refresh_token: tokens.refresh_token || existing.refresh_token,
      tokenExpired: false,
      connectedAt: new Date().toISOString(),
      adminEmail: connectingAccount,
      secondaryEmail: driveEditorsFor(ngoSlug)[0] || null
    };
    await saveNgoIntegration(ngoSlug, updated);

    // Immediately create or update Google Spreadsheet in user's Drive and populate records
    const children = await readChildrenFor(tenant);

    try {
      console.log(`[OAuth Callback] Auto-syncing Google Spreadsheet in Drive for ${connectingEmail}...`);
      await oauthSyncSheets(children, ngoSlug, tenant.name);
    } catch (e) {
      console.warn('[OAuth Callback] Google Spreadsheet auto-creation warning:', e.message);
    }

    res.redirect('/index.html?google_connected=true#/settings');
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.redirect('/index.html?google_error=true#/settings');
  }
});

// GET & POST /api/google/disconnect -> Clear stored tokens and connection for NGO
// Requires auth: this endpoint used to be open to the internet, so anyone could
// disconnect an NGO's Google Workspace. The NGO is resolved from the verified
// token, not from the query string, so one tenant cannot disconnect another.
app.all('/api/google/disconnect', requireAuth, adminOnly, async (req, res) => {
  try {
    const { slug: ngoSlug } = await tenantFor(req);
    const existing = await getNgoIntegration(ngoSlug);
    rememberAccountFiles(existing);
    delete existing.refresh_token;
    delete existing.connectedAt;
    delete existing.adminEmail;
    delete existing.sheetId;
    delete existing.spreadsheetUrl;
    delete existing.clinicalSheetId;
    delete existing.clinicalSpreadsheetUrl;
    delete existing.childSheetGids;
    delete existing.monthlySheetId;
    delete existing.monthlySpreadsheetUrl;
    delete existing.monthlySheetGids;
    delete existing.bloodSheetId;
    delete existing.bloodSpreadsheetUrl;
    delete existing.bloodSheetGids;
    delete existing.docId;
    delete existing.documentUrl;
    await saveNgoIntegration(ngoSlug, existing);

    console.log(`[Google OAuth] Disconnected Google Workspace for NGO: ${ngoSlug}`);

    if (req.method === 'POST' || req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, message: 'Google Workspace disconnected' });
    }
    return res.redirect('/index.html?google_disconnected=true#/settings');
  } catch (err) {
    console.error('[Google OAuth] Disconnect error:', err);
    if (req.method === 'POST' || req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ error: 'Failed to disconnect Google Workspace' });
    }
    return res.redirect('/index.html?google_error=true#/settings');
  }
});

/**
 * This NGO's children, from whichever backend is live. Used by the Google Sheets
 * routes that need to populate a freshly created spreadsheet.
 * @param {{slug: string}} tenant
 * @returns {Promise<object[]>}
 */
async function readChildrenFor(tenant) {
  try {
    const { payload } = await readTenant(tenant.slug);
    const raw = payload['chm-children'];
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[sheets] Could not load children for sheet population:', e.message);
    return [];
  }
}

// GET /api/sheets/config -> connection state for the caller's own NGO
app.get('/api/sheets/config', requireAuth, async (req, res) => {
  const { slug: ngoSlug, name: ngoName } = await tenantFor(req);
  let integration = await getNgoIntegration(ngoSlug);

  let connected = !!(integration && integration.refresh_token);
  let tokenExpired = !!integration?.tokenExpired;

  // Validate the refresh token with Google
  if (connected && !tokenExpired) {
    try {
      const client = buildOAuthClient();
      client.setCredentials({ refresh_token: integration.refresh_token });
      await client.getAccessToken();
    } catch (e) {
      if (e.message?.includes('invalid_grant') || e.response?.data?.error === 'invalid_grant') {
        console.warn(`[Sheets Config] Refresh token expired for ${ngoSlug}`);
        tokenExpired = true;
        connected = false;
        integration.tokenExpired = true;
        await saveNgoIntegration(ngoSlug, integration);
      }
    }
  } else if (tokenExpired) {
    connected = false;
  }

  // A family space has no Monthly Checkup Register (a children's-home register).
  let spaceType;
  try {
    spaceType = await spaceTypeFor(ngoSlug);
  } catch (e) {
    console.warn('[Sheets Config] Space type lookup notice:', e.message);
  }
  const needsMonthly = spaceType !== 'family';

  // Auto-create/sync Student Medical Records sheet if connected but not yet generated
  if (connected && (!integration.clinicalSheetId || !integration.sheetId || (needsMonthly && !integration.monthlySheetId) || !integration.bloodSheetId)) {
    try {
      const children = await readChildrenFor({ slug: ngoSlug });
      await oauthSyncSheets(children, ngoSlug, ngoName);
      integration = await getNgoIntegration(ngoSlug); // Refresh snapshot after auto-sync
    } catch (e) {
      console.warn('[Sheets Config] Auto-sync notice:', e.message);
    }
  }

  res.json({
    connected,
    tokenExpired,
    spaceType,
    driveOwnerEmail: driveOwnerFor(ngoSlug),
    adminEmail: integration.adminEmail || null,
    secondaryEmail: integration.secondaryEmail || null,
    sheetId: integration.sheetId || null,
    spreadsheetUrl: integration.spreadsheetUrl || null,
    clinicalSheetId: integration.clinicalSheetId || null,
    clinicalSpreadsheetUrl: integration.clinicalSpreadsheetUrl || null,
    monthlySpreadsheetUrl: integration.monthlySpreadsheetUrl || null,
    monthlySheetGids: integration.monthlySheetGids || {},
    bloodSpreadsheetUrl: integration.bloodSpreadsheetUrl || null,
    bloodSheetGids: integration.bloodSheetGids || {},
    childSheetGids: integration.childSheetGids || {}
  });
});

// POST /api/sheets/sync
app.post('/api/sheets/sync', requireAuth, async (req, res) => {
  try {
    const { children } = req.body || {};
    const { slug: ngoSlug, name: ngoName } = await tenantFor(req);
    // The sheet keeps full IDs: replace the browser's masked values with the real ones.
    const stored = await readChildrenFor({ slug: ngoSlug });
    const result = await oauthSyncSheets(unmaskFromStored(Array.isArray(children) ? children : [], stored), ngoSlug, ngoName);
    res.json(result);
  } catch (err) {
    console.warn('Per-NGO Sheets sync notice:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /api/sheets/pull
app.post('/api/sheets/pull', requireAuth, async (req, res) => {
  try {
    const { slug: ngoSlug, name: ngoName } = await tenantFor(req);
    const result = await oauthPullSheets(ngoSlug, ngoName);
    if (result && Array.isArray(result.children)) result.children = result.children.map(maskForClient);
    res.json(result);
  } catch (err) {
    console.warn('Per-NGO Sheets pull notice:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /api/docs/config -> Google Docs connection state for the caller's own NGO
app.get('/api/docs/config', requireAuth, async (req, res) => {
  const { slug: ngoSlug } = await tenantFor(req);
  const integration = await getNgoIntegration(ngoSlug);
  const connected = !!(integration && integration.refresh_token);
  res.json({
    connected,
    adminEmail: integration.adminEmail || null,
    docId: integration.docId || null,
    documentUrl: integration.documentUrl || null
  });
});

// POST /api/docs/sync
app.post('/api/docs/sync', requireAuth, async (req, res) => {
  try {
    const { reportContent } = req.body || {};
    const { slug: ngoSlug, name: ngoName } = await tenantFor(req);
    const result = await syncExecutiveDocToGoogleDocs(reportContent, ngoSlug, ngoName);
    res.json(result);
  } catch (err) {
    console.warn('Per-NGO Docs sync notice:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /api/drive/upload -> Upload a child health document directly into Google Drive (organized by child name)
app.post('/api/drive/upload', requireAuth, uploadLimiter, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document file uploaded' });
    }

    const { childName, childId, docName, docType } = req.body || {};
    const { slug: ngoSlug, name: ngoName } = await tenantFor(req);

    // Ensure valid filename with proper extension
    let fileName = (docName || req.file.originalname || 'Document').trim();
    const originalExt = path.extname(req.file.originalname || '');
    if (!path.extname(fileName)) {
      if (originalExt) {
        fileName += originalExt;
      } else if (req.file.mimetype === 'application/pdf') {
        fileName += '.pdf';
      } else if (req.file.mimetype === 'image/jpeg') {
        fileName += '.jpg';
      } else if (req.file.mimetype === 'image/png') {
        fileName += '.png';
      }
    }

    const result = await uploadDocumentToChildDrive(
      ngoSlug,
      childName || 'General Documents',
      req.file.buffer,
      fileName,
      req.file.mimetype,
      ngoName
    );

    res.json(result);
  } catch (err) {
    console.warn('[API Drive Upload] Error uploading document to Google Drive:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// mergeJSONArrays and the per-key merge rules now live in js/server/syncMerge.js
// so the Firestore store and the legacy file store cannot drift apart.

// DELETE /api/children/:id - Delete a specific child from the DB and Google Sheets
app.delete('/api/children/:id', requireAuth, adminOnly, async (req, res) => {
  try {
    const childId = req.params.id;
    const { slug: ngoSlug, name: ngoName } = await tenantFor(req);
    const result = await oauthDeleteChild(childId, ngoSlug, ngoName);
    audit(req, 'delete-child', { childId, success: !!(result && result.success) });
    res.json(result);
  } catch (err) {
    console.error('[API] Error deleting child:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// "Ask Ayusha" assistant (prototype). Off unless ASSISTANT_ENABLED=true; answers
// only from this space's records through read-only tools (js/server/assistant).
const assistant = require('./js/server/assistant/agent');

app.get('/api/assistant/status', requireAuth, (req, res) => {
  res.json({ enabled: assistant.isAssistantEnabled(), model: assistant.isAssistantEnabled() ? assistant.MODEL : null });
});

app.post('/api/assistant', assistantLimiter, requireAuth, async (req, res) => {
  if (!assistant.isAssistantEnabled()) return res.status(404).json({ error: 'The assistant is not enabled' });
  try {
    const { messages } = req.body || {};
    const conversation = (Array.isArray(messages) ? messages : [])
      .filter(m => m && typeof m.text === 'string' && m.text.trim() && ['user', 'assistant'].includes(m.role))
      .slice(-10);
    if (!conversation.length || conversation[conversation.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Ask a question' });
    }
    const tenant = await tenantFor(req);
    const { payload } = await readTenant(tenant.slug);
    const result = await assistant.ask(payload, tenant.name || tenant.slug, conversation);
    audit(req, 'assistant-query', { tools: result.toolsUsed, questionLength: conversation[conversation.length - 1].text.length });
    return res.json(result);
  } catch (err) {
    console.error('[assistant] Failed:', err.message);
    if (err.busy) return res.status(503).json({ error: 'The assistant has reached its usage limit for now. Please try again in a minute.' });
    return res.status(502).json({ error: 'The assistant could not answer right now. Please try again.' });
  }
});

// POST /api/reveal -> The full value of one masked ID, for a signed-in staff member.
// Every reveal is recorded in the audit log (who, which child, which field; never
// the value itself). Body: { childId, field: 'idNumber' | 'insurance', entryId? }
app.post('/api/reveal', requireAuth, async (req, res) => {
  try {
    const { childId, field, entryId } = req.body || {};
    if (typeof childId !== 'string' || !['idNumber', 'insurance'].includes(field) ||
        (field === 'insurance' && typeof entryId !== 'string')) {
      return res.status(400).json({ error: 'childId and field are required' });
    }
    const tenant = await tenantFor(req);
    const children = await readChildrenFor(tenant);
    const child = children.find(c => c && c.id === childId);
    const value = child ? storedValue(child, field, entryId) : undefined;
    if (!value) return res.status(404).json({ error: 'Not found' });
    audit(req, 'reveal-id', { childId, field, entryId: entryId || null });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ value });
  } catch (err) {
    console.error('[reveal] Failed:', err.message);
    return res.status(500).json({ error: 'Could not reveal this value' });
  }
});


// POST /api/import - Add records from another deployment's backup.
// Only records missing here are added (same rules as Settings -> Restore from
// backup): nothing existing is overwritten and deleted records are not revived.
app.post('/api/import', requireAuth, adminOnly, async (req, res) => {
  try {
    const { validateBackup, planRestore } = await import('./js/backup.js');
    const backup = req.body || {};
    const problem = validateBackup(backup);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const tenant = await tenantFor(req);
    const { payload: serverData, index } = await readTenant(tenant.slug);
    const plan = planRestore(serverData, backup);
    if (plan.totalAdded === 0) {
      return res.json({ success: true, totalAdded: 0, added: {} });
    }

    const mergedData = { ...serverData, ...plan.merged };
    if (isFirestoreEnabled()) {
      await writeSnapshot(tenant.slug, mergedData, index || new Map());
    } else {
      writeFileStore(mergedData);
    }

    try {
      const children = JSON.parse(mergedData['chm-children'] || '[]');
      oauthSyncSheets(children, tenant.slug, tenant.name).catch(err => {
        console.warn('[Import] Google Sheets sync notice:', err.message);
      });
    } catch (e) { }

    console.log(`[Import] ${req.user.email} added ${plan.totalAdded} record(s) from ${backup.source || 'backup'}: ${JSON.stringify(plan.added)}`);
    return res.json({ success: true, totalAdded: plan.totalAdded, added: plan.added });
  } catch (err) {
    console.error('[Import] Failed:', err);
    return res.status(500).json({ success: false, message: 'Import failed' });
  }
});

// POST /api/sync - Merges and saves this NGO's database
app.post('/api/sync', requireAuth, async (req, res) => {
  try {
    const clientData = { ...(req.body || {}) };
    const tenant = await tenantFor(req);
    const { payload: serverData, index, firestore } = await readTenant(tenant.slug);

    let serverChildren = [];
    try { serverChildren = JSON.parse(serverData['chm-children'] || '[]'); } catch (e) { }
    if (!Array.isArray(serverChildren)) serverChildren = [];

    let clientChildren = null;
    try { clientChildren = clientData['chm-children'] != null ? JSON.parse(clientData['chm-children']) : null; } catch (e) { }
    if (Array.isArray(clientChildren)) {
      // The browser holds IDs masked; put the real values back before merging.
      clientChildren = unmaskFromStored(clientChildren, serverChildren);

      // Only an Admin may remove a child. A Staff copy missing a child keeps it.
      if (req.user.role !== 'Admin') {
        const sent = new Set(clientChildren.filter(c => c && c.id).map(c => c.id));
        const kept = serverChildren.filter(c => c && c.id && !sent.has(c.id));
        if (kept.length) {
          audit(req, 'denied', { reason: 'staff-delete-child', childIds: kept.map(c => c.id) });
          clientChildren = [...clientChildren, ...kept];
          try {
            const keptIds = new Set(kept.map(c => String(c.id)));
            const tombs = JSON.parse(clientData['chm-deleted'] || '[]');
            if (Array.isArray(tombs)) {
              clientData['chm-deleted'] = JSON.stringify(tombs.filter(t => !(t && t.key === 'chm-children' && keptIds.has(String(t.recordId)))));
            }
          } catch (e) { }
        }
      }
      clientData['chm-children'] = JSON.stringify(clientChildren);
    }

    const mergedData = mergeNamespace(clientData, serverData);

    // Records are kept in Firestore only. If the write fails the browser keeps
    // its edits and retries; nothing is saved to this server's disk. The file
    // store is used only when Firestore is not configured (local development).
    if (isFirestoreEnabled()) {
      try {
        await writeSnapshot(tenant.slug, mergedData, index || new Map());
      } catch (fsErr) {
        console.error(`[Sync] Firestore write failed: ${fsErr.message}`);
        return res.status(503).json({ success: false, message: 'The database is unavailable. Your changes will be retried.' });
      }
    } else {
      writeFileStore(mergedData);
    }

    // Trigger the Google Sheets sync in the background
    if (mergedData['chm-children']) {
      try {
        const children = JSON.parse(mergedData['chm-children']);
        if (Array.isArray(children)) {
          // The tenant comes from the verified token, not the request body.
          oauthSyncSheets(children, tenant.slug, tenant.name).catch(err => {
            console.warn('[Sync] Background Google Sheets auto-sync notice:', err.message);
          });
        }
      } catch (e) { }
    }

    return res.json(maskPayload(mergedData));
  } catch (err) {
    console.error('[Sync] Error merging database:', err);
    return res.status(500).json({ error: 'Failed to sync database' });
  }
});

// Central Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Express] Unhandled Error [%s %s]:', req.method, req.url, err.stack || err.message || err);
  res.status(500).json({ error: 'Internal Server Error', message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] NGO Platform running on http://localhost:${PORT}`);
  console.log(`[Server] Security & rate limiting middleware active`);
  // Touch the Admin SDK now so the active database is visible in the boot log
  // instead of only appearing on the first sync request.
  console.log(
    `[Server] Database: ${isFirestoreEnabled() ? 'Firestore (per NGO)' : 'data/db.json (fallback)'}` +
    ` — ${firestoreStatus()}`
  );
});
