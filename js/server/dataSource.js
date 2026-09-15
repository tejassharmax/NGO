/**
 * dataSource.js
 * One place that answers "where does this NGO's data actually live right now?".
 *
 * Firestore (`ngos/{slug}/...`) is the real database. The legacy global
 * data/db.json is kept only so the app still boots before an `anirudh-449ca`
 * service-account key is installed — it is a single blob shared by every admin on
 * an ephemeral disk, so it is a development convenience, not a deployment target.
 *
 * WHY THIS MODULE EXISTS SEPARATELY
 * server.js and js/server/googleOAuth.js both need tenant-scoped reads and
 * writes. googleOAuth.js is required *by* server.js, so it cannot require it
 * back. Putting the backend switch here keeps one implementation and no cycle.
 */

const fs = require('fs');
const path = require('path');

const { isFirestoreEnabled, getDb } = require('./firebaseAdmin');
const { readSnapshot, writeSnapshot, updateSnapshotMemoryCache, clearSnapshotMemoryCache, sanitizeNgoSlug } = require('./ngoStore');
const { SYNC_KEYS } = require('./syncMerge');

const DB_FILE = path.join(__dirname, '../../data/db.json');

/** Read the legacy global file store. @returns {Record<string,string>} */
function readFileStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
    }
  } catch (err) {
    console.error('[data] Failed to read db.json:', err.message);
  }
  return {};
}

/** Write the legacy global file store, skipping no-op writes. */
function writeFileStore(snapshot) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const next = JSON.stringify(snapshot, null, 2);
  let current = '';
  try {
    if (fs.existsSync(DB_FILE)) current = fs.readFileSync(DB_FILE, 'utf8');
  } catch (e) { }
  if (next !== current) fs.writeFileSync(DB_FILE, next, 'utf8');
}

/**
 * Read one NGO's whole database from whichever backend is live.
 *
 * @param {string} ngoSlug
 * @returns {Promise<{payload: Record<string,string>, index: Map|null, firestore: boolean}>}
 *   `index` is the per-document diff index and is null in file-store mode.
 */
async function readTenant(ngoSlug) {
  if (!isFirestoreEnabled()) {
    return { payload: readFileStore(), index: null, firestore: false };
  }
  const slug = sanitizeNgoSlug(ngoSlug);
  try {
    const { payload, index } = await readSnapshot(slug);
    return { payload, index, firestore: true };
  } catch (err) {
    console.warn(`[data] Firestore read failed for "${slug}" (${err.message}). Using emergency local fallback.`);
    const fallback = readFileStore();
    // Pre-seed snapshot cache so subsequent calls stay fast and do not spam failed reads
    updateSnapshotMemoryCache(slug, fallback);
    return { payload: fallback, index: null, firestore: false };
  }
}

/**
 * Parse one synced key out of an NGO's database as an array.
 *
 * Every caller wants the parsed array, and every caller would otherwise repeat
 * the same exists/parse/isArray dance around a stringified blob.
 *
 * @param {string} ngoSlug
 * @param {string[]} keys chm-* keys to read
 * @returns {Promise<Record<string, object[]>>} key -> array (empty on any failure)
 */
async function readTenantArrays(ngoSlug, keys) {
  const out = {};
  keys.forEach(key => { out[key] = []; });

  let payload;
  try {
    ({ payload } = await readTenant(ngoSlug));
  } catch (err) {
    console.warn(`[data] Read failed for ngo "${ngoSlug}": ${err.message}`);
    return out;
  }

  keys.forEach(key => {
    try {
      const parsed = JSON.parse(payload[key] || '[]');
      if (Array.isArray(parsed)) out[key] = parsed;
    } catch (e) { }
  });
  return out;
}

/**
 * Replace an NGO's child roster, leaving every other collection untouched.
 *
 * Used by the Google Sheets pull (which imports the spreadsheet's rows) and by
 * the delete-child endpoint. Deliberately narrow: it writes only `chm-children`
 * so it can never clobber records it never read.
 *
 * Writes directly to Firestore using batch operations and explicitly DELETES
 * any child document no longer in the updated roster.
 *
 * @param {string} ngoSlug
 * @param {object[]} children
 * @returns {Promise<void>}
 */
async function writeTenantChildren(ngoSlug, children) {
  const safeChildren = Array.isArray(children) ? children : [];
  const json = JSON.stringify(safeChildren);
  const slug = sanitizeNgoSlug(ngoSlug);

  // 1. Primary: Write directly to Firebase Cloud Firestore
  if (isFirestoreEnabled()) {
    try {
      const db = getDb();
      if (db) {
        const root = db.collection('ngos').doc(slug);
        const childrenCol = root.collection('children');

        // Fetch existing documents in Firestore to find any removed children
        const snap = await childrenCol.get();
        const keepDocIds = new Set();
        const operations = [];

        safeChildren.forEach((c, idx) => {
          if (c && c.id) {
            const safeDocId = String(c.id).replace(/\//g, '_').trim();
            keepDocIds.add(safeDocId);
            operations.push({
              type: 'set',
              ref: childrenCol.doc(safeDocId),
              data: { ...c, _seq: idx }
            });
          }
        });

        // Any document currently in Firestore not in keepDocIds MUST BE DELETED!
        let deletedCount = 0;
        snap.forEach(doc => {
          if (!keepDocIds.has(doc.id)) {
            operations.push({
              type: 'delete',
              ref: doc.ref
            });
            deletedCount++;
          }
        });

        // Commit in safe batch chunks
        const BATCH_SIZE = 400;
        for (let i = 0; i < operations.length; i += BATCH_SIZE) {
          const batch = db.batch();
          operations.slice(i, i + BATCH_SIZE).forEach(op => {
            if (op.type === 'delete') {
              batch.delete(op.ref);
            } else {
              batch.set(op.ref, op.data);
            }
          });
          await batch.commit();
        }

        console.log(`[dataSource] Persisted ${safeChildren.length} children to Firestore (ngos/${slug}/children). Explicitly deleted ${deletedCount} removed child doc(s).`);

        // Invalidate in-memory cache and seed with fresh payload
        clearSnapshotMemoryCache(slug);
        updateSnapshotMemoryCache(slug, { 'chm-children': json });
      }
    } catch (fsErr) {
      console.warn(`[dataSource] Direct Firestore write warning (${fsErr.message}). Persisting to emergency local store.`);
    }
  }

  // 2. Secondary: Emergency local file store backup
  try {
    const store = readFileStore();
    store['chm-children'] = json;
    writeFileStore(store);
  } catch (fileErr) {
    console.warn('[dataSource] Could not write to local store:', fileErr.message);
  }
}

module.exports = {
  DB_FILE,
  SYNC_KEYS,
  readFileStore,
  writeFileStore,
  readTenant,
  readTenantArrays,
  writeTenantChildren
};
