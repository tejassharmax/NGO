/**
 * googleOAuth.js
 * Backend OAuth2 client helper and per-NGO Google Sheets & Docs sync module.
 * Manages OAuth2 authorization code flow, refresh tokens in data/integrations/<ngo-slug>.json,
 * and automated creation & updates of Google Spreadsheets and Google Documents.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Directory for storing per-NGO integration files
const INTEGRATIONS_DIR = path.join(__dirname, '../../data/integrations');

/**
 * Ensure integrations directory exists
 */
function ensureIntegrationsDir() {
  if (!fs.existsSync(INTEGRATIONS_DIR)) {
    fs.mkdirSync(INTEGRATIONS_DIR, { recursive: true });
  }
}

/**
 * Sanitize NGO slug for filename safety
 */
function sanitizeNgoSlug(ngoSlug) {
  return (ngoSlug || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
}

/**
 * Get path to NGO integration JSON file
 */
function getIntegrationPath(ngoSlug) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  return path.join(INTEGRATIONS_DIR, `${safeSlug}.json`);
}

/**
 * Load stored integration data for an NGO
 */
function getNgoIntegration(ngoSlug) {
  try {
    ensureIntegrationsDir();
    const filepath = getIntegrationPath(ngoSlug);
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(content || '{}');
    }
  } catch (err) {
    console.warn('[Google OAuth] Error reading integration file:', err.message);
  }
  return {};
}

/**
 * Save integration data for an NGO
 */
function saveNgoIntegration(ngoSlug, data) {
  try {
    ensureIntegrationsDir();
    const filepath = getIntegrationPath(ngoSlug);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[Google OAuth] Error saving integration file:', err.message);
    return false;
  }
}

/**
 * Build OAuth2 client instance using environment variables
 */
function buildOAuthClient(req = null) {
  require('dotenv').config();
  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();

  let redirectUri = '';

  // If request is from a live web server (e.g. Render), auto-force live domain callback URI
  if (req) {
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').trim();
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      redirectUri = `${protocol}://${host}/auth/google/callback`;
    }
  }

  // Fallback to process.env or local development URI
  if (!redirectUri) {
    redirectUri = (process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/google/callback').trim();
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate OAuth consent URL for an NGO
 */
/**
 * Generate OAuth consent URL for an NGO.
 * @param {string} ngoSlug
 * @param {object|null} req incoming request, used to detect the live host
 * @param {string|null} state opaque CSRF state; defaults to the slug for
 *        backwards compatibility, but callers should pass a signed nonce.
 */
function getAuthUrl(ngoSlug, req = null, state = null) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  const oauthClient = buildOAuthClient(req);

  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'https://www.googleapis.com/auth/drive.file'
    ],
    state: state || safeSlug
  });
}

/**
 * Get authenticated OAuth2Client for an NGO using its stored refresh token.
 * Returns null if the NGO has not connected.
 */
function getClientForNgo(ngoSlug) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  const integration = getNgoIntegration(safeSlug);

  if (!integration || !integration.refresh_token) {
    return null;
  }

  const client = buildOAuthClient();
  client.setCredentials({
    refresh_token: integration.refresh_token
  });

  return client;
}

/**
 * Sync children records to the NGO's own Google Sheet.
 * Automatically creates the sheet if it doesn't exist yet.
 */
async function syncChildrenToGoogleSheets(children, ngoSlug, ngoName) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  const client = getClientForNgo(safeSlug);

  if (!client) {
    return { success: false, message: 'Not connected' };
  }

  const integration = getNgoIntegration(safeSlug);
  const sheets = google.sheets({ version: 'v4', auth: client });
  let sheetId = integration.sheetId;
  const displayName = ngoName || safeSlug.replace(/-/g, ' ');

  // Create Google Spreadsheet if not already created
  if (!sheetId) {
    console.log(`[Google OAuth] Creating Google Spreadsheet for NGO (${safeSlug})...`);
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `${displayName} — Child Health Records`
        }
      }
    });
    sheetId = createRes.data.spreadsheetId;
    integration.sheetId = sheetId;
    integration.spreadsheetUrl = createRes.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    saveNgoIntegration(safeSlug, integration);
    console.log(`[Google OAuth] Created Spreadsheet: ${integration.spreadsheetUrl}`);
  }

  // Format 18-column header and rows
  const headerRow = [
    'ID', 'Child Name', 'Date of Birth', 'Age', 'Gender', 'Blood Group',
    'Aadhaar ID', 'Guardian', 'Contact Phone', 'Height (cm)', 'Weight (kg)',
    'Medical Conditions', 'Allergies', 'Status', 'Registration Date',
    'Current Medications', 'Dental Remarks', 'Oral Hygiene Index'
  ];

  function cleanCell(val) {
    if (val === null || val === undefined || val === '') return '—';
    const str = String(val);
    if (str.startsWith('+') || str.startsWith('=')) {
      return "'" + str;
    }
    return str;
  }

  // Every child record supplied by the client is synced. A previous version
  // filtered out a hardcoded list of "preset" IDs and names (CH-1025, 'Aisha Khan',
  // ...), which silently deleted real children who happened to have been assigned
  // one of those IDs or to share a name with a demo record.
  const cleanChildren = (children || []).filter(Boolean);

  const rows = cleanChildren.map(c => [
    cleanCell(c.id || 'CH-0000'),
    cleanCell(c.name || 'Unnamed Child'),
    cleanCell(c.dob),
    cleanCell(c.age),
    cleanCell(c.gender),
    cleanCell(c.blood),
    cleanCell(c.idNumber),
    cleanCell(c.father || c.guardian),
    cleanCell(c.phone),
    cleanCell(c.height ? `${c.height} cm` : '—'),
    cleanCell(c.weight ? `${c.weight} kg` : '—'),
    cleanCell(c.medicalConditions || 'None'),
    cleanCell(c.allergies || 'None'),
    cleanCell(c.status || 'Active'),
    cleanCell(c.registeredDate || new Date().toISOString().slice(0, 10)),
    cleanCell(c.medications || 'None'),
    cleanCell(c.dentalRemarks || 'None'),
    cleanCell(c.hygieneIndex || 'Not Assessed')
  ]);

  const tableData = [headerRow, ...rows];

  // Clear existing range and write new rows
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1:Z5000'
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: tableData }
  });

  console.log(`[Google OAuth] Successfully synced ${rows.length} rows to Sheet (${sheetId}) for NGO ${safeSlug}`);

  return {
    success: true,
    sheetId,
    spreadsheetUrl: integration.spreadsheetUrl,
    count: rows.length
  };
}

/**
 * Sync executive health audit report content to the NGO's own Google Doc.
 * Automatically creates the document if it doesn't exist yet.
 */
async function syncExecutiveDocToGoogleDocs(reportContent, ngoSlug, ngoName) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  const client = getClientForNgo(safeSlug);

  if (!client) {
    return { success: false, message: 'Not connected' };
  }

  const integration = getNgoIntegration(safeSlug);
  const docs = google.docs({ version: 'v1', auth: client });
  let docId = integration.docId;
  const displayName = ngoName || safeSlug.replace(/-/g, ' ');

  // Create Google Document if not already created
  if (!docId) {
    console.log(`[Google OAuth] Creating Google Document for NGO (${safeSlug})...`);
    const createRes = await docs.documents.create({
      requestBody: {
        title: `${displayName} — Health Executive Summary`
      }
    });
    docId = createRes.data.documentId;
    integration.docId = docId;
    integration.documentUrl = `https://docs.google.com/document/d/${docId}/edit`;
    saveNgoIntegration(safeSlug, integration);
    console.log(`[Google OAuth] Created Google Doc: ${integration.documentUrl}`);
  }

  const textToInsert = reportContent || `EXECUTIVE CHILD HEALTH AUDIT REPORT — ${displayName.toUpperCase()}\nAuto-Synced Live Document | ${new Date().toLocaleString()}\n`;

  // Inspect existing document length to clear previous content
  try {
    const getRes = await docs.documents.get({ documentId: docId });
    const docObj = getRes.data;
    const contentLength = docObj.body?.content?.reduce((max, element) => Math.max(max, element.endIndex || 0), 0) || 1;

    const requests = [];
    if (contentLength > 2) {
      requests.push({
        deleteContentRange: {
          range: {
            startIndex: 1,
            endIndex: contentLength - 1
          }
        }
      });
    }
    requests.push({
      insertText: {
        location: { index: 1 },
        text: textToInsert
      }
    });

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests }
    });
  } catch (err) {
    console.warn('[Google OAuth] Document update fallback:', err.message);
  }

  return {
    success: true,
    docId,
    documentUrl: integration.documentUrl
  };
}

module.exports = {
  buildOAuthClient,
  getAuthUrl,
  getClientForNgo,
  getNgoIntegration,
  saveNgoIntegration,
  syncChildrenToGoogleSheets,
  syncExecutiveDocToGoogleDocs
};
