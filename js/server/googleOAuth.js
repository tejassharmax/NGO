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
  let data = {};
  try {
    ensureIntegrationsDir();
    const filepath = getIntegrationPath(ngoSlug);
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8');
      data = JSON.parse(content || '{}');
    }
  } catch (err) {
    console.warn('[Google OAuth] Error reading integration file:', err.message);
  }

  // Fallback to environment variables if integration file is not present on disk
  if (!data.refresh_token && process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    data.refresh_token = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    data.adminEmail = process.env.GOOGLE_OAUTH_ADMIN_EMAIL || 'Authorized Admin';
    if (process.env.GOOGLE_SPREADSHEET_ID && !data.sheetId) {
      data.sheetId = process.env.GOOGLE_SPREADSHEET_ID;
      data.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${data.sheetId}/edit`;
    }
    if (process.env.GOOGLE_CLINICAL_SPREADSHEET_ID && !data.clinicalSheetId) {
      data.clinicalSheetId = process.env.GOOGLE_CLINICAL_SPREADSHEET_ID;
      data.clinicalSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${data.clinicalSheetId}/edit`;
    }
  }

  return data;
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
  if (val === null || val === undefined || val === '' || val === '—') return '';
  const str = String(val).trim();
  if (str.startsWith('+') || str.startsWith('=')) {
    return "'" + str;
  }
  return str;
}

function buildChildSheetData(c, growthList, medicinesList, healthRecList, ngoName) {
  const childName = (c.name || 'CHILD').toUpperCase();
  const clinicHeader = 'DR.BLESSY — GOOD SHEPHERD CLINIC';

  // Row 1: Child Name (Col A), Clinic Header (Col D)
  const row1 = [childName, '', '', clinicHeader];
  const row2 = [];

  // Row 3: Routine Clinical Checkup Table Headers
  const checkupHeader = ['DATE', 'TEMP(F)', 'B/P', 'WEIGHT', 'P/R', 'SPO2', 'COMPLAINT', 'PRESCRIPTION', 'EYE CHECK UP'];
  
  const checkupRows = [];

  // Real growth / checkup measurements ONLY if they exist
  (growthList || []).forEach(g => {
    if (g.date || g.weight || g.temperature || g.bp) {
      checkupRows.push([
        cleanCell(g.date),
        cleanCell(g.temperature || g.temp),
        cleanCell(g.bp || g.bloodPressure),
        cleanCell(g.weight),
        cleanCell(g.pulse || g.pulseRate),
        cleanCell(g.spo2),
        cleanCell(g.complaint || g.symptoms),
        cleanCell(g.prescription || g.medication),
        cleanCell(g.eyeCheckup || g.eyeRemarks)
      ]);
    }
  });

  // Keep 12 empty template rows if fewer checkups exist, so user can type directly into the sheet
  while (checkupRows.length < 12) {
    checkupRows.push(['', '', '', '', '', '', '', '', '']);
  }

  // Row 16: empty spacer
  const spacerRow1 = [];

  // Row 17: Blood Test Report Section Title
  const bloodReportTitleRow = ['BLOOD TEST REPORT'];

  // Row 18: empty spacer
  const spacerRow2 = [];

  // Row 19: Blood Test Report Column Headers
  const bloodReportHeaderRow = [
    'DATE', 'HAEMOGLOBIN', 'WBC', 'PLATELETS', 'RBC', 'PCV',
    'NEUTROPHIL', 'LYMPHOCYTES', 'EOSINOPHILS', 'MONOCYTES', 'BASOPHILS',
    'RBC MORPHOLOGY', 'WBC MORPHOLOGY', 'PLATELETS ADEQUACY'
  ];

  const bloodRows = [];
  (healthRecList || []).forEach(hr => {
    if (hr.date || hr.hemoglobin || hr.wbc || hr.platelets) {
      bloodRows.push([
        cleanCell(hr.date),
        cleanCell(hr.hemoglobin || hr.hb),
        cleanCell(hr.wbc),
        cleanCell(hr.platelets),
        cleanCell(hr.rbc),
        cleanCell(hr.pcv),
        cleanCell(hr.neutrophil),
        cleanCell(hr.lymphocytes),
        cleanCell(hr.eosinophils),
        cleanCell(hr.monocytes),
        cleanCell(hr.basophils),
        cleanCell(hr.rbcMorphology),
        cleanCell(hr.wbcMorphology),
        cleanCell(hr.plateletsAdequacy)
      ]);
    }
  });

  // Keep 8 empty template rows if fewer blood tests exist
  while (bloodRows.length < 8) {
    bloodRows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  }

  return [
    row1,                  // Row 1
    row2,                  // Row 2
    checkupHeader,         // Row 3
    ...checkupRows,        // Rows 4 to 15
    spacerRow1,            // Row 16
    bloodReportTitleRow,   // Row 17
    spacerRow2,            // Row 18
    bloodReportHeaderRow,  // Row 19
    ...bloodRows           // Rows 20 to 27
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

        // Apply clean column widths, bold headers, and clean background
        try {
          const formatRequests = [];
          cleanChildren.forEach(c => {
            const childTabTitle = sanitizeSheetTitle(c.name);
            const gid = sheetMap.get(childTabTitle);
            if (gid === undefined) return;

            // Set column widths (Col A - N)
            const colWidths = [
              { start: 0, end: 1, width: 110 }, // A: DATE / CHILD NAME
              { start: 1, end: 2, width: 100 }, // B: TEMP(F) / HAEMOGLOBIN
              { start: 2, end: 3, width: 100 }, // C: B/P / WBC
              { start: 3, end: 4, width: 180 }, // D: WEIGHT / CLINIC NAME
              { start: 4, end: 5, width: 85 },  // E: P/R / RBC
              { start: 5, end: 6, width: 85 },  // F: SPO2 / PCV
              { start: 6, end: 7, width: 140 }, // G: COMPLAINT / NEUTROPHIL
              { start: 7, end: 8, width: 150 }, // H: PRESCRIPTION / LYMPHOCYTES
              { start: 8, end: 9, width: 130 }, // I: EYE CHECK UP / EOSINOPHILS
              { start: 9, end: 10, width: 110 },// J: MONOCYTES
              { start: 10, end: 11, width: 100 },// K: BASOPHILS
              { start: 11, end: 12, width: 160 },// L: RBC MORPHOLOGY
              { start: 12, end: 13, width: 150 },// M: WBC MORPHOLOGY
              { start: 13, end: 14, width: 160 } // N: PLATELETS ADEQUACY
            ];

            colWidths.forEach(cw => {
              formatRequests.push({
                updateDimensionProperties: {
                  range: {
                    sheetId: gid,
                    dimension: 'COLUMNS',
                    startIndex: cw.start,
                    endIndex: cw.end
                  },
                  properties: { pixelSize: cw.width },
                  fields: 'pixelSize'
                }
              });
            });

            // Bold Row 1 (A1:D1)
            formatRequests.push({
              repeatCell: {
                range: {
                  sheetId: gid,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 5
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 11 }
                  }
                },
                fields: 'userEnteredFormat.textFormat'
              }
            });

            // Bold Row 3 (A3:I3) with subtle background
            formatRequests.push({
              repeatCell: {
                range: {
                  sheetId: gid,
                  startRowIndex: 2,
                  endRowIndex: 3,
                  startColumnIndex: 0,
                  endColumnIndex: 9
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.95, green: 0.96, blue: 0.98 }
                  }
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)'
              }
            });

            // Bold Row 17 (BLOOD TEST REPORT)
            formatRequests.push({
              repeatCell: {
                range: {
                  sheetId: gid,
                  startRowIndex: 16,
                  endRowIndex: 17,
                  startColumnIndex: 0,
                  endColumnIndex: 4
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 11 }
                  }
                },
                fields: 'userEnteredFormat.textFormat'
              }
            });

            // Bold Row 19 (A19:N19) with subtle background
            formatRequests.push({
              repeatCell: {
                range: {
                  sheetId: gid,
                  startRowIndex: 18,
                  endRowIndex: 19,
                  startColumnIndex: 0,
                  endColumnIndex: 14
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 10 },
                    backgroundColor: { red: 0.95, green: 0.96, blue: 0.98 }
                  }
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)'
              }
            });
          });

          if (formatRequests.length > 0) {
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: clinicalSheetId,
              requestBody: { requests: formatRequests }
            });
          }
        } catch (fmtErr) {
          console.warn('[Google OAuth] Sheet formatting notice:', fmtErr.message);
        }
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
 * Pull and import children records from the NGO's Google Sheets (Master Directory & Medical Records).
 * If someone adds a student directly in Google Sheets or updates student data,
 * this pulls those rows and synchronizes them into the app database.
 */
async function pullChildrenFromGoogleSheets(ngoSlug, ngoName) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  const client = getClientForNgo(safeSlug);

  if (!client) {
    return { success: false, message: 'Google Sheets is not connected. Please connect Google Workspace in Settings.' };
  }

  const integration = getNgoIntegration(safeSlug);
  const sheetId = integration.sheetId;

  if (!sheetId) {
    return { success: false, message: 'No Google Sheet found for this organization. Please sync or create one first.' };
  }

  const sheets = google.sheets({ version: 'v4', auth: client });

  // Load existing children from server DB
  const DB_FILE = path.join(__dirname, '../../data/db.json');
  let existingChildren = [];
  let serverData = {};
  if (fs.existsSync(DB_FILE)) {
    try {
      serverData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
      if (serverData['chm-children']) existingChildren = JSON.parse(serverData['chm-children']);
    } catch (e) {}
  }

  const existingMap = new Map();
  existingChildren.forEach(c => {
    if (c.id) existingMap.set(c.id.toLowerCase().trim(), c);
    if (c.name) existingMap.set(c.name.toLowerCase().trim(), c);
  });

  let addedCount = 0;
  let updatedCount = 0;
  const mergedChildren = [...existingChildren];

  // 1. Read Master Directory Sheet (Sheet1)
  try {
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:Z5000'
    });

    const rawRows = readRes.data.values || [];
    if (rawRows.length >= 2) {
      const headers = rawRows[0].map(h => String(h || '').trim().toLowerCase());

      const getColIdx = (candidates) => {
        return headers.findIndex(h => candidates.some(c => h.includes(c)));
      };

      const idCol = getColIdx(['id', 'child id']);
      const nameCol = getColIdx(['child name', 'name', 'student name']);
      const dobCol = getColIdx(['date of birth', 'dob', 'birth date']);
      const ageCol = getColIdx(['age']);
      const genderCol = getColIdx(['gender', 'sex']);
      const bloodCol = getColIdx(['blood group', 'blood']);
      const idNumCol = getColIdx(['aadhaar', 'id number', 'aadhaar id', 'gov id']);
      const guardianCol = getColIdx(['guardian', 'father', 'parent', 'mother']);
      const phoneCol = getColIdx(['phone', 'contact phone', 'mobile', 'contact']);
      const heightCol = getColIdx(['height']);
      const weightCol = getColIdx(['weight']);
      const medCondCol = getColIdx(['medical conditions', 'medical condition', 'condition', 'diagnosis']);
      const allergiesCol = getColIdx(['allergies', 'allergy']);
      const statusCol = getColIdx(['status']);
      const regDateCol = getColIdx(['registration date', 'registered date', 'reg date', 'date']);
      const medsCol = getColIdx(['current medications', 'medications', 'medicine']);
      const dentalCol = getColIdx(['dental remarks', 'dental']);
      const hygieneCol = getColIdx(['oral hygiene index', 'hygiene index', 'hygiene']);

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        let name = (nameCol >= 0 && row[nameCol]) ? String(row[nameCol]).trim() : '';
        if (!name || name === 'Unnamed Child' || name === 'CHILD' || name.toLowerCase() === 'name') continue;

        // Strip leading clean quote if present
        if (name.startsWith("'")) name = name.slice(1).trim();

        let id = (idCol >= 0 && row[idCol]) ? String(row[idCol]).trim() : '';
        if (id.startsWith("'")) id = id.slice(1).trim();
        if (!id || id === '—' || id === 'CH-0000') {
          id = `CH-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const cleanVal = (col) => {
          if (col < 0 || !row[col]) return '';
          let v = String(row[col]).trim();
          if (v.startsWith("'")) v = v.slice(1).trim();
          return v;
        };

        const rawDob = cleanVal(dobCol);
        const rawAge = cleanVal(ageCol);
        const rawGender = cleanVal(genderCol) || 'Male';
        const rawBlood = cleanVal(bloodCol) || 'O+';
        const rawIdNum = cleanVal(idNumCol);
        const rawGuardian = cleanVal(guardianCol);
        const rawPhone = cleanVal(phoneCol);
        const rawHeight = cleanVal(heightCol).replace(/cm/gi, '').trim();
        const rawWeight = cleanVal(weightCol).replace(/kg/gi, '').trim();
        const rawMedCond = cleanVal(medCondCol);
        const rawAllergies = cleanVal(allergiesCol);
        const rawStatus = cleanVal(statusCol) || 'Active';
        const rawRegDate = cleanVal(regDateCol) || new Date().toISOString().slice(0, 10);
        const rawMeds = cleanVal(medsCol);
        const rawDental = cleanVal(dentalCol);
        const rawHygiene = cleanVal(hygieneCol);

        const existingMatch = existingMap.get(id.toLowerCase()) || existingMap.get(name.toLowerCase());

        if (existingMatch) {
          let changed = false;
          if (rawDob && rawDob !== existingMatch.dob) { existingMatch.dob = rawDob; changed = true; }
          if (rawGender && rawGender !== existingMatch.gender) { existingMatch.gender = rawGender; changed = true; }
          if (rawBlood && rawBlood !== existingMatch.blood) { existingMatch.blood = rawBlood; changed = true; }
          if (rawIdNum && rawIdNum !== existingMatch.idNumber) { existingMatch.idNumber = rawIdNum; changed = true; }
          if (rawGuardian && rawGuardian !== existingMatch.father && rawGuardian !== existingMatch.guardian) { existingMatch.father = rawGuardian; existingMatch.guardian = rawGuardian; changed = true; }
          if (rawPhone && rawPhone !== existingMatch.phone) { existingMatch.phone = rawPhone; changed = true; }
          if (rawHeight && rawHeight !== existingMatch.height) { existingMatch.height = rawHeight; changed = true; }
          if (rawWeight && rawWeight !== existingMatch.weight) { existingMatch.weight = rawWeight; changed = true; }
          if (rawMedCond && rawMedCond !== existingMatch.medicalConditions && rawMedCond !== 'None') { existingMatch.medicalConditions = rawMedCond; changed = true; }
          if (rawAllergies && rawAllergies !== existingMatch.allergies && rawAllergies !== 'None') { existingMatch.allergies = rawAllergies; changed = true; }
          if (rawStatus && rawStatus !== existingMatch.status) { existingMatch.status = rawStatus; changed = true; }
          if (rawMeds && rawMeds !== existingMatch.medications && rawMeds !== 'None') { existingMatch.medications = rawMeds; changed = true; }
          if (rawDental && rawDental !== existingMatch.dentalRemarks && rawDental !== 'None') { existingMatch.dentalRemarks = rawDental; changed = true; }
          if (rawHygiene && rawHygiene !== existingMatch.hygieneIndex && rawHygiene !== 'Not Assessed') { existingMatch.hygieneIndex = rawHygiene; changed = true; }
          if (changed) updatedCount++;
        } else {
          const newChild = {
            id,
            name,
            dob: rawDob,
            gender: rawGender,
            blood: rawBlood,
            idNumber: rawIdNum,
            father: rawGuardian,
            guardian: rawGuardian,
            phone: rawPhone,
            height: rawHeight,
            weight: rawWeight,
            medicalConditions: rawMedCond === 'None' ? '' : rawMedCond,
            allergies: rawAllergies === 'None' ? '' : rawAllergies,
            status: rawStatus || 'Active',
            registeredDate: rawRegDate,
            medications: rawMeds === 'None' ? '' : rawMeds,
            dentalRemarks: rawDental === 'None' ? '' : rawDental,
            hygieneIndex: rawHygiene === 'Not Assessed' ? '' : rawHygiene,
            source: 'Google Sheets Live Sync'
          };
          mergedChildren.push(newChild);
          existingMap.set(id.toLowerCase(), newChild);
          existingMap.set(name.toLowerCase(), newChild);
          addedCount++;
        }
      }
    }
  } catch (readErr) {
    console.warn('[Google OAuth] Master sheet read warning:', readErr.message);
  }

  // 2. Also check if new child tabs exist in the Student Medical Records workbook (clinicalSheetId)
  if (integration.clinicalSheetId) {
    try {
      const metaRes = await sheets.spreadsheets.get({ spreadsheetId: integration.clinicalSheetId });
      const IGNORED_TABS = ['sheet1', 'student records', 'unnamed child', 'child', 'template', 'sample', 'student record', 'instructions'];
      sheetTabs.forEach(s => {
        const title = (s.properties.title || '').trim();
        if (title && !IGNORED_TABS.includes(title.toLowerCase())) {
          const formattedName = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          if (!existingMap.has(title.toLowerCase()) && !existingMap.has(formattedName.toLowerCase())) {
            const newChild = {
              id: `CH-${Math.floor(1000 + Math.random() * 9000)}`,
              name: formattedName,
              dob: '',
              gender: 'Male',
              blood: 'O+',
              idNumber: '',
              father: '',
              guardian: '',
              phone: '',
              height: '',
              weight: '',
              medicalConditions: '',
              allergies: '',
              status: 'Active',
              registeredDate: new Date().toISOString().slice(0, 10),
              source: 'Google Sheets Tab Sync'
            };
            mergedChildren.push(newChild);
            existingMap.set(newChild.id.toLowerCase(), newChild);
            existingMap.set(title.toLowerCase(), newChild);
            existingMap.set(formattedName.toLowerCase(), newChild);
            addedCount++;
          }
        }
      });
    } catch (tabErr) {
      console.warn('[Google OAuth] Clinical tab read notice:', tabErr.message);
    }
  }

  // Save merged records to data/db.json
  if (addedCount > 0 || updatedCount > 0) {
    serverData['chm-children'] = JSON.stringify(mergedChildren);
    fs.writeFileSync(DB_FILE, JSON.stringify(serverData, null, 2), 'utf8');
    console.log(`[Google OAuth] Pulled from Google Sheets: ${addedCount} new child(ren), ${updatedCount} updated.`);
  }

  return {
    success: true,
    addedCount,
    updatedCount,
    totalCount: mergedChildren.length,
    children: mergedChildren,
    message: `Synced with Google Sheets: ${addedCount} new child(ren) imported, ${updatedCount} record(s) updated.`
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
  pullChildrenFromGoogleSheets,
  syncExecutiveDocToGoogleDocs
};
