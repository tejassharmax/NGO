// Re-encrypt every stored Aadhaar and insurance ID with a new key.
// Use when the key may have leaked, or to rotate it. See KEY-RECOVERY.md.
//
//   node scripts/change-key.js --old-key-file <old.txt> --new-key-file <new.txt> [--space <slug>] [--apply]
//
// Without --apply it only reports what it would change. It refuses to write if
// any stored value cannot be decrypted with the old key, so a wrong old key can
// never destroy data. Take a Firestore backup first.
const { getDb } = require('../js/server/firebaseAdmin');
const { isEncrypted, decryptWith, encryptWith, eachSensitive } = require('../js/server/fieldCrypto');
const { readKeyFile, args } = require('./lib/keyTools');

(async () => {
  const a = args();
  const oldKey = readKeyFile(a['old-key-file']);
  const newKey = readKeyFile(a['new-key-file']);
  if (oldKey.equals(newKey)) throw new Error('The old and new keys are the same');
  const db = getDb();
  if (!db) throw new Error('Firestore is not available');

  const spaces = a.space ? [a.space] : (await db.collection('ngos').listDocuments()).map(d => d.id);
  const plan = [];
  let unreadable = 0;

  for (const slug of spaces) {
    const snap = await db.collection('ngos').doc(slug).collection('children').get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const updated = JSON.parse(JSON.stringify({ idNumber: data.idNumber, insurance: data.insurance }));
      let fields = 0;
      eachSensitive(updated, (get, set) => {
        const value = get();
        const plain = isEncrypted(value) ? decryptWith(value, oldKey) : value;
        if (plain === null) { unreadable++; console.log(`  cannot decrypt ${slug}/${doc.id} with the old key`); return; }
        set(encryptWith(plain, newKey));
        fields++;
      });
      if (fields) plan.push({ ref: doc.ref, slug, id: doc.id, fields, update: updated });
    }
  }

  const total = plan.reduce((n, p) => n + p.fields, 0);
  console.log(`${total} value(s) in ${plan.length} record(s) across ${spaces.length} space(s) would be re-encrypted.`);
  if (unreadable) {
    console.log(`STOPPED: ${unreadable} value(s) cannot be decrypted with the old key. Nothing was written.`);
    process.exit(2);
  }
  if (!a.apply) { console.log('Dry run. Add --apply to write.'); process.exit(0); }

  for (let i = 0; i < plan.length; i += 400) {
    const batch = db.batch();
    plan.slice(i, i + 400).forEach(p => {
      const patch = {};
      if (p.update.idNumber !== undefined) patch.idNumber = p.update.idNumber;
      if (p.update.insurance !== undefined) patch.insurance = p.update.insurance;
      batch.set(p.ref, patch, { merge: true });
    });
    await batch.commit();
  }

  // Check every rewritten value opens with the new key.
  let ok = 0, bad = 0;
  for (const p of plan) {
    const d = (await p.ref.get()).data();
    eachSensitive(d, get => { decryptWith(get(), newKey) === null ? bad++ : ok++; });
  }
  console.log(`Done. Verified with the new key: ${ok} readable, ${bad} unreadable.`);
  console.log('Next: put the new key in .env.fieldkey on the server, restart, and update every key copy.');
  process.exit(bad ? 1 : 0);
})().catch(err => { console.error('Failed:', err.message); process.exit(1); });
