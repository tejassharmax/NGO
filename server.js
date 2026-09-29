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
require('dotenv').config({ quiet: true });

// Per-NGO OAuth Integration Module
const {
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
const { requireAuth, ALLOWED_EMAILS } = require('./js/server/auth');

const { createRateLimiter } = require('./js/server/rateLimiter');

// Rate Limiters
const apiLimiter = createRateLimiter({ windowMs: 60000, max: 60, message: 'Too many API calls. Please wait a minute.' });
const uploadLimiter = createRateLimiter({ windowMs: 60000, max: 15, message: 'Too many document uploads. Please wait a minute.' });

const app = express();

// Render terminates TLS at its edge proxy and forwards over plain HTTP, so without
// this `req.protocol` reports "http" and `req.secure` is false for every request.
// One hop only: trusting the whole chain would let a client forge X-Forwarded-For.
// Note this deliberately does NOT affect authentication — js/server/auth.js keys
// its local-development bypass on the TCP peer address, never on a proxy header.
app.set('trust proxy', 1);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } }); // Max 15MB

// CORS & Security Headers
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

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
app.get(['/', '/index.html'], sendPublicFile('index.html'));
app.get('/js/bundle.js', sendPublicFile('js/bundle.js'));
app.get('/google-logo.png', sendPublicFile('google-logo.png'));
app.use('/css', express.static(path.join(__dirname, 'css'), { etag: true, setHeaders: noCacheCode }));
app.use('/assets', express.static(path.join(__dirname, 'assets'), { etag: true }));



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
const { resolveNgoForEmail, writeSnapshot } = require('./js/server/ngoStore');
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
  return resolveNgoForEmail(req.user && req.user.email);
}

// GET /api/sync - Returns this NGO's entire database
app.get('/api/sync', requireAuth, async (req, res) => {
  try {
    if (!isFirestoreEnabled()) {
      return res.json(readFileStore());
    }
    const tenant = await tenantFor(req);
    const { payload } = await readTenant(tenant.slug);
    return res.json(payload);
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
    const isAuthorized = ALLOWED_EMAILS.has(connectingEmail);

    if (!isAuthorized) {
      console.warn(`[oauth] Refused workspace connect from non-allowlisted account: ${connectingEmail}`);
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

    console.log(`[OAuth Callback] Successfully authenticated connecting admin: ${connectingEmail} for NGO: ${ngoSlug}`);

    const existing = await getNgoIntegration(ngoSlug);
    const connectingAccount = (adminEmail !== 'Admin' ? adminEmail : (connectingEmail || '')).trim().toLowerCase();
    const isNewAccount = existing.adminEmail && existing.adminEmail.toLowerCase() !== connectingAccount;
    const isLegacySheet = existing.sheetId === '1KnxgrxAYmvUnD_BTMsQREav8umsZgU4Qg_UFJYhH-88' || existing.clinicalSheetId === '15P5OExjG12acJrGm6c3dOfaGBIB73_6ZJh5Sh4RbXwY';

    const updated = {
      ...existing,
      refresh_token: tokens.refresh_token || existing.refresh_token,
      tokenExpired: false,
      connectedAt: new Date().toISOString(),
      adminEmail: connectingAccount || existing.adminEmail || 'ayushahome@gmail.com',
      secondaryEmail: 'tejassachin2010@gmail.com',
      sheetId: (isNewAccount || isLegacySheet) ? null : (existing.sheetId || null),
      spreadsheetUrl: (isNewAccount || isLegacySheet) ? null : (existing.spreadsheetUrl || null),
      clinicalSheetId: (isNewAccount || isLegacySheet) ? null : (existing.clinicalSheetId || null),
      clinicalSpreadsheetUrl: (isNewAccount || isLegacySheet) ? null : (existing.clinicalSpreadsheetUrl || null),
      childSheetGids: (isNewAccount || isLegacySheet) ? {} : (existing.childSheetGids || {}),
      monthlySheetId: (isNewAccount || isLegacySheet) ? null : (existing.monthlySheetId || null),
      monthlySpreadsheetUrl: (isNewAccount || isLegacySheet) ? null : (existing.monthlySpreadsheetUrl || null),
      monthlySheetGids: (isNewAccount || isLegacySheet) ? {} : (existing.monthlySheetGids || {})
    };
    await saveNgoIntegration(ngoSlug, updated);

    // Also mirror to sister slug so both tenants stay in sync
    const sisterSlug = ngoSlug === 'alex-agape' ? 'ayusha-nilayam' : 'alex-agape';
    await saveNgoIntegration(sisterSlug, updated);

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
app.all('/api/google/disconnect', requireAuth, async (req, res) => {
  try {
    const { slug: ngoSlug } = await tenantFor(req);
    const existing = await getNgoIntegration(ngoSlug);
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

  // If this slug has no refresh token, check sister slug
  if (!integration || !integration.refresh_token) {
    const fallbackSlug = ngoSlug === 'alex-agape' ? 'ayusha-nilayam' : (ngoSlug === 'ayusha-nilayam' ? 'alex-agape' : null);
    if (fallbackSlug) {
      const fallbackInteg = await getNgoIntegration(fallbackSlug);
      if (fallbackInteg && fallbackInteg.refresh_token) {
        integration = fallbackInteg;
      }
    }
  }

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

  // Auto-create/sync Student Medical Records sheet if connected but not yet generated
  if (connected && (!integration.clinicalSheetId || !integration.sheetId || !integration.monthlySheetId)) {
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
    adminEmail: integration.adminEmail || null,
    secondaryEmail: integration.secondaryEmail || null,
    sheetId: integration.sheetId || null,
    spreadsheetUrl: integration.spreadsheetUrl || null,
    clinicalSheetId: integration.clinicalSheetId || null,
    clinicalSpreadsheetUrl: integration.clinicalSpreadsheetUrl || null,
    monthlySpreadsheetUrl: integration.monthlySpreadsheetUrl || null,
    monthlySheetGids: integration.monthlySheetGids || {},
    childSheetGids: integration.childSheetGids || {}
  });
});

// POST /api/sheets/sync
app.post('/api/sheets/sync', requireAuth, async (req, res) => {
  try {
    const { children } = req.body || {};
    const { slug: ngoSlug, name: ngoName } = await tenantFor(req);
    const result = await oauthSyncSheets(children || [], ngoSlug, ngoName);
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
app.delete('/api/children/:id', requireAuth, async (req, res) => {
  try {
    const childId = req.params.id;
    const { slug: ngoSlug, name: ngoName } = await tenantFor(req);
    const result = await oauthDeleteChild(childId, ngoSlug, ngoName);
    res.json(result);
  } catch (err) {
    console.error('[API] Error deleting child:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// POST /api/sync - Merges and saves this NGO's database
app.post('/api/sync', requireAuth, apiLimiter, async (req, res) => {
  try {
    const clientData = req.body || {};
    const tenant = await tenantFor(req);
    const { payload: serverData, index, firestore } = await readTenant(tenant.slug);

    const mergedData = mergeNamespace(clientData, serverData);

    if (isFirestoreEnabled()) {
      try {
        await writeSnapshot(tenant.slug, mergedData, index || new Map());
      } catch (fsErr) {
        console.warn(`[Sync] Firestore write failed (${fsErr.message}). Persisting to file store fallback.`);
        writeFileStore(mergedData);
      }
    } else {
      writeFileStore(mergedData);
    }
    writeFileStore(mergedData);

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

    return res.json(mergedData);
  } catch (err) {
    console.error('[Sync] Error merging database:', err);
    return res.status(500).json({ error: 'Failed to sync database' });
  }
});

// Central Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(`[Express] Unhandled Error [${req.method} ${req.url}]:`, err.stack || err.message || err);
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
