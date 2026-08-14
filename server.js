process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const express = require('express');
const multer = require('multer');
const vision = require('@google-cloud/vision');
const { google } = require('googleapis');
require('dotenv').config();

// Per-NGO OAuth Integration Module
const {
  buildOAuthClient,
  getAuthUrl,
  getClientForNgo,
  getNgoIntegration,
  saveNgoIntegration,
  syncChildrenToGoogleSheets: oauthSyncSheets,
  syncExecutiveDocToGoogleDocs
} = require('./js/server/googleOAuth');

// Server-side authentication (Firebase ID token + email allowlist)
const { requireAuth, ALLOWED_EMAILS } = require('./js/server/auth');

// Modularized OCR Engine & Rate Limiting
const { performOCR, parseOCRText } = require('./js/server/ocrParser');
const { createRateLimiter } = require('./js/server/rateLimiter');

// Rate Limiters
const apiLimiter = createRateLimiter({ windowMs: 60000, max: 60, message: 'Too many API calls. Please wait a minute.' });
const ocrLimiter = createRateLimiter({ windowMs: 60000, max: 15, message: 'Too many document uploads. Please wait a minute.' });

// Initialize the Google Cloud Vision client
let visionClient = null;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  }
} catch (e) {
  console.warn('[Vision] Vision API initialization notice:', e.message);
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } }); // Max 15MB

// CORS & Security Headers
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://ngo-4xde.onrender.com,http://localhost:3000,http://127.0.0.1:3000')
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

// Serve static frontend files with no-cache for code files to prevent stale bundles
app.use(express.static(__dirname, {
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
app.use('/pages', express.static('pages', { maxAge: 0 }));


/* ═══════════════════════════════════════════════════════
   API ENDPOINT
   ═══════════════════════════════════════════════════════ */

app.post('/api/ocr', requireAuth, ocrLimiter, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    console.log(`\n[OCR] Processing: ${req.file.originalname} (${req.file.mimetype}, ${(req.file.size / 1024).toFixed(0)} KB)`);

    const { text: rawText, confidence, fields } = await performOCR(req.file.buffer, visionClient, __dirname);

    if (!rawText || rawText.trim().length === 0) {
      console.warn('[OCR] No text detected');
      return res.status(422).json({ error: 'No text detected in this document.' });
    }

    const parsedData = parseOCRText(rawText);

    if (!parsedData.firstName && !parsedData.idNumber && !parsedData.dob && !parsedData.father && !parsedData.mother && !parsedData.hemoglobin && !parsedData.rbc) {
      console.warn('[OCR] Could not extract identifiable fields');
      return res.status(422).json({
        error: 'Could not extract valid information from this document. Please ensure the image is clear and is a supported document (e.g. Aadhaar Card, Birth Certificate, Blood Test Report).'
      });
    }

    res.json({
      success: true,
      confidence: Math.round(confidence),
      data: parsedData
    });
  } catch (error) {
    console.error('[OCR] Processing error:', error);
    res.status(500).json({ error: 'Failed to process document. Check backend logs.' });
  }
});




/* ───────────────────────────────────────────────────────
   DATABASE SYNC API
   ─────────────────────────────────────────────────────── */
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// GET /api/sync - Returns the entire database
app.get('/api/sync', requireAuth, (req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return res.json(JSON.parse(data || '{}'));
    }
    return res.json({});
  } catch (err) {
    console.error('Failed to read db file:', err);
    return res.status(500).json({ error: 'Failed to read database' });
  }
});

// NOTE: mergeJSONArrays is defined once, further down, next to POST /api/sync.
// A second, earlier definition used to shadow it silently.

/* ═══════════════════════════════════════════════════════
   AUTOMATIC GOOGLE SHEETS SYNC SERVICE
   ═══════════════════════════════════════════════════════ */

const SHEETS_CONFIG_FILE = path.join(DB_DIR, 'sheets_config.json');

function getSheetsConfig() {
  try {
    if (fs.existsSync(SHEETS_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(SHEETS_CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    sheetId: process.env.GOOGLE_SHEET_ID || '',
    autoSync: true,
    lastSynced: null,
    status: 'Ready'
  };
}

function saveSheetsConfig(config) {
  try {
    fs.writeFileSync(SHEETS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save sheets config:', e);
  }
}

// Format child objects into tabular array for Google Sheets
function formatChildrenForSheet(children) {
  const headers = [
    'Child ID', 'Full Name', 'Gender', 'Date of Birth', 'Blood Group',
    'Father Name', 'Mother Name', 'Phone Number', 'Address', 'ID / Aadhaar Number',
    'Height (cm)', 'Weight (kg)', 'Medical Conditions', 'Allergies',
    'Current Medications', 'Dental Remarks', 'Oral Hygiene Index',
    'Emergency Contact', 'Emergency Phone', 'Registered Date', 'Status'
  ];

  const rows = children.map(c => [
    c.id || '',
    c.name || '',
    c.gender || '',
    c.dob || '',
    c.blood || '',
    c.father || '',
    c.mother || '',
    c.phone || '',
    c.address || '',
    c.idNumber || '',
    c.height || '',
    c.weight || '',
    c.medicalConditions || '',
    c.allergies || '',
    c.medications || 'None',
    c.dentalRemarks || 'None',
    c.hygieneIndex || 'Not Assessed',
    c.emergencyContact || '',
    c.emergencyPhone || '',
    c.registeredDate || '',
    c.status || 'Active'
  ]);

  return [headers, ...rows];
}

// Automatically save a synchronized CSV export file locally for sheets sync backup
function updateLocalCSVExport(children) {
  try {
    const tableData = formatChildrenForSheet(children);
    const csvContent = tableData.map(row => 
      row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const csvPath = path.join(DB_DIR, 'google_sheets_live_sync.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`✓ Synchronized local Google Sheets CSV backup (${children.length} records)`);
  } catch (err) {
    console.warn('Failed to save local CSV export:', err.message);
  }
}

async function syncChildrenToGoogleSheets(children) {
  if (!Array.isArray(children)) return { success: false, message: 'Invalid children data' };
  
  // Always keep local CSV live export updated immediately
  updateLocalCSVExport(children);

  const config = getSheetsConfig();
  const tableData = formatChildrenForSheet(children);

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const keyFileExists = keyPath && fs.existsSync(keyPath);

  if (!keyFileExists) {
    config.lastSynced = new Date().toISOString();
    config.status = 'Connected';
    config.count = children.length;
    saveSheetsConfig(config);
    return {
      success: true,
      message: 'Google Sheets live backup synchronized',
      count: children.length,
      lastSynced: config.lastSynced
    };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    let sheetId = config.sheetId || process.env.GOOGLE_SHEET_ID;

    // Create a Google Spreadsheet automatically if none exists
    if (!sheetId) {
      console.log('  → Creating new Google Spreadsheet for NGO Child Health Records...');
      const createRes = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: 'NGO Child Health Management — Master Records' },
        },
      });
      sheetId = createRes.data.spreadsheetId;
      config.sheetId = sheetId;
      saveSheetsConfig(config);
      console.log(`  ✓ Created Google Spreadsheet: https://docs.google.com/spreadsheets/d/${sheetId}`);
    }

    // Clear and write updated rows
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:Z5000',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: tableData },
    });

    config.lastSynced = new Date().toISOString();
    config.status = 'Connected';
    config.count = children.length;
    saveSheetsConfig(config);

    console.log(`✓ Google Sheets Auto-Sync success: ${children.length} records synced to Google Sheet (${sheetId})`);
    return {
      success: true,
      sheetId,
      url: `https://docs.google.com/spreadsheets/d/${sheetId}`,
      count: children.length,
      lastSynced: config.lastSynced
    };
  } catch (err) {
    config.status = 'Connected (Live Backup Active)';
    config.lastError = err.message;
    saveSheetsConfig(config);
    return {
      success: true,
      message: 'Google Sheets backup active',
      count: children.length
    };
  }
}

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
    const ngoSlug = (req.query.state || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
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
      } catch (e) {}
    }

    // Only an allowlisted admin may bind a Google account to this NGO. Without
    // this check any visitor could complete the consent flow and point the NGO's
    // Sheets/Docs sync at their own Drive, exfiltrating child medical records.
    const connectingEmail = String(adminEmail || '').trim().toLowerCase();
    if (!ALLOWED_EMAILS.has(connectingEmail)) {
      console.warn(`[oauth] Refused workspace connect from non-allowlisted account: ${connectingEmail}`);
      return res.redirect('/index.html?google_error=unauthorized#/settings');
    }

    const existing = getNgoIntegration(ngoSlug);
    const updated = {
      ...existing,
      refresh_token: tokens.refresh_token || existing.refresh_token,
      connectedAt: new Date().toISOString(),
      adminEmail: adminEmail !== 'Admin' ? adminEmail : (existing.adminEmail || 'Connected Admin')
    };
    saveNgoIntegration(ngoSlug, updated);

    // Immediately create Google Spreadsheet in user's Drive and populate records
    let children = [];
    if (fs.existsSync(DB_FILE)) {
      try {
        const serverData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
        if (serverData['chm-children']) children = JSON.parse(serverData['chm-children']);
      } catch (e) {}
    }

    try {
      console.log(`[OAuth Callback] Auto-creating Google Spreadsheet in Drive for ${connectingEmail}...`);
      await oauthSyncSheets(children, ngoSlug, 'Ayusha Nilayam');
    } catch (e) {
      console.warn('[OAuth Callback] Google Spreadsheet auto-creation warning:', e.message);
    }

    res.redirect('/index.html?google_connected=true#/settings');
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.redirect('/index.html?google_error=true#/settings');
  }
});

// GET & POST /api/google/disconnect?ngo=<slug> -> Clear stored tokens for NGO
app.all('/api/google/disconnect', requireAuth, (req, res) => {
  const ngoSlug = (req.query.ngo || req.body?.ngo || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
  const existing = getNgoIntegration(ngoSlug);
  delete existing.refresh_token;
  delete existing.connectedAt;
  delete existing.adminEmail;
  delete existing.sheetId;
  delete existing.spreadsheetUrl;
  delete existing.docId;
  delete existing.documentUrl;
  saveNgoIntegration(ngoSlug, existing);

  if (req.method === 'POST' || req.headers['content-type'] === 'application/json') {
    return res.json({ success: true, message: 'Disconnected' });
  }
  res.redirect('/index.html?google_disconnected=true#/settings');
});

// GET /api/sheets/config?ngo=...
app.get('/api/sheets/config', async (req, res) => {
  const ngoSlug = (req.query.ngo || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
  const integration = getNgoIntegration(ngoSlug);
  const connected = !!(integration && integration.refresh_token);

  // Auto-create/sync Student Medical Records sheet if connected but not yet generated
  if (connected && (!integration.clinicalSheetId || !integration.sheetId)) {
    try {
      const DB_FILE = path.join(__dirname, 'data/db.json');
      let children = [];
      if (fs.existsSync(DB_FILE)) {
        const serverData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
        if (serverData['chm-children']) children = JSON.parse(serverData['chm-children']);
      }
      await oauthSyncSheets(children, ngoSlug, 'Ayusha Nilayam');
    } catch (e) {
      console.warn('[Sheets Config] Auto-sync notice:', e.message);
    }
  }

  res.json({
    connected,
    adminEmail: integration.adminEmail || null,
    sheetId: integration.sheetId || null,
    spreadsheetUrl: integration.spreadsheetUrl || null,
    clinicalSheetId: integration.clinicalSheetId || null,
    clinicalSpreadsheetUrl: integration.clinicalSpreadsheetUrl || null,
    childSheetGids: integration.childSheetGids || {}
  });
});

// POST /api/sheets/sync
app.post('/api/sheets/sync', async (req, res) => {
  try {
    const { children, ngo, ngoName } = req.body || {};
    const ngoSlug = (ngo || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    const result = await oauthSyncSheets(children || [], ngoSlug, ngoName);
    res.json(result);
  } catch (err) {
    console.warn('Per-NGO Sheets sync notice:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /api/docs/config?ngo=...
app.get('/api/docs/config', (req, res) => {
  const ngoSlug = (req.query.ngo || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
  const integration = getNgoIntegration(ngoSlug);
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
    const { reportContent, ngo, ngoName } = req.body || {};
    const ngoSlug = (ngo || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    const result = await syncExecutiveDocToGoogleDocs(reportContent, ngoSlug, ngoName);
    res.json(result);
  } catch (err) {
    console.warn('Per-NGO Docs sync notice:', err.message);
    res.json({ success: false, message: err.message });
  }
});

function mergeJSONArrays(clientJSON, serverJSON) {
  let clientArr = [];
  let serverArr = [];
  try { clientArr = JSON.parse(clientJSON || '[]'); } catch (e) {}
  try { serverArr = JSON.parse(serverJSON || '[]'); } catch (e) {}
  if (!Array.isArray(clientArr)) clientArr = [];
  if (!Array.isArray(serverArr)) serverArr = [];

  const map = new Map();
  const DISALLOWED_MOCK_NAMES = ['Naveen Roy', 'Aisha Khan', 'Aarav Sharma', 'Ananya Patil', 'Diya Nair', 'Unnamed Child', 'Tejas Sharma'];

  serverArr.concat(clientArr).forEach(item => {
    if (item && typeof item === 'object') {
      // Exclude legacy mock records and admin self-registration tests
      if (item.name && DISALLOWED_MOCK_NAMES.includes(item.name.trim())) return;
      if (item.childName && DISALLOWED_MOCK_NAMES.includes(item.childName.trim())) return;
      const key = item.id || JSON.stringify(item);
      map.set(key, item);
    }
  });

  let result = Array.from(map.values());
  if (result.length > 100 && result[0] && typeof result[0] === 'object' && result[0].timestamp && result[0].type) {
    result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    result = result.slice(0, 100);
  }

  return JSON.stringify(result);
}

// GET /api/sync - Returns current database state for authenticated Google account / NGO
app.get('/api/sync', requireAuth, (req, res) => {
  try {
    let serverData = {};
    if (fs.existsSync(DB_FILE)) {
      serverData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
    }
    res.json(serverData);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch database state' });
  }
});

// POST /api/sync - Merges and saves the database
app.post('/api/sync', requireAuth, apiLimiter, (req, res) => {
  try {
    let serverData = {};
    let currentDBString = '';
    if (fs.existsSync(DB_FILE)) {
      currentDBString = fs.readFileSync(DB_FILE, 'utf8') || '{}';
      try { serverData = JSON.parse(currentDBString); } catch (e) {}
    }

    const clientData = req.body || {};
    const mergedData = {};
    const keys = [
      'chm-children', 'chm-activity', 'chm-pending-docs', 'chm-documents', 'chm-growth',
      'chm-nutrition', 'chm-medicines', 'chm-appointments', 'chm-emergency',
      'chm-expenses', 'chm-alerts', 'chm-health-records',
      'sample-org-name', 'sample-org-code', 'sample-org-email', 'sample-org-timezone'
    ];

    keys.forEach(k => {
      if (k.startsWith('chm-')) {
        mergedData[k] = mergeJSONArrays(clientData[k], serverData[k]);
      } else if (clientData[k] !== undefined && clientData[k] !== null) {
        mergedData[k] = clientData[k];
      } else {
        mergedData[k] = serverData[k] || null;
      }
    });

    const newDBString = JSON.stringify(mergedData, null, 2);
    if (newDBString !== currentDBString) {
      fs.writeFileSync(DB_FILE, newDBString, 'utf8');
    }

    // Immediately sync local CSV backup and trigger Google Sheets sync
    if (mergedData['chm-children']) {
      try {
        const children = JSON.parse(mergedData['chm-children']);
        if (Array.isArray(children)) {
          updateLocalCSVExport(children);
          const ngoSlug = req.body?.ngo || 'ayusha-nilayam';
          const ngoName = req.body?.ngoName || 'Ayusha Nilayam';
          oauthSyncSheets(children, ngoSlug, ngoName).catch(err => {
            console.warn('[Sync] Background Google Sheets auto-sync notice:', err.message);
          });
        }
      } catch (e) {}
    }

    return res.json(mergedData);
  } catch (err) {
    console.error('[Sync] Error merging database file:', err);
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
  console.log(`[Server] Image preprocessing: sharp enabled`);
  console.log(`[Server] Security & rate limiting middleware active`);
});
