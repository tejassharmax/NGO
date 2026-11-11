// Ask Ayusha sources: sensitive cells are blanked before anything reaches the model.
// Run: node scripts/test-assistant-sources.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { redactRows, definitions } = require('../js/server/assistant/sources.js');

let failed = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; };

// A master-directory style table.
const table = redactRows([
  ['Child ID', 'Name', 'Aadhaar ID', 'Contact Phone', 'Height (cm)', 'Insurance ID', 'Insurer', 'All Insurance Entries'],
  ['CH-1', 'Kavya Menon', '1234 5678 9012', '9876543210', '131', 'AYU-77-XYZ', 'Ayushman Bharat', 'AYU-77-XYZ, Ayushman, 2026-01-01 to 2027-01-01']
]);
check('header row kept', table[0][2] === 'Aadhaar ID' && table[0][5] === 'Insurance ID');
check('aadhaar column hidden', table[1][2] === '[hidden]');
check('phone column hidden', table[1][3] === '[hidden]');
check('insurance id column hidden', table[1][5] === '[hidden]');
check('all insurance entries hidden', table[1][7] === '[hidden]');
check('name, height and insurer kept', table[1][1] === 'Kavya Menon' && table[1][4] === '131' && table[1][6] === 'Ayushman Bharat');

// A label/value layout, like a per-child tab.
const form = redactRows([
  ['Name', 'Kavya Menon'],
  ['Aadhaar', '1234-5678-9012'],
  ['Guardian email', 'someone@example.com'],
  ['Notes', 'Call 9123456789 or mail a.b@c.org; Aadhaar 4321 8765 2109']
]);
check('label/value aadhaar hidden', form[1][1] === '[hidden]');
check('label/value email hidden', form[2][1] === '[hidden]');
check('numbers inside free text scrubbed', !/9123456789|a\.b@c\.org|4321 8765 2109/.test(form[3][1]));
check('ordinary values kept', form[0][1] === 'Kavya Menon');

// Dates and lab values must not look like ID numbers.
const values = redactRows([['Date', 'WBC', 'Platelets'], ['2026-11-10', '7800', '2.5']]);
check('dates and lab values untouched', values[1].join('|') === '2026-11-10|7800|2.5');

check('a home has five sources', definitions(false).map(d => d.id).join() === 'directory,medical,monthly,blood,calendar');
check('a family has no monthly register', !definitions(true).some(d => d.id === 'monthly'));

if (failed) { console.log(`${failed} failing`); process.exit(1); }
console.log('All passing');
