// Checks the insurance columns in the master directory sheet (Sheet1), and that
// adding them leaves every existing column, and the pull's reading of them,
// exactly as before.
// Run: node scripts/test-sheet-insurance.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { masterDirectoryTable, masterColumnIndexes, INSURANCE_HEADERS } = require('../js/server/googleOAuth.js');

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`PASS ${name}`);
  else { failures++; console.log(`FAIL ${name}\n  expected ${e}\n  got      ${a}`); }
}

// The directory headers as they were before insurance was added.
const HOME_HEADERS_BEFORE = [
  'ID', 'Child Name', 'Date of Birth', 'Age', 'Gender', 'Blood Group',
  'Aadhaar ID', 'Guardian', 'Contact Phone', 'Height (cm)', 'Weight (kg)',
  'Medical Conditions', 'Allergies', 'Status', 'Registration Date',
  'Current Medications', 'Dental Remarks', 'Oral Hygiene Index'
];
const FAMILY_HEADERS_BEFORE = [
  'Member ID', 'Name', 'Relation', 'Date of Birth', 'Age', 'Gender', 'Blood Group',
  'Phone', 'Height (cm)', 'Weight (kg)', 'Medical Conditions', 'Allergies',
  'Current Medications', 'Status', 'Added On'
];

const child = {
  id: 'CH-1001', name: 'Asha Test', dob: '2015-06-01', gender: 'Female', blood: 'O+', idNumber: '1234',
  father: 'Guardian', phone: '+91 90000 00000', status: 'Active', registeredDate: '2024-01-01',
  insurance: [
    { id: 'A', number: 'PMJAY-OLD', insurer: 'Ayushman Bharat (PM-JAY)', startDate: '2025-04-01', expiryDate: '2026-03-31' },
    { id: 'B', number: 'PMJAY-NEW', insurer: 'Ayushman Bharat (PM-JAY)', startDate: '2026-04-01', expiryDate: '2027-03-31' }
  ]
};
const noInsurance = { id: 'CH-1002', name: 'No Cover', status: 'Active', registeredDate: '2024-01-01' };
const injected = { id: 'CH-1003', name: 'Inject', insurance: [{ id: 'X', number: '=IMPORTXML("http://x","//a")', insurer: '+cmd', startDate: '2026-01-01', expiryDate: '' }] };

for (const [label, family, before] of [['home', false, HOME_HEADERS_BEFORE], ['family', true, FAMILY_HEADERS_BEFORE]]) {
  const [headers, ...rows] = masterDirectoryTable([child, noInsurance, injected], family);
  const n = before.length;

  check(`${label}: existing headers unchanged and first`, headers.slice(0, n), before);
  check(`${label}: insurance headers appended at the end`, headers.slice(n), INSURANCE_HEADERS);
  check(`${label}: fits the A:Z range the sync clears and reads`, headers.length <= 26, true);
  check(`${label}: every row has a cell per header`, rows.every(r => r.length === headers.length), true);

  // The pull must find every existing field in the same column as before.
  const beforeMap = masterColumnIndexes(before);
  const afterMap = masterColumnIndexes(headers);
  check(`${label}: pull reads the same columns as before`, afterMap, beforeMap);
  check(`${label}: pull never reads an insurance column`,
    Object.values(afterMap).filter(i => i >= n).length, 0);

  // Existing cells are produced exactly as before (same inputs, untouched columns).
  const withoutInsurance = masterDirectoryTable([{ ...child, insurance: undefined }, noInsurance, { ...injected, insurance: undefined }], family);
  check(`${label}: existing cells identical with or without insurance`,
    rows.map(r => r.slice(0, n)), withoutInsurance.slice(1).map(r => r.slice(0, n)));

  const ins = rows[0].slice(n);
  const col = i => {
    let x = n + i + 1, s = '';
    while (x > 0) { const r = (x - 1) % 26; s = String.fromCharCode(65 + r) + s; x = Math.floor((x - 1) / 26); }
    return s;
  };
  check(`${label}: current policy shown (active one, not the expired one)`, ins.slice(0, 4),
    ['PMJAY-NEW', 'Ayushman Bharat (PM-JAY)', '2026-04-01', '2027-03-31']);
  check(`${label}: status is a live formula on this row's own cells`, ins[4],
    `=IF(${col(0)}2="","",IF(AND(${col(3)}2<>"",${col(3)}2<TODAY()),"Expired",IF(AND(${col(2)}2<>"",${col(2)}2>TODAY()),"Upcoming","Active")))`);
  check(`${label}: all entries listed, current first`, ins[5],
    'PMJAY-NEW · Ayushman Bharat (PM-JAY) · 2026-04-01 to 2027-03-31\nPMJAY-OLD · Ayushman Bharat (PM-JAY) · 2025-04-01 to 2026-03-31');
  check(`${label}: no insurance gives empty cells`, rows[1].slice(n), ['', '', '', '', '', '']);
  check(`${label}: text that looks like a formula is kept as text`, rows[2].slice(n, n + 2), [`'=IMPORTXML("http://x","//a")`, "'+cmd"]);
  check(`${label}: third row's formula points at row 4`, rows[2][n + 4].includes(`${col(0)}4`), true);
}

console.log(failures ? `\n${failures} failing` : '\nAll passing');
process.exit(failures ? 1 : 0);
