/**
 * googleOAuth.js
 * Backend OAuth2 client helper and per-NGO Google Sheets & Docs sync module.
 * Manages the OAuth2 authorization code flow, refresh tokens (persisted by
 * integrationStore.js, which survives a Render deploy), and automated creation &
 * updates of Google Spreadsheets and Google Documents.
 */

const { google } = require('googleapis');
const { Readable } = require('stream');

// Tenant-scoped database access. Reads and writes go to `ngos/{slug}` in
// Firestore, falling back to data/db.json when no service-account key is present.
const { readTenantArrays, writeTenantChildren } = require('./dataSource');

// Where the refresh token and the created sheet/doc IDs live. Firestore-backed so
// the Google connection is not lost every time the host restarts.
const { loadIntegration, saveIntegration } = require('./integrationStore');

/**
 * Sanitize NGO slug for filename safety
 */
function sanitizeNgoSlug(ngoSlug) {
  return (ngoSlug || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
}

/**
 * Load stored integration data for an NGO.
 *
 * Async because the store is Firestore in a deployed environment. Every caller is
 * already inside an async function.
 *
 * @param {string} ngoSlug
 * @returns {Promise<object>}
 */
async function getNgoIntegration(ngoSlug) {
  const data = await loadIntegration(ngoSlug);

  // Fallback to environment variables when nothing has been connected yet. Lets a
  // deployment be seeded with a pre-existing refresh token instead of requiring
  // someone to click through the consent screen.
  if (!data.refresh_token && process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    data.refresh_token = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    data.adminEmail = process.env.GOOGLE_OAUTH_ADMIN_EMAIL || 'ayushahome@gmail.com';
    if (process.env.GOOGLE_SPREADSHEET_ID && !data.sheetId && process.env.GOOGLE_SPREADSHEET_ID !== '1KnxgrxAYmvUnD_BTMsQREav8umsZgU4Qg_UFJYhH-88') {
      data.sheetId = process.env.GOOGLE_SPREADSHEET_ID;
      data.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${data.sheetId}/edit`;
    }
    if (process.env.GOOGLE_CLINICAL_SPREADSHEET_ID && !data.clinicalSheetId && process.env.GOOGLE_CLINICAL_SPREADSHEET_ID !== '15P5OExjG12acJrGm6c3dOfaGBIB73_6ZJh5Sh4RbXwY') {
      data.clinicalSheetId = process.env.GOOGLE_CLINICAL_SPREADSHEET_ID;
      data.clinicalSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${data.clinicalSheetId}/edit`;
    }
  }

  // Sanitize any legacy hardcoded spreadsheet IDs so fresh sheets are created under ayushahome@gmail.com
  if (data.sheetId === '1KnxgrxAYmvUnD_BTMsQREav8umsZgU4Qg_UFJYhH-88') {
    data.sheetId = null;
    data.spreadsheetUrl = null;
    data.childSheetGids = {};
  }
  if (data.clinicalSheetId === '15P5OExjG12acJrGm6c3dOfaGBIB73_6ZJh5Sh4RbXwY') {
    data.clinicalSheetId = null;
    data.clinicalSpreadsheetUrl = null;
    data.childSheetGids = {};
  }
  if (!data.adminEmail || data.adminEmail === 'Connected Admin' || data.adminEmail === 'Authorized Admin') {
    data.adminEmail = 'ayushahome@gmail.com';
  }
  if (!data.secondaryEmail) {
    data.secondaryEmail = 'tejassachin2010@gmail.com';
  }

  return data;
}

/**
 * Save integration data for an NGO.
 * @param {string} ngoSlug
 * @param {object} data
 * @returns {Promise<boolean>}
 */
async function saveNgoIntegration(ngoSlug, data) {
  return saveIntegration(ngoSlug, data);
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
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ],
    state: state || safeSlug
  });
}

/**
 * Get authenticated OAuth2Client for an NGO using its stored refresh token.
 * Returns null if the NGO has not connected.
 *
 * Async since the refresh token now comes from Firestore rather than a local file.
 * @param {string} ngoSlug
 * @returns {Promise<import('google-auth-library').OAuth2Client|null>}
 */
async function getClientForNgo(ngoSlug) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  let integration = await getNgoIntegration(safeSlug);

  // If this slug has no refresh token, check the sister slug
  if (!integration || !integration.refresh_token) {
    const fallbackSlug = safeSlug === 'alex-agape' ? 'ayusha-nilayam' : (safeSlug === 'ayusha-nilayam' ? 'alex-agape' : null);
    if (fallbackSlug) {
      const fallbackInteg = await getNgoIntegration(fallbackSlug);
      if (fallbackInteg && fallbackInteg.refresh_token) {
        integration = fallbackInteg;
      }
    }
  }

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
  if (str.startsWith('=HYPERLINK(')) {
    return str;
  }
  if (str.startsWith('+') || str.startsWith('=')) {
    return "'" + str;
  }
  return str;
}

function formatCellLink(text, url) {
  if (!text) return '';
  if (!url || typeof url !== 'string' || !url.trim() || url === '#' || url.startsWith('javascript:')) {
    return cleanCell(text);
  }
  const safeUrl = String(url).replace(/"/g, '%22');
  const safeText = String(text).replace(/"/g, '""');
  return `=HYPERLINK("${safeUrl}", "${safeText}")`;
}

function buildChildSheetData(c, growthList, medicinesList, healthRecList, ngoName, uploadedDocsList = []) {
  const childName = (c.name || 'CHILD').toUpperCase();
  const clinicHeader = 'DR.BLESSY — GOOD SHEPHERD CLINIC';

  const padRow = (r, len = 14) => {
    const copy = Array.isArray(r) ? [...r] : [];
    while (copy.length < len) copy.push('');
    return copy;
  };

  // Row 1: Child Name (Col A), Clinic Header (Col D)
  const row1 = [childName, '', '', clinicHeader];
  const row2 = [];

  // Row 3: Routine Clinical Checkup Table Headers
  const checkupHeader = ['DATE', 'TEMP(F)', 'B/P', 'WEIGHT', 'P/R', 'SPO2', 'COMPLAINT', 'PRESCRIPTION', 'EYE CHECK UP'];

  const checkupRows = [];

  // Real growth / checkup measurements sorted chronologically descending (newest first)
  const sortedGrowth = [...(growthList || [])].sort((a, b) => (new Date(b.date || b.timestamp || 0).getTime()) - (new Date(a.date || a.timestamp || 0).getTime()));

  sortedGrowth.forEach(g => {
    if (g.date || g.weight || g.temperature || g.bp) {
      const matchingDoc = (uploadedDocsList || []).find(d =>
        (d.childId === c.id || (d.childName && d.childName.toLowerCase() === (c.name || '').toLowerCase()) || (d.child && d.child.toLowerCase() === (c.name || '').toLowerCase())) &&
        ((d.date && g.date && d.date.slice(0, 10) === g.date.slice(0, 10)) || d.docType === 'Prescription')
      );
      const docLink = g.fileUrl || g.docUrl || matchingDoc?.fileUrl || matchingDoc?.driveUrl || matchingDoc?.webViewLink || matchingDoc?.image || matchingDoc?.fileData;

      checkupRows.push([
        formatCellLink(g.date, docLink),
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
  const sortedHealth = [...(healthRecList || [])].sort((a, b) => (new Date(b.date || b.timestamp || 0).getTime()) - (new Date(a.date || a.timestamp || 0).getTime()));

  sortedHealth.forEach(hr => {
    if (hr.date || hr.hemoglobin || hr.wbc || hr.platelets) {
      const matchingDoc = (uploadedDocsList || []).find(d =>
        (d.childId === c.id || (d.childName && d.childName.toLowerCase() === (c.name || '').toLowerCase()) || (d.child && d.child.toLowerCase() === (c.name || '').toLowerCase())) &&
        ((d.date && hr.date && d.date.slice(0, 10) === hr.date.slice(0, 10)) || d.healthRecordId === hr.id || d.docType === 'Bi-Annual CBC' || d.docType === 'Medical Report')
      );
      const docLink = hr.fileUrl || hr.docUrl || matchingDoc?.fileUrl || matchingDoc?.driveUrl || matchingDoc?.webViewLink || matchingDoc?.image || matchingDoc?.fileData;

      bloodRows.push([
        formatCellLink(hr.date, docLink),
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
    padRow(row1),
    padRow(row2),
    padRow(checkupHeader),
    ...checkupRows.map(r => padRow(r)),
    padRow(spacerRow1),
    padRow(bloodReportTitleRow),
    padRow(spacerRow2),
    padRow(bloodReportHeaderRow),
    ...bloodRows.map(r => padRow(r))
  ];
}

/**
 * Ensure spreadsheet has proper sharing permissions so authorized staff can open directly
 * without ever getting blocked by a "Request Access" prompt.
 */
async function ensureSpreadsheetSharing(authClient, spreadsheetId, secondaryEmails = []) {
  if (!spreadsheetId || !authClient) return;
  const drive = google.drive({ version: 'v3', auth: authClient });

  // 1. Grant 'writer' to anyone with the link so any authorized NGO staff can open and edit immediately
  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: { role: 'writer', type: 'anyone' }
    });
  } catch (err) {
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: { role: 'reader', type: 'anyone' }
      });
    } catch (e2) {}
  }

  // 2. Explicitly share with secondary admin emails (e.g. tejassachin2010@gmail.com) as Editor without sending notification spam
  const targets = Array.isArray(secondaryEmails) ? secondaryEmails : [secondaryEmails];
  for (const email of targets) {
    if (!email || typeof email !== 'string') continue;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) continue;
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: false,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: cleanEmail
        }
      });
    } catch (userPermErr) {
      // Ignore if permission already exists or user is already owner
    }
  }
}

/**
 * Sync children records to the NGO's own Google Sheet.
 * Creates Master Overview tab + dedicated individual child tabs matching the NGO clinical format.
 */
async function syncChildrenToGoogleSheetsInternal(children, ngoSlug, ngoName) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  const client = await getClientForNgo(safeSlug);

  if (!client) {
    return { success: false, message: 'Not connected' };
  }

  const integration = await getNgoIntegration(safeSlug);

  // Pre-validate refresh token to immediately detect expired grant before attempting API calls
  try {
    await client.getAccessToken();
  } catch (tokenErr) {
    console.error(`[Google OAuth] Access token refresh failed for ${safeSlug}:`, tokenErr.message);
    if (tokenErr.message?.includes('invalid_grant') || tokenErr.response?.data?.error === 'invalid_grant') {
      integration.tokenExpired = true;
      await saveNgoIntegration(safeSlug, integration);
      const fallbackSlug = safeSlug === 'alex-agape' ? 'ayusha-nilayam' : (safeSlug === 'ayusha-nilayam' ? 'alex-agape' : null);
      if (fallbackSlug) {
        const fbIntegration = await getNgoIntegration(fallbackSlug);
        if (fbIntegration) {
          fbIntegration.tokenExpired = true;
          await saveNgoIntegration(fallbackSlug, fbIntegration);
        }
      }
      return {
        success: false,
        error: 'invalid_grant',
        tokenExpired: true,
        message: 'Google authorization expired. Please reconnect Google Workspace in Settings.'
      };
    }
    return {
      success: false,
      error: tokenErr.message,
      message: 'Failed to authenticate with Google: ' + tokenErr.message
    };
  }

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
    await saveNgoIntegration(safeSlug, integration);
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
    await saveNgoIntegration(safeSlug, integration);
    console.log(`[Google OAuth] Created Student Medical Records Spreadsheet: ${integration.clinicalSpreadsheetUrl}`);
  }

  // Ensure both spreadsheets are shared with link access and secondary admin (tejassachin2010@gmail.com)
  const secondaryList = ['tejassachin2010@gmail.com', integration.secondaryEmail, integration.adminEmail];
  if (sheetId) {
    ensureSpreadsheetSharing(client, sheetId, secondaryList).catch(() => {});
  }
  if (clinicalSheetId) {
    ensureSpreadsheetSharing(client, clinicalSheetId, secondaryList).catch(() => {});
  }

  // Load auxiliary data (growth, medicines, health records, uploaded documents)
  // from this NGO's database, not the old global blob.
  const aux = await readTenantArrays(safeSlug, [
    'chm-growth', 'chm-medicines', 'chm-health-records', 'chm-documents'
  ]);
  const allGrowth = aux['chm-growth'];
  const allMedicines = aux['chm-medicines'];
  const allHealthRecords = aux['chm-health-records'];
  const allUploadedDocs = aux['chm-documents'];

  // Master Directory header and rows
  const overviewHeaders = [
    'ID', 'Child Name', 'Date of Birth', 'Age', 'Gender', 'Blood Group',
    'Aadhaar ID', 'Guardian', 'Contact Phone', 'Height (cm)', 'Weight (kg)',
    'Medical Conditions', 'Allergies', 'Status', 'Registration Date',
    'Current Medications', 'Dental Remarks', 'Oral Hygiene Index'
  ];

  const overviewRows = cleanChildren.map(c => [
    cleanCell(c.id || 'CH-0000'),
    cleanCell(c.name || ''),
    cleanCell(c.dob || ''),
    cleanCell(c.age || ''),
    cleanCell(c.gender || ''),
    cleanCell(c.blood || ''),
    cleanCell(c.idNumber || ''),
    cleanCell(c.father || c.guardian || ''),
    cleanCell(c.phone || ''),
    cleanCell(c.height ? `${c.height} cm` : ''),
    cleanCell(c.weight ? `${c.weight} kg` : ''),
    cleanCell(c.medicalConditions || ''),
    cleanCell(c.allergies || ''),
    cleanCell(c.status || 'Active'),
    cleanCell(c.registeredDate || new Date().toISOString().slice(0, 10)),
    cleanCell(c.medications || ''),
    cleanCell(c.dentalRemarks || ''),
    cleanCell(c.hygieneIndex || '')
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
    if (err1.message?.includes('invalid_grant') || err1.response?.data?.error === 'invalid_grant') {
      integration.tokenExpired = true;
      await saveNgoIntegration(safeSlug, integration);
      return {
        success: false,
        error: 'invalid_grant',
        tokenExpired: true,
        message: 'Google authorization expired. Please reconnect Google Workspace in Settings.'
      };
    }
    if (err1.code === 404 || err1.status === 404) {
      delete integration.sheetId;
      delete integration.spreadsheetUrl;
      await saveNgoIntegration(safeSlug, integration);
      return syncChildrenToGoogleSheetsInternal(children, ngoSlug, ngoName);
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

        const childGrowth = allGrowth.filter(g =>
          (g.childId && c.id && String(g.childId).trim() === String(c.id).trim()) ||
          (g.childName && c.name && g.childName.trim().toLowerCase() === c.name.trim().toLowerCase())
        );
        const childMeds = allMedicines.filter(m =>
          (m.childId && c.id && String(m.childId).trim() === String(c.id).trim()) ||
          (m.childName && c.name && m.childName.trim().toLowerCase() === c.name.trim().toLowerCase())
        );
        const childHealthRecs = allHealthRecords.filter(h =>
          (h.childId && c.id && String(h.childId).trim() === String(c.id).trim()) ||
          (h.childName && c.name && h.childName.trim().toLowerCase() === c.name.trim().toLowerCase())
        );
        const childDocs = allUploadedDocs.filter(d =>
          (d.childId && c.id && String(d.childId).trim() === String(c.id).trim()) ||
          (d.childName && c.name && d.childName.trim().toLowerCase() === c.name.trim().toLowerCase()) ||
          (d.child && c.name && d.child.trim().toLowerCase() === c.name.trim().toLowerCase())
        );

        const childSheetData = buildChildSheetData(c, childGrowth, childMeds, childHealthRecs, displayName, childDocs);
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

            // Set column widths (Col A - N) matching Blood Test Report columns
            const colWidths = [
              { start: 0, end: 1, width: 110 }, // A: DATE
              { start: 1, end: 2, width: 125 }, // B: HAEMOGLOBIN
              { start: 2, end: 3, width: 95 },  // C: WBC
              { start: 3, end: 4, width: 115 }, // D: PLATELETS
              { start: 4, end: 5, width: 90 },  // E: RBC
              { start: 5, end: 6, width: 85 },  // F: PCV
              { start: 6, end: 7, width: 120 }, // G: NEUTROPHIL
              { start: 7, end: 8, width: 130 }, // H: LYMPHOCYTES
              { start: 8, end: 9, width: 120 }, // I: EOSINOPHILS
              { start: 9, end: 10, width: 110 },// J: MONOCYTES
              { start: 10, end: 11, width: 100 },// K: BASOPHILS
              { start: 11, end: 12, width: 150 },// L: RBC MORPHOLOGY
              { start: 12, end: 13, width: 150 },// M: WBC MORPHOLOGY
              { start: 13, end: 14, width: 165 } // N: PLATELETS ADEQUACY
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
      if (clinErr.message?.includes('invalid_grant') || clinErr.response?.data?.error === 'invalid_grant') {
        integration.tokenExpired = true;
        await saveNgoIntegration(safeSlug, integration);
        return {
          success: false,
          error: 'invalid_grant',
          tokenExpired: true,
          message: 'Google authorization expired. Please reconnect Google Workspace in Settings.'
        };
      }
      if (clinErr.code === 404 || clinErr.status === 404) {
        delete integration.clinicalSheetId;
        delete integration.clinicalSpreadsheetUrl;
        delete integration.childSheetGids;
        await saveNgoIntegration(safeSlug, integration);
        return syncChildrenToGoogleSheetsInternal(children, ngoSlug, ngoName);
      }
    }
  }

  // Save gid map and URLs to integration config
  integration.childSheetGids = childSheetGids;
  await saveNgoIntegration(safeSlug, integration);

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

// Per-NGO sync queue to prevent concurrent overlapping Google Sheets batch updates
const ngoSyncQueues = new Map(); // slug -> { active: boolean, pending: boolean, lastArgs: any, lastResult: any }

/**
 * Public entrypoint for syncing children to Google Sheets.
 * Serializes executions per NGO so concurrent writes never race or overwrite each other.
 */
async function syncChildrenToGoogleSheets(children, ngoSlug, ngoName) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  let queue = ngoSyncQueues.get(safeSlug);
  if (!queue) {
    queue = { active: false, pending: false, lastArgs: null, lastResult: null };
    ngoSyncQueues.set(safeSlug, queue);
  }

  // If another sync is currently running for this NGO, coalesce this request
  if (queue.active) {
    queue.pending = true;
    queue.lastArgs = { children, ngoName };
    // Wait for the active sync (and any coalesced run) to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!queue.active && !queue.pending) {
          clearInterval(checkInterval);
          resolve(queue.lastResult || { success: true });
        }
      }, 300);
    });
  }

  queue.active = true;
  try {
    let result = await syncChildrenToGoogleSheetsInternal(children, safeSlug, ngoName);
    queue.lastResult = result;

    // While we were syncing, did another sync request arrive?
    while (queue.pending) {
      queue.pending = false;
      const { children: pendingChildren, ngoName: pendingNgoName } = queue.lastArgs || {};
      queue.lastArgs = null;
      // Small pause to let any in-flight database writes settle
      await new Promise(r => setTimeout(r, 400));
      result = await syncChildrenToGoogleSheetsInternal(pendingChildren || children, safeSlug, pendingNgoName || ngoName);
      queue.lastResult = result;
    }

    return result;
  } finally {
    queue.active = false;
    queue.pending = false;
  }
}

/**
 * Pull and import children records from the NGO's Google Sheets (Master Directory & Medical Records).
 * If someone adds a student directly in Google Sheets or updates student data,
 * this pulls those rows and synchronizes them into the app database.
 */
async function pullChildrenFromGoogleSheets(ngoSlug, ngoName) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  const client = await getClientForNgo(safeSlug);

  if (!client) {
    return { success: false, message: 'Google Sheets is not connected. Please connect Google Workspace in Settings.' };
  }

  const integration = await getNgoIntegration(safeSlug);

  // Pre-validate token
  try {
    await client.getAccessToken();
  } catch (tokenErr) {
    if (tokenErr.message?.includes('invalid_grant') || tokenErr.response?.data?.error === 'invalid_grant') {
      integration.tokenExpired = true;
      await saveNgoIntegration(safeSlug, integration);
      return {
        success: false,
        error: 'invalid_grant',
        tokenExpired: true,
        message: 'Google authorization expired. Please reconnect Google Workspace in Settings.'
      };
    }
  }

  const sheetId = integration.sheetId;

  if (!sheetId) {
    return { success: false, message: 'No Google Sheet found for this organization. Please sync or create one first.' };
  }

  const sheets = google.sheets({ version: 'v4', auth: client });

  const IGNORED_NAMES = ['unnamed child', 'child', 'name', 'child name', 'student name', 'sample', 'template'];

  // Load this NGO's existing children from whichever backend is live
  const pulled = await readTenantArrays(safeSlug, ['chm-children']);
  let existingChildren = pulled['chm-children'];

  // Filter out any legacy placeholder entries
  existingChildren = existingChildren.filter(c => c && c.name && !IGNORED_NAMES.includes(c.name.trim().toLowerCase()));

  const existingMap = new Map();
  existingChildren.forEach(c => {
    if (c.id) existingMap.set(c.id.toLowerCase().trim(), c);
    if (c.name) existingMap.set(c.name.toLowerCase().trim(), c);
  });

  let addedCount = 0;
  let updatedCount = 0;
  let removedCount = 0;
  const sheetSeenIds = new Set();
  const sheetSeenNames = new Set();
  const validSheetChildren = [];

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
        if (!name || IGNORED_NAMES.includes(name.toLowerCase())) continue;

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
        const rawGender = cleanVal(genderCol);
        const rawBlood = cleanVal(bloodCol);
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

        sheetSeenIds.add(id.toLowerCase().trim());
        sheetSeenNames.add(name.toLowerCase().trim());

        const existingMatch = existingMap.get(id.toLowerCase()) || existingMap.get(name.toLowerCase());

        if (existingMatch) {
          let changed = false;
          if (rawDob !== existingMatch.dob) { existingMatch.dob = rawDob; changed = true; }
          if (rawGender !== existingMatch.gender) { existingMatch.gender = rawGender; changed = true; }
          if (rawBlood !== existingMatch.blood) { existingMatch.blood = rawBlood; changed = true; }
          if (rawIdNum !== existingMatch.idNumber) { existingMatch.idNumber = rawIdNum; changed = true; }
          if (rawGuardian !== existingMatch.father && rawGuardian !== existingMatch.guardian) { existingMatch.father = rawGuardian; existingMatch.guardian = rawGuardian; changed = true; }
          if (rawPhone !== existingMatch.phone) { existingMatch.phone = rawPhone; changed = true; }
          if (rawHeight !== existingMatch.height) { existingMatch.height = rawHeight; changed = true; }
          if (rawWeight !== existingMatch.weight) { existingMatch.weight = rawWeight; changed = true; }
          if (rawMedCond !== existingMatch.medicalConditions && rawMedCond !== 'None') { existingMatch.medicalConditions = rawMedCond; changed = true; }
          if (rawAllergies !== existingMatch.allergies && rawAllergies !== 'None') { existingMatch.allergies = rawAllergies; changed = true; }
          if (rawStatus && rawStatus !== existingMatch.status) { existingMatch.status = rawStatus; changed = true; }
          if (rawMeds !== existingMatch.medications && rawMeds !== 'None') { existingMatch.medications = rawMeds; changed = true; }
          if (rawDental !== existingMatch.dentalRemarks && rawDental !== 'None') { existingMatch.dentalRemarks = rawDental; changed = true; }
          if (rawHygiene !== existingMatch.hygieneIndex && rawHygiene !== 'Not Assessed') { existingMatch.hygieneIndex = rawHygiene; changed = true; }
          if (changed) updatedCount++;
          validSheetChildren.push(existingMatch);
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
          validSheetChildren.push(newChild);
          existingMap.set(id.toLowerCase(), newChild);
          existingMap.set(name.toLowerCase(), newChild);
          addedCount++;
        }
      }

      // Check for removed children (present in app database previously, but deleted from Google Sheets)
      existingChildren.forEach(ec => {
        const idKey = (ec.id || '').toLowerCase().trim();
        const nameKey = (ec.name || '').toLowerCase().trim();
        if (!sheetSeenIds.has(idKey) && !sheetSeenNames.has(nameKey)) {
          removedCount++;
        }
      });
    }
  } catch (readErr) {
    console.warn('[Google OAuth] Master sheet read warning:', readErr.message);
  }

  // Deduplicate and filter final children list
  let cleanedChildren = existingChildren;
  if (validSheetChildren.length > 0) {
    const finalMap = new Map();
    validSheetChildren.forEach(c => {
      if (c && c.name && !IGNORED_NAMES.includes(c.name.trim().toLowerCase())) {
        const key = (c.id || c.name).toLowerCase().trim();
        finalMap.set(key, c);
      }
    });
    cleanedChildren = Array.from(finalMap.values());
    await writeTenantChildren(safeSlug, cleanedChildren);
    console.log(`[Google OAuth] Pulled from Child Health Records master sheet: ${addedCount} added, ${updatedCount} updated, ${removedCount} removed.`);
  }

  let statusMsg = 'Synced with Child Health Records: ';
  const parts = [];
  if (addedCount > 0) parts.push(`${addedCount} new child(ren) imported`);
  if (updatedCount > 0) parts.push(`${updatedCount} updated`);
  if (removedCount > 0) parts.push(`${removedCount} deleted child(ren) removed`);
  if (parts.length === 0) parts.push('All records up to date');
  statusMsg += parts.join(', ') + '.';

  return {
    success: true,
    addedCount,
    updatedCount,
    removedCount,
    totalCount: cleanedChildren.length,
    children: cleanedChildren,
    message: statusMsg
  };
}

/**
 * Delete a specific child from the database and Google Sheets
 * Safely removes ONLY the targeted child, updates Sheet1, and removes the child's tab in clinicalSheetId
 */
async function deleteChildFromGoogleSheets(childId, ngoSlug, ngoName) {
  if (!childId) return { success: false, message: 'Child ID is required' };

  const safeSlug = sanitizeNgoSlug(ngoSlug);
  const loaded = await readTenantArrays(safeSlug, ['chm-children']);
  const currentChildren = loaded['chm-children'];

  const targetChild = currentChildren.find(c => c.id === childId || c.name?.toLowerCase() === childId.toLowerCase());
  const remainingChildren = currentChildren.filter(c => c.id !== childId && c.name?.toLowerCase() !== childId.toLowerCase());

  // Update this NGO's roster with the remaining children
  await writeTenantChildren(safeSlug, remainingChildren);

  // Update local CSV backup
  try {
    const { updateLocalCSVExport } = require('../../server');
    if (typeof updateLocalCSVExport === 'function') {
      updateLocalCSVExport(remainingChildren);
    }
  } catch (e) { }

  // Sync remaining children to Google Sheets Master Directory (Sheet1)
  const client = await getClientForNgo(safeSlug);
  const integration = await getNgoIntegration(safeSlug);

  if (client && integration && integration.sheetId) {
    try {
      const sheets = google.sheets({ version: 'v4', auth: client });

      const overviewHeaders = [
        'ID', 'Child Name', 'Date of Birth', 'Age', 'Gender', 'Blood Group',
        'Aadhaar ID', 'Guardian', 'Contact Phone', 'Height (cm)', 'Weight (kg)',
        'Medical Conditions', 'Allergies', 'Status', 'Registration Date',
        'Current Medications', 'Dental Remarks', 'Oral Hygiene Index'
      ];

      const overviewRows = remainingChildren.map(c => [
        cleanCell(c.id || 'CH-0000'),
        cleanCell(c.name || ''),
        cleanCell(c.dob || ''),
        cleanCell(c.age || ''),
        cleanCell(c.gender || ''),
        cleanCell(c.blood || ''),
        cleanCell(c.idNumber || ''),
        cleanCell(c.father || c.guardian || ''),
        cleanCell(c.phone || ''),
        cleanCell(c.height ? `${c.height} cm` : ''),
        cleanCell(c.weight ? `${c.weight} kg` : ''),
        cleanCell(c.medicalConditions || ''),
        cleanCell(c.allergies || ''),
        cleanCell(c.status || 'Active'),
        cleanCell(c.registeredDate || new Date().toISOString().slice(0, 10)),
        cleanCell(c.medications || ''),
        cleanCell(c.dentalRemarks || ''),
        cleanCell(c.hygieneIndex || '')
      ]);

      const masterTableData = [overviewHeaders, ...overviewRows];

      await sheets.spreadsheets.values.clear({
        spreadsheetId: integration.sheetId,
        range: 'Sheet1!A1:Z5000'
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: integration.sheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: masterTableData }
      });
      console.log(`[Google OAuth] Child ${childId} (${targetChild?.name || 'child'}) removed from Google Sheet (${remainingChildren.length} remaining).`);
    } catch (sheetErr) {
      console.warn('[Google OAuth] Error clearing child row in Google Sheet:', sheetErr.message);
    }

    // Also remove the child's tab in clinicalSheetId if present
    if (integration.clinicalSheetId && targetChild && targetChild.name) {
      try {
        const sheets = google.sheets({ version: 'v4', auth: client });
        const metaRes = await sheets.spreadsheets.get({ spreadsheetId: integration.clinicalSheetId });
        const existingSheets = metaRes.data.sheets || [];
        const childTabTitle = sanitizeSheetTitle(targetChild.name);

        const matchingSheet = existingSheets.find(s =>
          s.properties.title === childTabTitle ||
          s.properties.title.toLowerCase() === targetChild.name.toLowerCase()
        );

        if (matchingSheet && existingSheets.length > 1) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: integration.clinicalSheetId,
            requestBody: {
              requests: [
                { deleteSheet: { sheetId: matchingSheet.properties.sheetId } }
              ]
            }
          });
          console.log(`[Google OAuth] Deleted tab "${matchingSheet.properties.title}" for removed child.`);
        }
      } catch (tabErr) {
        console.warn('[Google OAuth] Error deleting child tab in clinical sheet:', tabErr.message);
      }
    }
  }

  return {
    success: true,
    removedChild: targetChild || { id: childId },
    children: remainingChildren,
    remainingCount: remainingChildren.length,
    message: `Successfully removed ${targetChild?.name || childId} from app and Google Sheet.`
  };
}

/**
 * Sync executive health audit report content to the NGO's own Google Doc.
 * Automatically creates the document if it doesn't exist yet.
 */
async function syncExecutiveDocToGoogleDocs(reportContent, ngoSlug, ngoName) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  const client = await getClientForNgo(safeSlug);

  if (!client) {
    return { success: false, message: 'Not connected' };
  }

  const integration = await getNgoIntegration(safeSlug);
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
    await saveNgoIntegration(safeSlug, integration);
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

/* ═══════════════════════════════════════════════════════
   GOOGLE DRIVE CLOUD STORAGE FOR CHILD HEALTH DOCUMENTS
   ═══════════════════════════════════════════════════════ */

/**
 * Find or create a folder in Google Drive.
 * @param {import('google-auth-library').OAuth2Client} authClient
 * @param {string} folderName
 * @param {string|null} parentId
 * @returns {Promise<{id: string, webViewLink: string}>}
 */
async function findOrCreateFolder(authClient, folderName, parentId = null) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const escapedName = folderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and trashed = false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }

  try {
    const listRes = await drive.files.list({
      q,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive'
    });

    if (listRes.data.files && listRes.data.files.length > 0) {
      return {
        id: listRes.data.files[0].id,
        webViewLink: listRes.data.files[0].webViewLink
      };
    }
  } catch (searchErr) {
    console.warn(`[Google Drive] Folder search notice (${folderName}):`, searchErr.message);
  }

  // Create folder if not found
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId ? { parents: [parentId] } : {})
  };

  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name, webViewLink'
  });

  const folder = createRes.data;

  try {
    await drive.permissions.create({
      fileId: folder.id,
      requestBody: { role: 'reader', type: 'anyone' }
    });
  } catch (permErr) {
    // Restricted by Google Workspace domain policy, fallback to default ownership
  }

  return {
    id: folder.id,
    webViewLink: folder.webViewLink
  };
}

/**
 * Upload a binary buffer as a file to Google Drive.
 * @param {import('google-auth-library').OAuth2Client} authClient
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {string} mimeType
 * @param {string|null} folderId
 * @returns {Promise<{fileId: string, webViewLink: string, webContentLink: string}>}
 */
async function uploadFileToDrive(authClient, fileBuffer, fileName, mimeType, folderId = null) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const escapedName = fileName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  // Check if a file with this name already exists in this folder to prevent duplicates
  if (folderId) {
    try {
      const existingRes = await drive.files.list({
        q: `name = '${escapedName}' and '${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, webViewLink, webContentLink, createdTime)',
        spaces: 'drive'
      });

      if (existingRes.data.files && existingRes.data.files.length > 0) {
        // Sort oldest first as primary
        existingRes.data.files.sort((a, b) => new Date(a.createdTime || 0) - new Date(b.createdTime || 0));
        const primaryFile = existingRes.data.files[0];
        console.log(`[Google Drive] Updating existing file "${fileName}" (${primaryFile.id})`);

        // If duplicate files exist in this folder, clean up the duplicate copies
        if (existingRes.data.files.length > 1) {
          for (let i = 1; i < existingRes.data.files.length; i++) {
            try {
              await drive.files.delete({ fileId: existingRes.data.files[i].id });
              console.log(`[Google Drive] Deleted duplicate copy (${existingRes.data.files[i].id})`);
            } catch (delErr) {}
          }
        }

        const stream = Readable.from(fileBuffer);
        const updateRes = await drive.files.update({
          fileId: primaryFile.id,
          media: {
            mimeType: mimeType || 'application/octet-stream',
            body: stream
          },
          fields: 'id, name, webViewLink, webContentLink'
        });

        return {
          fileId: updateRes.data.id,
          webViewLink: updateRes.data.webViewLink,
          webContentLink: updateRes.data.webContentLink
        };
      }
    } catch (listErr) {
      console.warn('[Google Drive] File search notice:', listErr.message);
    }
  }

  // Create new file if it does not exist
  const stream = Readable.from(fileBuffer);
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      ...(folderId ? { parents: [folderId] } : {})
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: stream
    },
    fields: 'id, name, webViewLink, webContentLink'
  });

  try {
    await drive.permissions.create({
      fileId: res.data.id,
      requestBody: { role: 'reader', type: 'anyone' }
    });
  } catch (permErr) {
    // Restricted by Google Workspace domain policy
  }

  return {
    fileId: res.data.id,
    webViewLink: res.data.webViewLink,
    webContentLink: res.data.webContentLink
  };
}

/**
 * Upload a child health document into the NGO's Google Drive organized by child name.
 * Creates: "Child Health Documents — [NGO Name]" / "[Child Name]" / "[File]"
 * @param {string} ngoSlug
 * @param {string} childName
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {string} mimeType
 * @param {string|null} [ngoDisplayName]
 * @returns {Promise<object>}
 */
async function uploadDocumentToChildDrive(ngoSlug, childName, fileBuffer, fileName, mimeType, ngoDisplayName = null) {
  const safeSlug = sanitizeNgoSlug(ngoSlug);
  const authClient = await getClientForNgo(safeSlug);
  if (!authClient) {
    throw new Error('Google Workspace is not connected for this NGO. Please connect Google in Settings.');
  }

  const integration = await getNgoIntegration(safeSlug);
  const drive = google.drive({ version: 'v3', auth: authClient });

  let rootFolderId = integration.documentsRootFolderId;
  let rootFolderUrl = integration.documentsRootFolderUrl;

  // 1. Verify existing stored rootFolderId
  if (rootFolderId) {
    try {
      const getRes = await drive.files.get({ fileId: rootFolderId, fields: 'id, trashed, webViewLink' });
      if (getRes.data.trashed) {
        rootFolderId = null;
      } else {
        rootFolderUrl = getRes.data.webViewLink || rootFolderUrl;
      }
    } catch (e) {
      rootFolderId = null;
    }
  }

  // 2. If no valid rootFolderId, search for ANY existing "Child Health Documents" root folder
  if (!rootFolderId) {
    try {
      const listRoots = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and name contains 'Child Health Documents' and trashed = false",
        fields: 'files(id, name, webViewLink, createdTime)',
        spaces: 'drive'
      });
      if (listRoots.data.files && listRoots.data.files.length > 0) {
        listRoots.data.files.sort((a, b) => new Date(a.createdTime || 0) - new Date(b.createdTime || 0));
        rootFolderId = listRoots.data.files[0].id;
        rootFolderUrl = listRoots.data.files[0].webViewLink;

        // If duplicate root folders exist, consolidate subfolders into the primary one
        if (listRoots.data.files.length > 1) {
          for (let i = 1; i < listRoots.data.files.length; i++) {
            const extraRoot = listRoots.data.files[i];
            try {
              const subRes = await drive.files.list({
                q: `'${extraRoot.id}' in parents and trashed = false`,
                fields: 'files(id, name)'
              });
              for (const childItem of (subRes.data.files || [])) {
                await drive.files.update({
                  fileId: childItem.id,
                  addParents: rootFolderId,
                  removeParents: extraRoot.id,
                  fields: 'id, parents'
                });
              }
              await drive.files.update({
                fileId: extraRoot.id,
                requestBody: { trashed: true }
              });
              console.log(`[Google Drive] Merged duplicate root folder ${extraRoot.id} into ${rootFolderId}`);
            } catch (mergeErr) {
              console.warn('[Google Drive] Root merge notice:', mergeErr.message);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Google Drive] Root folder search notice:', e.message);
    }
  }

  // 3. If still not found, create a single clean root folder
  if (!rootFolderId) {
    const rootFolder = await findOrCreateFolder(authClient, 'Child Health Documents — Ayusha Nilayam', null);
    rootFolderId = rootFolder.id;
    rootFolderUrl = rootFolder.webViewLink;
  }

  // Save root folder ID for this tenant and sister slug
  integration.documentsRootFolderId = rootFolderId;
  integration.documentsRootFolderUrl = rootFolderUrl;
  await saveNgoIntegration(safeSlug, integration);
  const sisterSlug = safeSlug === 'alex-agape' ? 'ayusha-nilayam' : 'alex-agape';
  await saveNgoIntegration(sisterSlug, integration);

  // 4. Find or create the child subfolder strictly inside this primary root folder
  const safeChildName = (childName || 'General Documents').trim();
  const childFolder = await findOrCreateFolder(authClient, safeChildName, rootFolderId);

  // 5. Upload or update the file in the child folder (preventing duplicate files)
  const uploadResult = await uploadFileToDrive(authClient, fileBuffer, fileName, mimeType, childFolder.id);

  return {
    success: true,
    driveFileId: uploadResult.fileId,
    driveUrl: uploadResult.webViewLink || uploadResult.webContentLink,
    webContentLink: uploadResult.webContentLink,
    childFolderId: childFolder.id,
    childFolderUrl: childFolder.webViewLink,
    rootFolderId,
    rootFolderUrl
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
  deleteChildFromGoogleSheets,
  syncExecutiveDocToGoogleDocs,
  findOrCreateFolder,
  uploadFileToDrive,
  uploadDocumentToChildDrive
};
