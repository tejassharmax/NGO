/**
 * monthlyRegister.js
 * Builds the "Monthly Checkup Register": one row per child per visit, grouped by
 * month, for every child in the NGO.
 *
 * A visit is identified by (child, date) and assembled from three collections:
 *   chm-appointments  the checkup type, vaccination name and appointment notes
 *   chm-growth        the clinical checkup: clinic, doctor, complaint and prescription
 *   chm-medicines     prescriptions added on the Prescriptions page
 * so a checkup booked in the calendar and filled in afterwards lands on one row.
 * A child can have several visits in a month (illness, infection, follow-up);
 * each date is its own row.
 *
 * Pure functions only. The Google Sheets I/O lives in googleOAuth.js.
 */

const { BLOOD_HEADERS } = require('./bloodTestRegister');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const REGISTER_HEADERS = ['NAME OF CHILD', 'CHECKUP TYPE', 'CLINIC NAME', 'DOCTOR NAME', 'PRESCRIPTION', 'NOTES', 'DATE'];

/** The NGO works in India, so "this month" follows IST, not the server's UTC clock. */
const REGISTER_TIME_ZONE = 'Asia/Kolkata';

/** 'YYYY-MM' of today in the register's time zone. */
function currentMonthKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REGISTER_TIME_ZONE, year: 'numeric', month: '2-digit'
  }).formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  return `${year}-${month}`;
}

/** 'YYYY-MM-DD' of today in the register's time zone. */
function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REGISTER_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

/* ─── Date Range Report tab ─── */

/** Tab where staff pick a From/To date (and optionally a child) and see every visit in that range. */
const REPORT_TAB_TITLE = 'Date Range Report';

/** Dropdown choice that shows every child. */
const ALL_CHILDREN = 'All children';

/** Rows of the report tab: controls in A1:C4, headers on row 6, results from row 7. */
const REPORT_HEADER_ROW = 6;

function quoteTabTitle(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

/** Spreadsheet column letter of the register's last column (DATE). */
function lastRegisterColumn() {
  return String.fromCharCode(64 + REGISTER_HEADERS.length);
}

/**
 * Hidden tab in the same workbook holding every blood test report (child name,
 * date, values). The report tab reads it so blood tests can be filtered by the
 * same From/To/Child cells; it is rewritten on every sync like the month tabs.
 */
const BLOOD_DATA_TAB_TITLE = 'Blood Test Data';
const BLOOD_DATA_HEADERS = ['NAME OF CHILD', ...BLOOD_HEADERS];

/** Title row that separates the blood test section from the checkups in the report. */
const BLOOD_SECTION_TITLE = 'BLOOD TEST REPORTS';
const NO_CHECKUPS = 'No checkups in this date range.';
const NO_BLOOD_TESTS = 'No blood test reports in this date range.';

/** One row of the Blood Test Data tab per report: name, date, then the values. */
function bloodDataRows(allRows) {
  return allRows.map(([name, , ...report]) => [name, ...report]);
}

/**
 * The report formula. It stacks every month tab, keeps the visits dated between
 * From (B2) and To (B3), optionally only one child (B4), and sorts them by date.
 * Below them it lists the blood test reports matching the same filters.
 * The month tabs and the Blood Test Data tab stay the only place the data is
 * written; this tab only reads them.
 * @param {string[]} monthTitles e.g. ['October 2026', 'September 2026']
 */
function buildDateRangeFormula(monthTitles) {
  const last = lastRegisterColumn();
  const dateCol = REGISTER_HEADERS.length;
  const stack = monthTitles.map(t => `${quoteTabTitle(t)}!A2:${last}`).join(';');
  const bloodLast = String.fromCharCode(64 + BLOOD_DATA_HEADERS.length);
  const childMatch = (names) => `($B$4="${ALL_CHILDREN}")+(${names}=$B$4)`;
  const headerRow = `{${BLOOD_DATA_HEADERS.map(h => `"${h}"`).join(',')}}`;
  return `=LET(rows,{${stack}},d,INDEX(rows,0,${dateCol}),n,INDEX(rows,0,1),` +
    `hit,FILTER(rows,d<>"",d>=$B$2,d<=$B$3,${childMatch('n')}),` +
    `checkups,IFERROR(SORT(hit,${dateCol},TRUE,1,TRUE),"${NO_CHECKUPS}"),` +
    `b,${quoteTabTitle(BLOOD_DATA_TAB_TITLE)}!A2:${bloodLast},bd,INDEX(b,0,2),bn,INDEX(b,0,1),` +
    `bf,FILTER(b,bd<>"",bd>=$B$2,bd<=$B$3,${childMatch('bn')}),` +
    // Dates and values as text so they keep their look whatever column they land in.
    `blood,IF(ISERROR(INDEX(bf,1,1)),"${NO_BLOOD_TESTS}",LET(bs,SORT(bf,2,TRUE,1,TRUE),ARRAYFORMULA(` +
    `HSTACK(INDEX(bs,0,1),TEXT(INDEX(bs,0,2),"dd mmm yyyy"),TO_TEXT(CHOOSECOLS(bs,SEQUENCE(1,${BLOOD_DATA_HEADERS.length - 2},3))))))),` +
    `IFNA(VSTACK(checkups,"","${BLOOD_SECTION_TITLE}",${headerRow},blood),""))`;
}

/** Number of visits the report shows. */
function buildDateRangeCountFormula() {
  const first = REPORT_HEADER_ROW + 1;
  return `=IF(A${first}="${NO_CHECKUPS}",0,MATCH("${BLOOD_SECTION_TITLE}",A${first}:A,0)-2)`;
}

/** Number of blood test reports the report shows. */
function buildBloodCountFormula() {
  const first = REPORT_HEADER_ROW + 1;
  const title = `MATCH("${BLOOD_SECTION_TITLE}",A${first}:A,0)`;
  // Text rows: checkups (or the message), the section title, its header, then one per report.
  return `=IFERROR(IF(INDEX(A${first}:A,${title}+2)="${NO_BLOOD_TESTS}",0,COUNTIF(A${first}:A,"?*")-${title}),0)`;
}

/** 'YYYY-MM' -> 'September 2026' */
function monthTabTitle(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** 'September 2026' -> '2026-09', or null for a tab that is not a month tab. */
function parseMonthTabTitle(title) {
  const match = /^([A-Za-z]+) (\d{4})$/.exec(String(title || '').trim());
  if (!match) return null;
  const idx = MONTH_NAMES.findIndex(m => m.toLowerCase() === match[1].toLowerCase());
  if (idx === -1) return null;
  return `${match[2]}-${String(idx + 1).padStart(2, '0')}`;
}

/** Normalize a record date to 'YYYY-MM-DD', or null if it is missing or unparseable. */
function normalizeDate(value) {
  const str = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return null;
}

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

/** Staff type "None", "no", "nil" or "-" into empty clinical fields; treat those as blank. */
function meaningful(value) {
  const str = text(value);
  return /^(none|no|nil|na|n\/a|-+|—)$/i.test(str) ? '' : str;
}

/**
 * Group every visit by month.
 *
 * @param {{children?: object[], appointments?: object[], growth?: object[], medicines?: object[]}} data
 * @returns {Map<string, string[][]>} 'YYYY-MM' -> rows matching REGISTER_HEADERS,
 *   sorted by date then child name. Months with no visits are absent.
 */
function buildMonthlyRegister({ children = [], appointments = [], growth = [], medicines = [] } = {}) {
  const byId = new Map();
  const byName = new Map();
  children.filter(Boolean).forEach(c => {
    if (c.id) byId.set(String(c.id).trim(), c);
    if (c.name) byName.set(c.name.trim().toLowerCase(), c);
  });

  // Resolve a record to a roster child so a renamed child shows their current
  // name, and so records of removed children do not reappear in the register.
  const resolveChild = (rec) => {
    const id = text(rec.childId);
    if (id && byId.has(id)) return byId.get(id);
    const name = text(rec.childName || rec.child).toLowerCase();
    if (name && byName.has(name)) return byName.get(name);
    return null;
  };

  // key: `${childId}|${date}` -> visit rows for that child on that day
  const visits = new Map();
  const addVisit = (child, date, fields) => {
    const key = `${child.id || child.name}|${date}`;
    const visit = { child, date, type: '', clinic: '', doctor: '', prescriptions: [], notes: [], ...fields };
    if (!visits.has(key)) visits.set(key, []);
    visits.get(key).push(visit);
    return visit;
  };
  const firstVisit = (child, date) => (visits.get(`${child.id || child.name}|${date}`) || [])[0];

  // An edited appointment can exist twice after a sync merge (same id, new
  // date/type). The later copy is the edit, so keep the last one per id.
  const latestAppointments = new Map();
  appointments.filter(Boolean).forEach((appt, i) => {
    latestAppointments.set(appt.id ? `id:${appt.id}` : `idx:${i}`, appt);
  });

  // 1. Appointments define the visit and its checkup type.
  latestAppointments.forEach(appt => {
    if (text(appt.status).toLowerCase() === 'cancelled') return;
    const date = normalizeDate(appt.date);
    const child = resolveChild(appt);
    if (!date || !child) return;

    const type = text(appt.type) || 'Appointment';
    const vaccine = text(appt.vaccineName);
    addVisit(child, date, {
      type: vaccine ? `${type} — ${vaccine}` : type,
      clinic: text(appt.clinicName),
      doctor: text(appt.doctorName),
      notes: text(appt.notes) ? [text(appt.notes)] : []
    });
  });

  // 2. Clinical checkups add the clinic, doctor, prescription and complaint to that
  //    day's visit, or stand as their own visit when nothing was booked. The clinic
  //    and doctor on the checkup win over the booking: they record who was seen.
  growth.filter(Boolean).forEach(g => {
    const date = normalizeDate(g.date);
    const child = resolveChild(g);
    if (!date || !child) return;

    const prescription = meaningful(g.prescription || g.medication);
    const complaint = meaningful(g.complaint || g.symptoms);
    const isClinical = text(g.prescription || g.medication) || text(g.complaint || g.symptoms) || text(g.temperature || g.temp) ||
      text(g.bp || g.bloodPressure) || text(g.pulse || g.pulseRate) || text(g.spo2) ||
      text(g.eyeCheckup || g.eyeRemarks);

    let visit = firstVisit(child, date);
    if (!visit) {
      if (isClinical) {
        visit = addVisit(child, date, { type: 'Clinical Checkup' });
      } else {
        // Height/weight only: a growth measurement, not a clinical visit.
        const measured = [text(g.height) && `Height ${text(g.height)} cm`, text(g.weight) && `Weight ${text(g.weight)} kg`].filter(Boolean);
        if (measured.length === 0) return;
        addVisit(child, date, {
          type: 'Growth Measurement',
          clinic: text(g.clinicName),
          doctor: text(g.doctorName),
          notes: [measured.join(', ')]
        });
        return;
      }
    }
    visit.clinic = text(g.clinicName) || visit.clinic;
    visit.doctor = text(g.doctorName) || visit.doctor;
    if (prescription) visit.prescriptions.push(prescription);
    if (complaint) visit.notes.push(`Complaint: ${complaint}`);
  });

  // 3. Prescriptions page entries join the visit on their start date.
  medicines.filter(Boolean).forEach(m => {
    const date = normalizeDate(m.startDate || m.date);
    const child = resolveChild(m);
    const name = text(m.medicineName || m.name);
    if (!date || !child || !name) return;

    const detail = [name, text(m.dosage)].filter(Boolean).join(' ');
    const line = text(m.frequency) ? `${detail} (${text(m.frequency)})` : detail;
    const visit = firstVisit(child, date) || addVisit(child, date, { type: 'Prescription' });
    visit.prescriptions.push(line);
  });

  const byMonth = new Map();
  Array.from(visits.values()).flat()
    .sort((a, b) => a.date.localeCompare(b.date) || text(a.child.name).localeCompare(text(b.child.name)))
    .forEach(v => {
      const monthKey = v.date.slice(0, 7);
      if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
      byMonth.get(monthKey).push([
        text(v.child.name),
        v.type,
        v.clinic,
        v.doctor,
        v.prescriptions.join('; '),
        v.notes.join(' | '),
        v.date
      ]);
    });

  return byMonth;
}

module.exports = {
  REGISTER_HEADERS,
  BLOOD_DATA_TAB_TITLE,
  BLOOD_DATA_HEADERS,
  BLOOD_SECTION_TITLE,
  bloodDataRows,
  buildBloodCountFormula,
  REPORT_TAB_TITLE,
  REPORT_HEADER_ROW,
  ALL_CHILDREN,
  buildDateRangeFormula,
  buildDateRangeCountFormula,
  todayKey,
  currentMonthKey,
  monthTabTitle,
  parseMonthTabTitle,
  buildMonthlyRegister
};
