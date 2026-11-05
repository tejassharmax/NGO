// Checks js/server/fieldCrypto.js: AES-256-GCM encryption of IDs, masking to
// the last four characters, and the storage/browser round trip.
// Run: node scripts/test-field-crypto.mjs
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString('base64');
const require = createRequire(import.meta.url);
const fc = require('../js/server/fieldCrypto.js');

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`PASS ${name}`);
  else { failures++; console.log(`FAIL ${name}\n  expected ${e}\n  got      ${a}`); }
}

// Encryption
const c1 = fc.encrypt('1234 5678 9012');
const c2 = fc.encrypt('1234 5678 9012');
check('ciphertext is tagged and never contains the plain value', [c1.startsWith('enc:v1:'), c1.includes('9012')], [true, false]);
check('same value encrypts differently each time (random IV)', c1 !== c2, true);
check('decrypts back to the value', fc.decrypt(c1), '1234 5678 9012');
const parts = c1.split(':'); parts[4] = parts[4].slice(0, -2) + (parts[4].endsWith('AA') ? 'BB' : 'AA');
check('tampered ciphertext is rejected (GCM tag)', fc.decrypt(parts.join(':')), null);
check('plain legacy value passes through decrypt', fc.decrypt('PLAIN-1'), 'PLAIN-1');

// Masking
check('Aadhaar masked to last 4', fc.mask('1234 5678 9012'), '•••• •••• 9012');
check('policy number masked, separators kept', fc.mask('PMJAY-1234-5678'), '•••••-••••-5678');
check('short value fully masked', fc.mask('123'), '••••');
check('already masked stays as is', fc.mask('•••• 9012'), '•••• 9012');

// Storage <-> browser round trip
const child = { id: 'CH-1', name: 'A', idNumber: '1234 5678 9012', insurance: [{ id: 'I1', number: 'PMJAY-1234-5678', insurer: 'Ayushman' }] };
const stored = fc.protectForStorage(child, null);
check('stored record holds ciphertext for both IDs', [fc.isEncrypted(stored.idNumber), fc.isEncrypted(stored.insurance[0].number)], [true, true]);
check('stored record keeps other fields as they are', [stored.name, stored.insurance[0].insurer], ['A', 'Ayushman']);
check('original record is not modified', child.idNumber, '1234 5678 9012');

const server = fc.revealForServer(stored);
check('server reads real values', [server.idNumber, server.insurance[0].number], ['1234 5678 9012', 'PMJAY-1234-5678']);

const browser = fc.maskForClient(server);
check('browser gets masked values only', [browser.idNumber, browser.insurance[0].number], ['•••• •••• 9012', '•••••-••••-5678']);
check('browser copy contains no ciphertext or full value', JSON.stringify(browser).includes('enc:v1') || JSON.stringify(browser).includes('5678 9012'), false);

// Browser sends it back unchanged (masked)
const back = fc.unmaskFromStored([browser], [server])[0];
check('masked values are restored to real ones for the server', [back.idNumber, back.insurance[0].number], ['1234 5678 9012', 'PMJAY-1234-5678']);
const restored = fc.protectForStorage(back, stored);
check('unchanged IDs keep the stored ciphertext (no rewrite)', [restored.idNumber === stored.idNumber, restored.insurance[0].number === stored.insurance[0].number], [true, true]);
const directMasked = fc.protectForStorage(browser, stored);
check('a masked value reaching storage keeps the stored ciphertext', directMasked.idNumber, stored.idNumber);

// Browser changes a value
const edited = fc.protectForStorage({ ...back, idNumber: '9999 8888 7777' }, stored);
check('a new value is encrypted fresh', [edited.idNumber !== stored.idNumber, fc.decrypt(edited.idNumber)], [true, '9999 8888 7777']);
const cleared = fc.protectForStorage({ ...back, idNumber: '' }, stored);
check('clearing a value clears it', cleared.idNumber, '');

// Masked value with nothing stored is never saved
const orphan = fc.protectForStorage({ id: 'CH-2', idNumber: '•••• 1111', insurance: [{ id: 'X', number: '••••2222' }] }, null);
check('masked value with nothing stored is dropped, not saved', [orphan.idNumber, orphan.insurance.length], ['', 0]);

// Legacy plaintext in Firestore gets encrypted on the next write
const legacy = { id: 'CH-3', idNumber: '1111 2222 3333' };
const migrated = fc.protectForStorage(fc.revealForServer(legacy), legacy);
check('legacy plaintext is encrypted on next write', [fc.isEncrypted(migrated.idNumber), fc.decrypt(migrated.idNumber)], [true, '1111 2222 3333']);

// Payload helper
const payload = fc.maskPayload({ 'chm-children': JSON.stringify([server]), 'chm-growth': '[]' });
check('payload children masked, other keys untouched', [JSON.parse(payload['chm-children'])[0].idNumber, payload['chm-growth']], ['•••• •••• 9012', '[]']);

console.log(failures ? `\n${failures} failing` : '\nAll passing');
process.exit(failures ? 1 : 0);
