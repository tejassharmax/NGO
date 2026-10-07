/**
 * bloodTestRegister.js
 * Builds the "Blood Test Reports" workbook: an "All Children" tab listing every
 * report with the child's name, and one tab per child with only that child's
 * reports, newest first.
 *
 * Reports come from chm-health-records (the Blood Test Report section of the
 * clinical form). Records of children no longer on the roster are left out, the
 * same rule the Monthly Checkup Register follows.
 *
 * Pure functions only. The Google Sheets I/O lives in googleOAuth.js.
 */

const BLOOD_HEADERS = [
  'DATE', 'HAEMOGLOBIN', 'WBC', 'PLATELETS', 'RBC', 'PCV',
  'NEUTROPHIL', 'LYMPHOCYTES', 'EOSINOPHILS', 'MONOCYTES', 'BASOPHILS',
  'RBC MORPHOLOGY', 'WBC MORPHOLOGY', 'PLATELETS ADEQUACY'
];

/** Headers of the "All Children" tab: who the report belongs to, then the report. */
const ALL_CHILDREN_HEADERS = ['CHILD NAME', 'CHILD ID', ...BLOOD_HEADERS];

const ALL_CHILDREN_TAB_TITLE = 'All Children';

/** Rows above the report table on a child's tab: name/ID line, spacer, then headers. */
const CHILD_TAB_HEADER_ROW = 3;

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

/** 'YYYY-MM-DD' when the date is in that form, otherwise the text as entered. */
function normalizeDate(value) {
  const str = text(value);
  return /^\d{4}-\d{2}-\d{2}/.test(str) ? str.slice(0, 10) : str;
}

/** One report as a row matching BLOOD_HEADERS, or null when it holds no values. */
function reportRow(r) {
  const values = [
    r.hemoglobin || r.hb, r.wbc, r.platelets, r.rbc, r.pcv,
    r.neutrophil, r.lymphocytes, r.eosinophils, r.monocytes, r.basophils,
    r.rbcMorphology, r.wbcMorphology, r.plateletsAdequacy
  ].map(text);
  if (!values.some(Boolean)) return null;
  return [normalizeDate(r.date), ...values];
}

/**
 * @param {{children?: object[], healthRecords?: object[]}} data
 * @returns {{perChild: {child: object, rows: string[][]}[], allRows: string[][]}}
 *   perChild follows roster order; rows are newest first. allRows prefixes each
 *   row with the child's name and ID.
 */
function buildBloodTestRegister({ children = [], healthRecords = [] } = {}) {
  const roster = children.filter(c => c && (c.id || c.name));
  const byId = new Map();
  const byName = new Map();
  roster.forEach(c => {
    if (c.id) byId.set(text(c.id), c);
    if (c.name) byName.set(text(c.name).toLowerCase(), c);
  });
  const resolveChild = (rec) => {
    const id = text(rec.childId);
    if (id && byId.has(id)) return byId.get(id);
    const name = text(rec.childName || rec.child).toLowerCase();
    return (name && byName.get(name)) || null;
  };

  const rowsByChild = new Map(roster.map(c => [c, []]));
  healthRecords.filter(Boolean).forEach(r => {
    const child = resolveChild(r);
    const row = child && reportRow(r);
    if (row) rowsByChild.get(child).push(row);
  });

  const newestFirst = (a, b) => String(b[0]).localeCompare(String(a[0]));
  const perChild = roster.map(child => ({ child, rows: rowsByChild.get(child).sort(newestFirst) }));
  const allRows = perChild.flatMap(({ child, rows }) => rows.map(row => [text(child.name), text(child.id), ...row]));
  return { perChild, allRows };
}

module.exports = {
  BLOOD_HEADERS,
  ALL_CHILDREN_HEADERS,
  ALL_CHILDREN_TAB_TITLE,
  CHILD_TAB_HEADER_ROW,
  buildBloodTestRegister
};
