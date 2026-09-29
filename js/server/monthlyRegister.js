/**
 * monthlyRegister.js
 * Builds the "Monthly Checkup Register": one row per child per visit, grouped by
 * month, for every child in the NGO.
 *
 * A visit is identified by (child, date) and assembled from three collections:
 *   chm-appointments  the checkup type, vaccination name and appointment notes
 *   chm-growth        the clinical checkup: complaint and prescription
 *   chm-medicines     prescriptions added on the Prescriptions page
 * so a checkup booked in the calendar and filled in afterwards lands on one row.
 * A child can have several visits in a month (illness, infection, follow-up);
 * each date is its own row.
 *
 * Pure functions only. The Google Sheets I/O lives in googleOAuth.js.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const REGISTER_HEADERS = ['NAME OF CHILD', 'CHECKUP TYPE', 'PRESCRIPTION', 'NOTES', 'DATE'];

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
    const visit = { child, date, type: '', prescriptions: [], notes: [], ...fields };
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
      notes: text(appt.notes) ? [text(appt.notes)] : []
    });
  });

  // 2. Clinical checkups add the prescription and complaint to that day's visit,
  //    or stand as their own visit when nothing was booked.
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
        addVisit(child, date, { type: 'Growth Measurement', notes: [measured.join(', ')] });
        return;
      }
    }
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
        v.prescriptions.join('; '),
        v.notes.join(' | '),
        v.date
      ]);
    });

  return byMonth;
}

module.exports = {
  REGISTER_HEADERS,
  currentMonthKey,
  monthTabTitle,
  parseMonthTabTitle,
  buildMonthlyRegister
};
