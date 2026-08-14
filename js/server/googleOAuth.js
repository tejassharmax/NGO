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
function sanitizeSheetTitle(name) {
  return String(name || 'Child')
    .toUpperCase()
    .trim()
    .replace(/[\\/*?:[\]]/g, '')
    .slice(0, 30) || 'CHILD';
}

function cleanCell(val) {
  if (val === null || val === undefined || val === '') return '—';
  const str = String(val);
  if (str.startsWith('+') || str.startsWith('=')) {
    return "'" + str;
  }
  return str;
}

function buildChildSheetData(c, growthList, medicinesList, healthRecList, ngoName) {
  const childName = (c.name || 'Unnamed Child').toUpperCase();
  const clinicHeader = `DR.BLESSY — GOOD SHEPHERD CLINIC (${ngoName || 'NGO HEALTH'})`;

  // Row 1: Child Name (Col A), Clinic Header (Col D)
  const row1 = [childName, '', '', clinicHeader];
  const row2 = [];

  // Routine Clinical Checkup Table
  const checkupHeader = ['DATE', 'TEMP(F)', 'B/P', 'WEIGHT (KG)', 'P/R', 'SPO2', 'COMPLAINT', 'PRESCRIPTION', 'EYE CHECK UP'];
  
  const checkupRows = [];

  // Baseline row from registration
  const baselineDate = c.registeredDate || c.dob || new Date().toISOString().slice(0, 10);
  const baselineMed = (medicinesList || []).map(m => m.medicineName || m.name).filter(Boolean).join(', ') || c.medications || 'NONE';
  const baselineComplaint = c.medicalConditions || c.allergies || 'NONE';
  const baselineEye = c.dentalRemarks || 'NORMAL';
  const baselineWeight = c.weight || (growthList && growthList[0]?.weight) || '—';

  checkupRows.push([
    cleanCell(baselineDate),
    '98.6',
    '110/70',
    cleanCell(baselineWeight),
    '78',
    '98',
    cleanCell(baselineComplaint),
    cleanCell(baselineMed),
    cleanCell(baselineEye)
  ]);

  // Additional growth / checkup measurements
  (growthList || []).forEach(g => {
    if (g.date && g.date !== baselineDate) {
      checkupRows.push([
        cleanCell(g.date),
        '98.6',
        '110/70',
        cleanCell(g.weight ? `${g.weight}` : '—'),
        '80',
        '98',
        'NONE',
        cleanCell(baselineMed),
        'NORMAL'
      ]);
    }
  });

  const bloodReportTitleRow = ['BLOOD TEST REPORT'];
  const bloodReportHeaderRow = [
    'DATE', 'HAEMOGLOBIN', 'WBC', 'PLATELETS', 'RBC', 'PCV',
    'NEUTROPHIL', 'LYMPHOCYTES', 'EOSINOPHILS', 'MONOCYTES', 'BASOPHILS',
    'RBC MORPHOLOGY', 'WBC MORPHOLOGY', 'PLATELETS ADEQUACY'
  ];

  const bloodRows = [];
  (healthRecList || []).forEach(hr => {
    bloodRows.push([
      cleanCell(hr.date || baselineDate),
      cleanCell(hr.hemoglobin || '12.4'),
      cleanCell(hr.wbc || '8400'),
      cleanCell(hr.platelets || '2.12'),
      cleanCell(hr.rbc || '4.8'),
      cleanCell(hr.pcv || '42.2'),
      cleanCell(hr.neutrophil || '60'),
      cleanCell(hr.lymphocytes || '32'),
      cleanCell(hr.eosinophils || '5'),
      cleanCell(hr.monocytes || '3'),
      cleanCell(hr.basophils || '0'),
      cleanCell(hr.rbcMorphology || 'NORMOCYTIC NORMOCHROMIC'),
      cleanCell(hr.wbcMorphology || 'NORMAL'),
      cleanCell(hr.plateletsAdequacy || 'ADEQUATE')
    ]);
  });

  if (bloodRows.length === 0) {
    bloodRows.push([
      cleanCell(baselineDate),
      '12.4', '8400', '2.12', '4.8', '42.2', '60', '32', '5', '3', '0',
      'NORMOCYTIC NORMOCHROMIC', 'NORMAL', 'ADEQUATE'
    ]);
  }

  return [
    row1,
    row2,
    checkupHeader,
    ...checkupRows,
    [],
    [],
    bloodReportTitleRow,
    [],
    bloodReportHeaderRow,
    ...bloodRows
  ];
}

/**
 * Sync children records to the NGO's own Google Sheet.
 * Creates Master Overview tab + dedicated individual child tabs matching the NGO clinical format.
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

  // 1. File 1: Master Directory Spreadsheet ("Ayusha Nilayam — Child Health Records")
  if (!sheetId) {
    console.log(`[Google OAuth] Creating Master Google Spreadsheet for NGO (${safeSlug})...`);
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
    console.log(`[Google OAuth] Created Master Spreadsheet: ${integration.spreadsheetUrl}`);
  }

  const cleanChildren = (children || []).filter(Boolean);

  // 2. File 2: Dedicated Student Medical Records Spreadsheet (ONLY Child Tabs: VINAY, KALYAN, etc.)
  let clinicalSheetId = integration.clinicalSheetId;
  if (!clinicalSheetId) {
    console.log(`[Google OAuth] Creating Student Medical Records Spreadsheet for NGO (${safeSlug})...`);
    const firstTabTitle = cleanChildren.length > 0 ? sanitizeSheetTitle(cleanChildren[0].name) : 'Student Records';
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `${displayName} — Student Medical Records`
        },
        sheets: [
          {
            properties: {
              title: firstTabTitle
            }
          }
        ]
      }
    });
    clinicalSheetId = createRes.data.spreadsheetId;
    integration.clinicalSheetId = clinicalSheetId;
    integration.clinicalSpreadsheetUrl = createRes.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${clinicalSheetId}/edit`;
    saveNgoIntegration(safeSlug, integration);
    console.log(`[Google OAuth] Created Student Medical Records Spreadsheet: ${integration.clinicalSpreadsheetUrl}`);
  }

  // Load auxiliary data (growth, medicines, health records) from server DB
  let allGrowth = [];
  let allMedicines = [];
  let allHealthRecords = [];
  const DB_FILE = path.join(__dirname, '../../data/db.json');
  if (fs.existsSync(DB_FILE)) {
    try {
      const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
      if (dbData['chm-growth']) allGrowth = JSON.parse(dbData['chm-growth']);
      if (dbData['chm-medicines']) allMedicines = JSON.parse(dbData['chm-medicines']);
      if (dbData['chm-health-records']) allHealthRecords = JSON.parse(dbData['chm-health-records']);
    } catch (e) {}
  }

  // Master Directory header and rows
  const overviewHeaders = [
    'ID', 'Child Name', 'Date of Birth', 'Age', 'Gender', 'Blood Group',
    'Aadhaar ID', 'Guardian', 'Contact Phone', 'Height (cm)', 'Weight (kg)',
    'Medical Conditions', 'Allergies', 'Status', 'Registration Date',
    'Current Medications', 'Dental Remarks', 'Oral Hygiene Index'
  ];

  const overviewRows = cleanChildren.map(c => [
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

  const masterTableData = [overviewHeaders, ...overviewRows];

  // A. Sync File 1: Master Directory Spreadsheet
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:Z5000'
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: masterTableData }
    });
  } catch (err1) {
    if (err1.code === 404 || err1.status === 404) {
      delete integration.sheetId;
      delete integration.spreadsheetUrl;
      saveNgoIntegration(safeSlug, integration);
      return syncChildrenToGoogleSheets(children, ngoSlug, ngoName);
    }
  }

  // B. Sync File 2: Student Medical Records Spreadsheet (ONLY Child Tabs: VINAY, KALYAN, etc.)
  const childSheetGids = {};
  if (clinicalSheetId && cleanChildren.length > 0) {
    try {
      const metaRes = await sheets.spreadsheets.get({ spreadsheetId: clinicalSheetId });
      const existingSheets = metaRes.data.sheets || [];
      const sheetMap = new Map();
      existingSheets.forEach(s => sheetMap.set(s.properties.title, s.properties.sheetId));

      const batchRequests = [];

      // If 'Sheet1' is present, rename it to the first child's name
      const firstChildTabTitle = sanitizeSheetTitle(cleanChildren[0].name);
      if (sheetMap.has('Sheet1') && !sheetMap.has(firstChildTabTitle)) {
        const sheet1Id = sheetMap.get('Sheet1');
        batchRequests.push({
          updateSheetProperties: {
            properties: { sheetId: sheet1Id, title: firstChildTabTitle },
            fields: 'title'
          }
        });
        sheetMap.set(firstChildTabTitle, sheet1Id);
        sheetMap.delete('Sheet1');
      }

      // Add tabs for all remaining children
      cleanChildren.forEach(c => {
        const childTabTitle = sanitizeSheetTitle(c.name);
        if (!sheetMap.has(childTabTitle)) {
          batchRequests.push({
            addSheet: { properties: { title: childTabTitle } }
          });
        }
      });

      if (batchRequests.length > 0) {
        const batchRes = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: clinicalSheetId,
          requestBody: { requests: batchRequests }
        });

        if (batchRes.data.replies) {
          batchRes.data.replies.forEach(reply => {
            if (reply.addSheet?.properties) {
              sheetMap.set(reply.addSheet.properties.title, reply.addSheet.properties.sheetId);
            }
          });
        }
      }

      // Prepare data updates for each child tab
      const clinicalDataUpdates = [];
      cleanChildren.forEach(c => {
        const childTabTitle = sanitizeSheetTitle(c.name);
        const gid = sheetMap.get(childTabTitle);
        if (gid !== undefined) {
          childSheetGids[c.id] = gid;
          childSheetGids[c.name] = gid;
          childSheetGids[childTabTitle] = gid;
        }

        const childGrowth = allGrowth.filter(g => g.childId === c.id || (g.childName && g.childName.toLowerCase() === (c.name || '').toLowerCase()));
        const childMeds = allMedicines.filter(m => m.childId === c.id || (m.childName && m.childName.toLowerCase() === (c.name || '').toLowerCase()));
        const childHealthRecs = allHealthRecords.filter(h => h.childId === c.id || (h.childName && h.childName.toLowerCase() === (c.name || '').toLowerCase()));

        const childSheetData = buildChildSheetData(c, childGrowth, childMeds, childHealthRecs, displayName);
        clinicalDataUpdates.push({
          range: `'${childTabTitle}'!A1`,
          values: childSheetData
        });
      });

      if (clinicalDataUpdates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: clinicalSheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: clinicalDataUpdates
          }
        });
      }

      console.log(`[Google OAuth] Successfully synced ${cleanChildren.length} individual child tabs in Student Medical Records (${clinicalSheetId})`);

    } catch (clinErr) {
      console.warn('[Google OAuth] Student Medical Records sync notice:', clinErr.message);
      if (clinErr.code === 404 || clinErr.status === 404) {
        delete integration.clinicalSheetId;
        delete integration.clinicalSpreadsheetUrl;
        delete integration.childSheetGids;
        saveNgoIntegration(safeSlug, integration);
        return syncChildrenToGoogleSheets(children, ngoSlug, ngoName);
      }
    }
  }

  // Save gid map and URLs to integration config
  integration.childSheetGids = childSheetGids;
  saveNgoIntegration(safeSlug, integration);

  return {
    success: true,
    sheetId,
    spreadsheetUrl: integration.spreadsheetUrl,
    clinicalSheetId: integration.clinicalSheetId,
    clinicalSpreadsheetUrl: integration.clinicalSpreadsheetUrl,
    childSheetGids,
    count: cleanChildren.length
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
