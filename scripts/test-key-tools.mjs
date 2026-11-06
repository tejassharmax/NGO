// Checks scripts/lib/keyTools.js: reading IDs back from a master directory
// sheet, as the recovery tool does when the encryption key is lost.
// Run: node scripts/test-key-tools.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseCSV, idsFromSheetRows } = require('./lib/keyTools.js');

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`PASS ${name}`);
  else { failures++; console.log(`FAIL ${name}\n  expected ${e}\n  got      ${a}`); }
}

const header = ['ID', 'Child Name', 'Aadhaar ID', 'Insurance ID', 'Insurer', 'Insurance Valid From', 'Insurance Valid To', 'Insurance Status', 'All Insurance Entries'];

// As Google's CSV download writes it: quoted cells, a line break inside one.
const csv = [
  header.join(','),
  'CH-1,Asha,1234 5678 9012,PMJAY-NEW,Ayushman Bharat (PM-JAY),2026-04-01,2027-03-31,Active,"PMJAY-NEW · Ayushman Bharat (PM-JAY) · 2026-04-01 to 2027-03-31',
  'PMJAY-OLD · Ayushman Bharat (PM-JAY) · 2025-04-01 to 2026-03-31"',
  'CH-2,"Rao, Ishaan",,,,,,,',
  'CH-3,Kabir,,ICICI-9,ICICI Lombard,,,Active,ICICI-9 · ICICI Lombard · dates not set',
  'CH-4,Meera,,"=HYPERLINK(""x"",""y"")",+cmd,2026-01-01,…,Active,"=HYPERLINK(""x"",""y"") · +cmd · 2026-01-01 to …"'
].join('\r\n');

const rows = parseCSV(csv);
check('CSV: quoted cell with a line break stays one cell', rows.length, 5);
check('CSV: comma inside quotes stays in the cell', rows[2][1], 'Rao, Ishaan');

const ids = idsFromSheetRows(rows);
check('Aadhaar read by child id', ids.get('CH-1').idNumber, '1234 5678 9012');
check('every insurance entry read, with dates', ids.get('CH-1').insurance, [
  { number: 'PMJAY-NEW', insurer: 'Ayushman Bharat (PM-JAY)', startDate: '2026-04-01', expiryDate: '2027-03-31' },
  { number: 'PMJAY-OLD', insurer: 'Ayushman Bharat (PM-JAY)', startDate: '2025-04-01', expiryDate: '2026-03-31' }
]);
check('child without IDs gives empty values', ids.get('CH-2'), { idNumber: '', insurance: [] });
check('"dates not set" gives empty dates', ids.get('CH-3').insurance[0], { number: 'ICICI-9', insurer: 'ICICI Lombard', startDate: '', expiryDate: '' });
check('formula-like text is read as text; open end date is empty', ids.get('CH-4').insurance[0], { number: '=HYPERLINK("x","y")', insurer: '+cmd', startDate: '2026-01-01', expiryDate: '' });

// As the Sheets API returns it (no CSV), with the protective apostrophe already removed.
const apiRows = [header, ['CH-9', 'X', "'0001 0002 0003", 'A-1', 'Star', '2026-01-01', '2026-12-31', 'Active', '']];
check('falls back to the current-policy columns when the list cell is empty', idsFromSheetRows(apiRows).get('CH-9'),
  { idNumber: '0001 0002 0003', insurance: [{ number: 'A-1', insurer: 'Star', startDate: '2026-01-01', expiryDate: '2026-12-31' }] });

console.log(failures ? `\n${failures} failing` : '\nAll passing');
process.exit(failures ? 1 : 0);
