// Checks js/server/assistant/tools.js: the assistant's read-only tools give the
// right facts, and never hand the model an ID number, phone, address or email.
// Run: node scripts/test-assistant-tools.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TOOLS, runTool, toolData, today } = require('../js/server/assistant/tools.js');

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`PASS ${name}`);
  else { failures++; console.log(`FAIL ${name}\n  expected ${e}\n  got      ${a}`); }
}

const on = today();
const shift = (days) => {
  const d = new Date(on + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// Values that must never reach the model.
const SECRET = {
  aadhaar: '987654321098',
  policy: 'POLICY-55501',
  phone: '9800011122',
  emergencyPhone: '9800033344',
  address: '12 Hidden Lane',
  email: 'guardian@hidden.example'
};

const payload = {
  'chm-children': JSON.stringify([
    {
      id: 'CH-T1', name: 'Asha Verma', dob: '2016-05-01', gender: 'Female', blood: 'O+', allergies: 'Peanuts',
      idNumber: SECRET.aadhaar, phone: SECRET.phone, emergencyPhone: SECRET.emergencyPhone, address: SECRET.address, email: SECRET.email,
      insurance: [{ id: `INS-1-${SECRET.policy}`, number: SECRET.policy, insurer: 'Star Health', startDate: shift(-300), expiryDate: shift(30) }]
    },
    { id: 'CH-T2', name: 'Dev Nair', dob: '2015-01-10', gender: 'Male', blood: 'A+' }
  ]),
  'chm-growth': JSON.stringify([
    { childId: 'CH-T1', date: shift(-20), weight: '25', complaint: 'Cough' },
    { childId: 'CH-T2', date: shift(-400), weight: '30' }
  ]),
  'chm-health-records': JSON.stringify([{ childId: 'CH-T1', date: shift(-20), hemoglobin: '12.1' }]),
  'chm-appointments': JSON.stringify([
    { childId: 'CH-T1', date: shift(-5), type: 'Doctor visit', status: 'Upcoming' },
    { childId: 'CH-T2', date: shift(5), type: 'Vaccination', status: 'Upcoming' }
  ]),
  'chm-medicines': JSON.stringify([
    { childId: 'CH-T1', medicineName: 'Syrup A', startDate: shift(-30), endDate: shift(-1), status: 'Active' },
    { childId: 'CH-T1', medicineName: 'Syrup B', startDate: shift(-3), endDate: shift(10), status: 'Active' }
  ])
};
const data = toolData(payload);

// Facts
const overdue = runTool(data, 'overdue_checkups', {});
check('overdue: only the child last checked over 6 months ago', overdue.children.map(c => c.childId), ['CH-T2']);

const appts = runTool(data, 'get_appointments', {});
check('appointments: "when" comes from the date, not the stored status', appts.appointments.map(a => a.when), ['past', 'upcoming']);

const profile = runTool(data, 'get_child_profile', { child: 'Asha' });
check('profile: a course past its end date is not ongoing', profile.medicines.map(m => m.state), [`course ended ${shift(-1)}`, 'ongoing']);
check('profile: insurance status from dates', profile.insurance.map(i => i.status), ['Active']);

const expiring = runTool(data, 'insurance_overview', { expiring_within_days: 60 });
check('insurance: policy ending in 30 days is listed', expiring.children.map(c => c.childId), ['CH-T1']);

const hb = runTool(data, 'blood_test_values', { parameter: 'Hb' });
check('blood: "Hb" means hemoglobin', hb.results.map(r => r.hemoglobin), ['12.1']);

const notes = runTool(data, 'search_health_notes', { text: 'peanut' });
check('notes: finds the allergy', notes.children.map(c => c.childId), ['CH-T1']);

check('unknown child gives an error, not a guess', 'error' in runTool(data, 'get_child_profile', { child: 'Nobody Here' }), true);
check('unknown tool gives an error', 'error' in runTool(data, 'delete_child', {}), true);

// Data minimisation: run every tool, with and without a child, and look for the secrets.
const outputs = [];
for (const tool of TOOLS) {
  for (const args of [{}, { child: 'CH-T1' }, { child: 'Asha Verma', text: 'a', parameter: 'hemoglobin', months: 1, expiring_within_days: 400 }]) {
    outputs.push(JSON.stringify(runTool(data, tool.name, args)));
  }
}
const all = outputs.join('\n');
for (const [field, value] of Object.entries(SECRET)) {
  check(`no ${field} in any tool result`, all.includes(value), false);
}

if (failures) { console.log(`${failures} failing`); process.exit(1); }
console.log('All passing');
