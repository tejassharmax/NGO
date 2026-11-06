// Rebuild Aadhaar and insurance IDs from a space's master directory sheet
// (Sheet1), encrypting them with the current key. Use when the encryption key
// is lost: stored IDs can no longer be decrypted, but the sheet holds every
// full number. See KEY-RECOVERY.md.
//
//   node scripts/recover-ids-from-sheet.js --space <slug> --key-file <key.txt> [--csv <Sheet1.csv>] [--apply]
//
// --key-file  the key the server will use from now on (a new one if the old is lost)
// --csv       Sheet1 downloaded as CSV (File > Download > .csv); without it the
//             sheet is read live through the space's Google connection
// --all       also replace values that the key can still decrypt
//
// Only the ID fields are written; every other field stays as it is. Without
// --apply it only reports what it would change. Take a Firestore backup first.
const fs = require('fs');
const { google } = require('googleapis');
const { getDb } = require('../js/server/firebaseAdmin');
const { getClientForNgo, getNgoIntegration } = require('../js/server/googleOAuth');
const { isEncrypted, decryptWith, encryptWith, mask } = require('../js/server/fieldCrypto');
const { readKeyFile, args, parseCSV, idsFromSheetRows } = require('./lib/keyTools');

async function sheetRows(slug, csvPath) {
  if (csvPath) return parseCSV(fs.readFileSync(csvPath, 'utf8'));
  const client = await getClientForNgo(slug);
  const integration = await getNgoIntegration(slug);
  if (!client || !integration || !integration.sheetId) throw new Error(`${slug} has no Google Sheet connection; use --csv`);
  const sheets = google.sheets({ version: 'v4', auth: client });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: integration.sheetId, range: 'Sheet1!A1:Z5000' });
  return res.data.values || [];
}

const usable = (value, key) => value && (!isEncrypted(value) || decryptWith(value, key) !== null);

(async () => {
  const a = args();
  if (!a.space) throw new Error('--space <slug> is required');
  const key = readKeyFile(a['key-file']);
  const db = getDb();
  if (!db) throw new Error('Firestore is not available');

  const fromSheet = idsFromSheetRows(await sheetRows(a.space, a.csv));
  console.log(`Sheet: ${fromSheet.size} row(s) with an ID.`);

  const snap = await db.collection('ngos').doc(a.space).collection('children').get();
  const plan = [];
  let notInSheet = 0;

  for (const doc of snap.docs) {
    const c = doc.data();
    const needs = (c.idNumber && (a.all || !usable(c.idNumber, key))) ||
      (c.insurance || []).some(e => e && e.number && (a.all || !usable(e.number, key)));
    if (!needs) continue;
    const row = fromSheet.get(doc.id);
    if (!row) { notInSheet++; console.log(`  ${doc.id}: not in the sheet, left as it is`); continue; }

    const patch = {};
    const changes = [];
    if (c.idNumber && (a.all || !usable(c.idNumber, key)) && row.idNumber) {
      patch.idNumber = encryptWith(row.idNumber, key);
      changes.push(`Aadhaar ${mask(row.idNumber)}`);
    }
    if ((c.insurance || []).some(e => e && e.number && (a.all || !usable(e.number, key))) && row.insurance.length) {
      // Keep each stored entry's id when its insurer and dates match a sheet entry.
      const stored = (c.insurance || []).filter(Boolean);
      patch.insurance = row.insurance.map((e, i) => {
        const match = stored.find(s => s.insurer === e.insurer && (s.startDate || '') === e.startDate && (s.expiryDate || '') === e.expiryDate);
        return { id: (match && match.id) || `INS-recovered-${doc.id}-${i + 1}`, number: encryptWith(e.number, key), insurer: e.insurer, startDate: e.startDate, expiryDate: e.expiryDate };
      });
      changes.push(`${patch.insurance.length} insurance entr${patch.insurance.length === 1 ? 'y' : 'ies'} (${row.insurance.map(e => mask(e.number)).join(', ')})`);
    }
    if (changes.length) plan.push({ ref: doc.ref, id: doc.id, patch, changes });
  }

  plan.forEach(p => console.log(`  ${p.id}: ${p.changes.join('; ')}`));
  console.log(`${plan.length} record(s) to restore${notInSheet ? `, ${notInSheet} not found in the sheet` : ''}.`);
  if (!a.apply) { console.log('Dry run. Add --apply to write.'); process.exit(0); }

  const batch = db.batch();
  plan.forEach(p => batch.set(p.ref, p.patch, { merge: true }));
  if (plan.length) await batch.commit();

  let ok = 0, bad = 0;
  for (const p of plan) {
    const d = (await p.ref.get()).data();
    [d.idNumber, ...(d.insurance || []).map(e => e.number)].filter(Boolean).forEach(v => { decryptWith(v, key) === null ? bad++ : ok++; });
  }
  console.log(`Done. Verified with the key: ${ok} readable, ${bad} unreadable.`);
  console.log('Next: restart the app on the server so it reloads the records.');
  process.exit(bad ? 1 : 0);
})().catch(err => { console.error('Failed:', err.message); process.exit(1); });
