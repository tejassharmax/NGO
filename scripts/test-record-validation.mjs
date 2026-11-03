// Checks the server-side rules in js/server/recordValidation.js and that
// /api/sync's merge applies them to child records.
// Run: node scripts/test-record-validation.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isISODate, sanitizeInsurance, MAX_INSURANCE_ENTRIES, MAX_TEXT_LENGTH } = require('../js/server/recordValidation.js');
const { mergeNamespace } = require('../js/server/syncMerge.js');

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`PASS ${name}`);
  else { failures++; console.log(`FAIL ${name}\n  expected ${e}\n  got      ${a}`); }
}

const valid = { id: 'INS-1', number: 'PMJAY-1234', insurer: 'Ayushman Bharat (PM-JAY)', startDate: '2026-04-01', expiryDate: '2027-03-31' };

check('real dates pass', ['2026-04-01', '2024-02-29'].map(isISODate), [true, true]);
check('impossible or malformed dates fail',
  ['2026-02-30', '2025-02-29', '2026-13-01', '01-04-2026', '2026-4-1', '', null, 20260401].map(isISODate),
  [false, false, false, false, false, false, false, false]);

check('a valid entry is kept as is', sanitizeInsurance([valid]), [valid]);
check('not an array becomes empty', [null, 'x', { 0: valid }, 42].map(sanitizeInsurance), [[], [], [], []]);
check('non-object entries are dropped', sanitizeInsurance([null, 'PMJAY', 7, [valid], valid]), [valid]);
check('entry without an ID is dropped', sanitizeInsurance([{ ...valid, number: '   ' }]), []);
check('expiry before start is dropped', sanitizeInsurance([{ ...valid, startDate: '2026-06-01', expiryDate: '2026-01-01' }]), []);
check('same start and expiry day is allowed', sanitizeInsurance([{ ...valid, expiryDate: valid.startDate }]).length, 1);
check('invalid dates are cleared, entry kept',
  sanitizeInsurance([{ ...valid, startDate: '2026-02-30', expiryDate: 'soon' }]),
  [{ ...valid, startDate: '', expiryDate: '' }]);
check('unknown fields are removed',
  Object.keys(sanitizeInsurance([{ ...valid, note: 'x', __proto__: { y: 1 }, extra: { a: 1 } }])[0]),
  ['id', 'number', 'insurer', 'startDate', 'expiryDate']);
check('text is trimmed, control characters removed, length capped',
  sanitizeInsurance([{ ...valid, number: '  AB\u0000C\n12  ', insurer: 'x'.repeat(500) }]).map(e => [e.number, e.insurer.length]),
  [['ABC12', MAX_TEXT_LENGTH]]);
check('non-text values are not stored as text',
  sanitizeInsurance([{ ...valid, insurer: { $gt: '' } }])[0].insurer, '');
check('duplicate or missing ids get a fresh id',
  new Set(sanitizeInsurance([valid, valid, { ...valid, id: '' }]).map(e => e.id)).size, 3);
check(`at most ${MAX_INSURANCE_ENTRIES} entries`,
  sanitizeInsurance(Array.from({ length: 50 }, (_, i) => ({ ...valid, id: `I${i}` }))).length, MAX_INSURANCE_ENTRIES);

// Through the /api/sync merge
const sent = [
  { id: 'CH-1', name: 'A', insurance: [valid, { number: '', insurer: 'junk' }, { ...valid, id: 'X', expiryDate: '2020-01-01' }] },
  { id: 'CH-2', name: 'B' },
  { id: 'CH-3', name: 'C', insurance: 'not a list' }
];
const stored = JSON.parse(mergeNamespace({ 'chm-children': JSON.stringify(sent) }, {})['chm-children']);
check('sync keeps valid insurance only', stored[0].insurance, [valid]);
check('sync leaves records without insurance untouched', stored[1], sent[1]);
check('sync replaces malformed insurance with an empty list', stored[2].insurance, []);

console.log(failures ? `\n${failures} failing` : '\nAll passing');
process.exit(failures ? 1 : 0);
