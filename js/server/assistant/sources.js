/**
 * assistant/sources.js
 * The "sources" Ask Ayusha answers from, like the sources panel in Gemini for
 * Google Drive: the space's own workbooks and its appointments calendar, nothing
 * else.
 *
 * - A space connected to Google Workspace: each workbook is read from Google
 *   Sheets by the file id the app saved when it created it (drive.file scope).
 * - A space without a connection (or when Google cannot be reached): the same
 *   source is built from the app's own records, so the assistant still works.
 * - The calendar always comes from the app's appointments.
 *
 * Aadhaar and insurance numbers, phone numbers, email addresses and addresses
 * are blanked before anything is sent to the model.
 */

const { google } = require('googleapis');
const { getClientForNgo, getNgoIntegration } = require('../googleOAuth');
const { toolData, today, ageYears } = require('./tools');

const MAX_SOURCE_CHARS = 250000;
const CACHE_MS = 60 * 1000;
const cache = new Map(); // `${slug}:${id}` -> { at, value }

const SENSITIVE_LABEL = /aadhaa?r|insurance id|ayushman id|policy (no|number)|id number|all insurance entries|phone|mobile|contact no|e-?mail|address/i;
const HIDDEN = '[hidden]';

/** Source definitions. `sheetKey` is where the workbook's id lives in the integration. */
function definitions(isFamily) {
  const people = isFamily ? 'family members' : 'children';
  return [
    { id: 'directory', sheetKey: 'sheetId', label: isFamily ? 'Family Members' : 'Child Health Records', about: `One row per ${isFamily ? 'family member' : 'child'}: profile, blood group, insurance status` },
    { id: 'medical', sheetKey: 'clinicalSheetId', label: isFamily ? 'Medical Records' : 'Student Medical Records', about: `Checkups, height and weight over time for each of the ${people}` },
    ...(isFamily ? [] : [{ id: 'monthly', sheetKey: 'monthlySheetId', label: 'Monthly Checkup Register', about: 'Every visit, month by month, with clinic and doctor' }]),
    { id: 'blood', sheetKey: 'bloodSheetId', label: 'Blood Test Reports', about: 'Every blood test result' },
    { id: 'calendar', sheetKey: null, label: 'Appointments calendar', about: 'Past and upcoming appointments and vaccinations' }
  ];
}

async function connection(slug) {
  try {
    const integration = await getNgoIntegration(slug);
    if (!integration || !integration.refresh_token || integration.tokenExpired) return { integration: null, client: null };
    const client = await getClientForNgo(slug);
    return { integration, client };
  } catch (err) {
    return { integration: null, client: null };
  }
}

/**
 * The sources this space offers, for the sources panel.
 * @returns {Promise<{id: string, title: string, about: string, kind: 'sheet'|'calendar', origin: 'google'|'app', url: string|null}[]>}
 */
async function listSources(slug, spaceName, isFamily) {
  const { integration, client } = await connection(slug);
  const sheets = client ? google.sheets({ version: 'v4', auth: client }) : null;
  return Promise.all(definitions(isFamily).map(async def => {
    const sheetId = def.sheetKey && integration ? integration[def.sheetKey] : null;
    const base = { id: def.id, about: def.about, kind: def.sheetKey ? 'sheet' : 'calendar' };
    if (sheetId && sheets) {
      try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: 'properties.title' });
        return { ...base, title: meta.data.properties.title, origin: 'google', url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit` };
      } catch (err) { /* fall through to the app's own copy */ }
    }
    return { ...base, title: `${spaceName} — ${def.label}`, origin: 'app', url: null };
  }));
}

/**
 * The text of the chosen sources, ready to put in front of the model.
 * @param {string[]} ids source ids the user ticked
 */
async function loadSources(slug, spaceName, isFamily, payload, ids) {
  const defs = definitions(isFamily).filter(d => ids.includes(d.id));
  const data = toolData(payload);
  const { integration, client } = defs.some(d => d.sheetKey) ? await connection(slug) : { integration: null, client: null };
  const sheets = client ? google.sheets({ version: 'v4', auth: client }) : null;

  const blocks = [];
  for (const def of defs) {
    const sheetId = def.sheetKey && integration ? integration[def.sheetKey] : null;
    let block = null;
    if (sheetId && sheets) {
      const key = `${slug}:${def.id}:${sheetId}`;
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < CACHE_MS) block = hit.value;
      else {
        try {
          block = await readWorkbook(sheets, sheetId, def.id);
          cache.set(key, { at: Date.now(), value: block });
        } catch (err) {
          block = null; // Google unavailable: use the app's records below
        }
      }
    }
    if (!block) block = buildFromRecords(def.id, data, spaceName, def.label);
    blocks.push({ id: def.id, title: block.title, text: clip(block.text) });
  }
  return { blocks, children: data.children.map(c => ({ id: c.id, name: String(c.name || '').trim() })).filter(c => c.name) };
}

function clip(text) {
  return text.length > MAX_SOURCE_CHARS ? `${text.slice(0, MAX_SOURCE_CHARS)}\n[… source cut short: too long]` : text;
}

/* ---------- Google Sheets ---------- */

async function readWorkbook(sheets, spreadsheetId, sourceId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'properties.title,sheets.properties.title' });
  let tabs = meta.data.sheets.map(s => s.properties.title);
  // The Date Range Report tab is a filter form and the hidden Blood Test Data tab
  // repeats the Blood Test Reports workbook; neither adds facts.
  if (sourceId === 'monthly') tabs = tabs.filter(t => !/date range report|blood test data/i.test(t));
  // The blood workbook has an "All Children"/"All Members" tab plus the same rows
  // again one tab per person; the summary tab is enough.
  if (sourceId === 'blood') {
    const all = tabs.find(t => /^all (children|members)$/i.test(t));
    if (all) tabs = [all];
  }
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: tabs.map(t => `'${t.replace(/'/g, "''")}'`),
    valueRenderOption: 'FORMATTED_VALUE'
  });
  const parts = (res.data.valueRanges || []).map((vr, i) => `### Tab: ${tabs[i]}\n${tableText(redactRows(vr.values || []))}`);
  return { title: meta.data.properties.title, text: parts.join('\n\n') };
}

/**
 * Blanks sensitive cells. Works for tables (a header names the column) and for
 * label/value layouts (a label cell names the cell to its right), and scrubs
 * anything that looks like an Aadhaar number, a phone number or an email address.
 */
function redactRows(rows) {
  // Column -> row of its header label, for labels found near the top of the tab.
  const headerRow = new Map();
  rows.slice(0, 8).forEach((row, r) => row.forEach((cell, c) => {
    if (!headerRow.has(c) && SENSITIVE_LABEL.test(String(cell || ''))) headerRow.set(c, r);
  }));
  return rows.map((row, r) => row.map((cell, c) => {
    const value = String(cell === null || cell === undefined ? '' : cell);
    if (!value) return value;
    if (SENSITIVE_LABEL.test(value)) return scrub(value); // a label is kept, but a number typed beside the word is not
    const labelLeft = c > 0 && SENSITIVE_LABEL.test(String(row[c - 1] || ''));
    const underHeader = headerRow.has(c) && r > headerRow.get(c);
    if (labelLeft || underHeader) return HIDDEN;
    return scrub(value);
  }));
}

function scrub(value) {
  return value
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, HIDDEN)
    .replace(/(?:\+91[\s-]?)?\b[6-9]\d{9}\b/g, HIDDEN)
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, HIDDEN);
}

function tableText(rows) {
  return rows
    .map(row => row.map(v => String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim()))
    .filter(row => row.some(Boolean))
    .map(row => row.join(' | '))
    .join('\n');
}

/* ---------- Built from the app's records ---------- */

const t = v => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim());
const byDate = (a, b) => t(a.date).localeCompare(t(b.date));

const BLOOD = [
  ['hemoglobin', 'Haemoglobin (g/dL)'], ['wbc', 'WBC (/cumm)'], ['platelets', 'Platelets (lakhs/cumm)'], ['rbc', 'RBC (million/uL)'],
  ['pcv', 'PCV (%)'], ['mcv', 'MCV (fL)'], ['mch', 'MCH (pg)'], ['mchc', 'MCHC (g/dL)'], ['esr', 'ESR (mm/hr)'],
  ['neutrophils', 'Neutrophils (%)'], ['lymphocytes', 'Lymphocytes (%)'], ['monocytes', 'Monocytes (%)'], ['eosinophils', 'Eosinophils (%)'], ['basophils', 'Basophils (%)']
];

function insuranceNow(c, on) {
  const entries = (c.insurance || []).map(e => ({
    insurer: t(e.insurer), from: t(e.startDate), to: t(e.expiryDate),
    status: e.startDate && e.startDate > on ? 'Upcoming' : (e.expiryDate && e.expiryDate < on ? 'Expired' : 'Active')
  }));
  const rank = { Active: 0, Upcoming: 1, Expired: 2 };
  entries.sort((a, b) => rank[a.status] - rank[b.status] || b.to.localeCompare(a.to));
  return entries[0] || null;
}

function buildFromRecords(id, data, spaceName, label) {
  const on = today();
  const nameOf = (childId, fallback) => t((data.children.find(c => c.id === childId) || {}).name || fallback);
  const table = (header, rows) => [header.join(' | '), ...rows.map(r => r.map(t).join(' | '))].join('\n');
  let text = '';

  if (id === 'directory') {
    text = table(
      ['Child ID', 'Name', 'Date of Birth', 'Age', 'Gender', 'Blood Group', 'Status', 'Registered On', 'Medical Conditions', 'Allergies', 'Current Medications', 'Insurer', 'Insurance Valid From', 'Insurance Valid To', 'Insurance Status'],
      data.children.map(c => {
        const ins = insuranceNow(c, on);
        return [c.id, c.name, c.dob, ageYears(c.dob), c.gender, c.blood, c.status || 'Active', c.registeredDate, c.medicalConditions, c.allergies, c.medications,
          ins ? ins.insurer : 'None', ins ? ins.from : '', ins ? ins.to : '', ins ? ins.status : ''];
      })
    );
  } else if (id === 'medical') {
    const checkups = data.children.map(c => {
      const rows = data.growth.filter(g => g.childId === c.id).sort(byDate);
      const meds = data.medicines.filter(m => m.childId === c.id);
      return `### ${t(c.name)} (${c.id})\n` + table(
        ['Date', 'Height (cm)', 'Weight (kg)', 'Temperature (F)', 'BP', 'Pulse', 'SpO2', 'Eye Checkup', 'Complaint', 'Prescription', 'Doctor', 'Clinic'],
        rows.map(g => [g.date, g.height, g.weight, g.temperature, g.bp, g.pulse, g.spo2, g.eyeCheckup, g.complaint, g.prescription, g.doctorName, g.clinicName])
      ) + (meds.length ? '\nMedicines: ' + meds.map(m => `${t(m.medicineName)} ${t(m.dosage)} ${t(m.frequency)} (${t(m.startDate)} to ${t(m.endDate) || 'ongoing'})`).join('; ') : '');
    });
    text = checkups.join('\n\n');
  } else if (id === 'monthly') {
    const visits = data.growth.filter(g => g.date).sort(byDate).map(g => [t(g.date).slice(0, 7), g.date, g.childId, nameOf(g.childId), g.checkupType || 'Checkup', g.complaint, g.prescription, g.clinicName, g.doctorName]);
    text = table(['Month', 'Date', 'Child ID', 'Name', 'Checkup Type', 'Complaint / Notes', 'Prescription', 'Clinic', 'Doctor'], visits);
  } else if (id === 'blood') {
    text = table(
      ['Child ID', 'Name', 'Date', 'Test', ...BLOOD.map(([, l]) => l)],
      data.health.slice().sort(byDate).map(h => [h.childId, nameOf(h.childId, h.childName), h.date, h.recordType, ...BLOOD.map(([k]) => h[k])])
    );
  } else if (id === 'calendar') {
    text = table(
      ['Date', 'Time', 'Child ID', 'Name', 'Type', 'Vaccine', 'Doctor', 'Clinic', 'Recorded Status', 'When'],
      data.appointments.slice().sort(byDate).map(p => [p.date, p.time, p.childId, nameOf(p.childId, p.childName), p.type, p.vaccineName, p.doctorName || p.doctor, p.clinicName, p.status, t(p.date) >= on ? 'upcoming' : 'past'])
    );
  }
  return { title: `${spaceName} — ${label}`, text: scrub(text) || '(no rows yet)' };
}

module.exports = { listSources, loadSources, definitions, redactRows };
