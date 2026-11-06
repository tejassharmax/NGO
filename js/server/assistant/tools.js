/**
 * assistant/tools.js
 * Read-only tools the assistant model may call. Each one reads the caller's own
 * space (tenant) and returns plain facts; all counting, filtering and date maths
 * happens here in code, never in the model.
 *
 * Data minimisation: Aadhaar and insurance numbers, phone numbers, addresses and
 * email addresses are never returned. Every child in a result carries its id so
 * the answer can link to the record.
 */

/** Today in India, YYYY-MM-DD. */
function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function ageYears(dob, on = today()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dob || ''))) return null;
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = on.split('-').map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age--;
  return age;
}

function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(iso, months) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

const inRange = (date, from, to) => !!date && (!from || date >= from) && (!to || date <= to);
const text = v => (v === null || v === undefined ? '' : String(v).trim());

function insuranceStatus(entry, on) {
  if (entry.startDate && entry.startDate > on) return 'Upcoming';
  if (entry.expiryDate && entry.expiryDate < on) return 'Expired';
  return 'Active';
}

/** The parts of a child record any tool may show. */
function childBasics(c) {
  return {
    id: c.id,
    name: text(c.name),
    age: ageYears(c.dob),
    dateOfBirth: text(c.dob),
    gender: text(c.gender),
    bloodGroup: text(c.blood),
    status: text(c.status) || 'Active',
    medicalConditions: text(c.medicalConditions),
    allergies: text(c.allergies),
    currentMedications: text(c.medications)
  };
}

/** Find one child by id or by (part of) the name. */
function resolveChild(data, ref) {
  const q = text(ref).toLowerCase();
  if (!q) return { error: 'Give a child name or id.' };
  const byId = data.children.find(c => String(c.id).toLowerCase() === q);
  if (byId) return { child: byId };
  const matches = data.children.filter(c => text(c.name).toLowerCase().includes(q));
  if (matches.length === 1) return { child: matches[0] };
  if (matches.length > 1) return { error: 'More than one child matches.', candidates: matches.map(c => ({ id: c.id, name: c.name })) };
  return { error: `No child matches "${ref}".` };
}

const BLOOD_FIELDS = {
  hemoglobin: 'Haemoglobin (g/dL)', wbc: 'WBC (/cumm)', platelets: 'Platelets (lakhs/cumm)', rbc: 'RBC (million/uL)',
  pcv: 'PCV (%)', mcv: 'MCV (fL)', mch: 'MCH (pg)', mchc: 'MCHC (g/dL)', esr: 'ESR (mm/hr)',
  neutrophils: 'Neutrophils (%)', lymphocytes: 'Lymphocytes (%)', monocytes: 'Monocytes (%)', eosinophils: 'Eosinophils (%)', basophils: 'Basophils (%)'
};

const TOOLS = [
  {
    name: 'list_children',
    description: 'List children in this home, optionally filtered. Returns basic profile facts (no ID numbers or contact details).',
    parameters: {
      type: 'object',
      properties: {
        gender: { type: 'string', description: 'Male, Female or Other' },
        blood_group: { type: 'string', description: 'e.g. O+, B-' },
        min_age: { type: 'number' },
        max_age: { type: 'number' },
        status: { type: 'string', description: 'e.g. Active' }
      }
    },
    run(data, a) {
      const rows = data.children.map(childBasics).filter(c =>
        (!a.gender || c.gender.toLowerCase() === String(a.gender).toLowerCase()) &&
        (!a.blood_group || c.bloodGroup.toUpperCase() === String(a.blood_group).toUpperCase()) &&
        (a.min_age === undefined || (c.age !== null && c.age >= a.min_age)) &&
        (a.max_age === undefined || (c.age !== null && c.age <= a.max_age)) &&
        (!a.status || c.status.toLowerCase() === String(a.status).toLowerCase()));
      return { count: rows.length, children: rows };
    }
  },
  {
    name: 'get_child_profile',
    description: "One child's profile: basics, latest checkup, latest blood test, current medicines and insurance status (insurer and dates only).",
    parameters: { type: 'object', properties: { child: { type: 'string', description: 'Child name or id' } }, required: ['child'] },
    run(data, a) {
      const r = resolveChild(data, a.child);
      if (!r.child) return r;
      const c = r.child, on = today();
      const checkups = data.growth.filter(g => g.childId === c.id).sort((x, y) => text(y.date).localeCompare(text(x.date)));
      const blood = data.health.filter(h => h.childId === c.id).sort((x, y) => text(y.date).localeCompare(text(x.date)));
      const meds = data.medicines.filter(m => m.childId === c.id && text(m.status).toLowerCase() !== 'completed');
      return {
        ...childBasics(c),
        registeredOn: text(c.registeredDate),
        guardian: text(c.father || c.guardian),
        latestCheckup: checkups[0] ? checkupFacts(checkups[0]) : null,
        checkupCount: checkups.length,
        latestBloodTest: blood[0] ? bloodFacts(blood[0]) : null,
        bloodTestCount: blood.length,
        // "state" comes from the dates: a course whose end date has passed is not current,
        // even if nobody marked it completed.
        medicines: meds.map(m => {
          const to = text(m.endDate);
          return { medicine: text(m.medicineName), dosage: text(m.dosage), frequency: text(m.frequency), from: text(m.startDate), to, state: to && to < on ? `course ended ${to}` : 'ongoing' };
        }),
        insurance: (c.insurance || []).map(e => ({ insurer: text(e.insurer), validFrom: text(e.startDate), validTo: text(e.expiryDate), status: insuranceStatus(e, on) }))
      };
    }
  },
  {
    name: 'get_checkups',
    description: 'Checkup records (vitals, complaint, prescription, doctor), newest first. Filter by child and/or date range.',
    parameters: {
      type: 'object',
      properties: {
        child: { type: 'string', description: 'Child name or id (omit for all children)' },
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' }
      }
    },
    run(data, a) {
      let childId = null;
      if (a.child) { const r = resolveChild(data, a.child); if (!r.child) return r; childId = r.child.id; }
      const rows = data.growth.filter(g => (!childId || g.childId === childId) && inRange(text(g.date), a.from, a.to))
        .sort((x, y) => text(y.date).localeCompare(text(x.date))).map(checkupFacts);
      return { count: rows.length, checkups: rows.slice(0, 60), truncated: rows.length > 60 };
    }
  },
  {
    name: 'overdue_checkups',
    description: 'Children whose last checkup is older than the given number of months (default 6), or who have none.',
    parameters: { type: 'object', properties: { months: { type: 'number', description: 'Default 6' } } },
    run(data, a) {
      const months = Number(a.months) > 0 ? Number(a.months) : 6, on = today(), cutoff = addMonths(on, -months);
      const rows = data.children.map(c => {
        const last = data.growth.filter(g => g.childId === c.id && g.date).map(g => g.date).sort().pop() || null;
        return { childId: c.id, name: text(c.name), lastCheckup: last, dueSince: last ? addMonths(last, months) : 'never checked' };
      }).filter(r => !r.lastCheckup || r.lastCheckup < cutoff);
      return { today: on, rule: `no checkup since ${cutoff}`, count: rows.length, children: rows };
    }
  },
  {
    name: 'blood_test_values',
    description: 'Blood test (CBC) results over time. Filter by child, date range, and one parameter (hemoglobin, wbc, platelets, rbc, pcv, mcv, mch, mchc, esr, neutrophils, lymphocytes, monocytes, eosinophils, basophils).',
    parameters: {
      type: 'object',
      properties: {
        child: { type: 'string', description: 'Child name or id (omit for all children)' },
        parameter: { type: 'string' },
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' }
      }
    },
    run(data, a) {
      let childId = null;
      if (a.child) { const r = resolveChild(data, a.child); if (!r.child) return r; childId = r.child.id; }
      const param = a.parameter ? String(a.parameter).toLowerCase().replace(/[^a-z]/g, '').replace(/^haemoglobin$|^hb$/, 'hemoglobin') : null;
      if (param && !BLOOD_FIELDS[param]) return { error: `Unknown parameter "${a.parameter}".`, known: Object.keys(BLOOD_FIELDS) };
      const rows = data.health.filter(h => (!childId || h.childId === childId) && inRange(text(h.date), a.from, a.to))
        .sort((x, y) => text(x.date).localeCompare(text(y.date)))
        .map(h => param ? { childId: h.childId, name: childName(data, h.childId, h.childName), date: text(h.date), [param]: text(h[param]) || null, unit: BLOOD_FIELDS[param] } : bloodFacts(h));
      return { count: rows.length, results: rows };
    }
  },
  {
    name: 'insurance_overview',
    description: 'Insurance status for every child (Active, Upcoming, Expired, or none), with insurer and dates. Optionally only policies expiring within N days.',
    parameters: { type: 'object', properties: { expiring_within_days: { type: 'number' } } },
    run(data, a) {
      const on = today(), until = Number(a.expiring_within_days) > 0 ? addDays(on, Number(a.expiring_within_days)) : null;
      const rows = data.children.map(c => {
        const entries = (c.insurance || []).map(e => ({ insurer: text(e.insurer), validFrom: text(e.startDate), validTo: text(e.expiryDate), status: insuranceStatus(e, on) }));
        return { childId: c.id, name: text(c.name), insured: entries.some(e => e.status === 'Active'), policies: entries };
      });
      if (until) {
        const soon = rows.map(r => ({ ...r, policies: r.policies.filter(p => p.status === 'Active' && p.validTo && p.validTo <= until) })).filter(r => r.policies.length);
        return { today: on, expiringBy: until, count: soon.length, children: soon };
      }
      return { today: on, insuredCount: rows.filter(r => r.insured).length, total: rows.length, children: rows };
    }
  },
  {
    name: 'get_appointments',
    description: 'Appointments and vaccinations, by date range and/or child. Each has "when" (upcoming or past, from its date compared with today). For upcoming ones only, pass from = today.',
    parameters: {
      type: 'object',
      properties: {
        child: { type: 'string' },
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' }
      }
    },
    run(data, a) {
      let childId = null;
      const on = today();
      if (a.child) { const r = resolveChild(data, a.child); if (!r.child) return r; childId = r.child.id; }
      const rows = data.appointments.filter(p => (!childId || p.childId === childId) && inRange(text(p.date), a.from, a.to))
        .sort((x, y) => text(x.date).localeCompare(text(y.date)))
        .map(p => ({ childId: p.childId, name: childName(data, p.childId, p.childName), date: text(p.date), time: text(p.time), type: text(p.type), vaccine: text(p.vaccineName), doctor: text(p.doctorName || p.doctor), clinic: text(p.clinicName), when: text(p.date) >= on ? 'upcoming' : 'past', recordedStatus: text(p.status) }));
      return { today: on, count: rows.length, appointments: rows };
    }
  },
  {
    name: 'search_health_notes',
    description: 'Find children whose medical conditions, allergies, medications, checkup complaints or prescriptions mention a word (e.g. penicillin, asthma, fever).',
    parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    run(data, a) {
      const q = text(a.text).toLowerCase();
      if (q.length < 2) return { error: 'Give a longer search word.' };
      const hits = [];
      data.children.forEach(c => {
        const where = [];
        [['medical conditions', c.medicalConditions], ['allergies', c.allergies], ['current medications', c.medications]]
          .forEach(([f, v]) => { if (text(v).toLowerCase().includes(q)) where.push({ field: f, text: text(v) }); });
        data.growth.filter(g => g.childId === c.id).forEach(g => {
          [['complaint', g.complaint], ['prescription', g.prescription]].forEach(([f, v]) => { if (text(v).toLowerCase().includes(q)) where.push({ field: `checkup ${f} (${text(g.date)})`, text: text(v) }); });
        });
        if (where.length) hits.push({ childId: c.id, name: text(c.name), matches: where });
      });
      return { searchedFor: a.text, count: hits.length, children: hits };
    }
  }
];

function childName(data, id, fallback) {
  const c = data.children.find(x => x.id === id);
  return c ? text(c.name) : text(fallback);
}

function checkupFacts(g) {
  return {
    childId: g.childId, date: text(g.date), temperatureF: text(g.temperature) || null, bp: text(g.bp) || null,
    weightKg: text(g.weight) || null, heightCm: text(g.height) || null, pulse: text(g.pulse) || null, spo2: text(g.spo2) || null,
    eyeCheckup: text(g.eyeCheckup) || null, complaint: text(g.complaint) || null, prescription: text(g.prescription) || null,
    doctor: text(g.doctorName) || null, clinic: text(g.clinicName) || null
  };
}

function bloodFacts(h) {
  const out = { childId: h.childId, date: text(h.date), test: text(h.recordType) };
  Object.keys(BLOOD_FIELDS).forEach(k => { if (text(h[k])) out[k] = text(h[k]); });
  return out;
}

/** The space's records, in the shape the tools read. */
function toolData(payload) {
  const arr = key => { try { const a = JSON.parse(payload[key] || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  return {
    children: arr('chm-children'),
    growth: arr('chm-growth'),
    health: arr('chm-health-records'),
    appointments: arr('chm-appointments'),
    medicines: arr('chm-medicines')
  };
}

function runTool(data, name, args) {
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) return { error: `Unknown tool ${name}` };
  try {
    return tool.run(data, args || {});
  } catch (err) {
    return { error: `Tool failed: ${err.message}` };
  }
}

module.exports = { TOOLS, runTool, toolData, today, ageYears };
