/**
 * ngoStore.js
 * Per-NGO Firestore persistence for the child health database.
 *
 * LAYOUT
 *   ngos/{ngoSlug}/children/{childId}
 *   ngos/{ngoSlug}/appointments/{apptId}
 *   ngos/{ngoSlug}/growth/{recordId}          ... one subcollection per chm-* key
 *   ngos/{ngoSlug}/settings/org               ... the sample-org-* scalars
 *
 * WHY PER-NGO AND NOT PER-USER
 * An NGO's staff share one roster: a child registered by one admin must be
 * visible to the others. The `ngo` field already on each `authorized_users`
 * document is the tenant key, and it is resolved SERVER-SIDE from the verified
 * token email. A client-supplied `ngo` is never trusted for data access.
 *
 * WHY ONE DOCUMENT PER RECORD
 * The old file store kept each key as one JSON blob, so two admins saving at the
 * same time overwrote each other's whole roster, and removing the last child
 * could not sync at all. Per-record documents let concurrent edits to different
 * children coexist, and make deletions explicit.
 *
 * READ/WRITE SHAPE
 * `readSnapshot` returns exactly the `{ 'chm-children': '<json string>', ... }`
 * object the existing /api/sync contract uses, so js/storage.js needs no
 * changes. Array order is preserved with a `_seq` field, which is stripped on
 * read and never visible to the client.
 */

const crypto = require('crypto');
const { getDb, getAuth } = require('./firebaseAdmin');
const { COLLECTION_KEYS, SCALAR_KEYS } = require('./syncMerge');

/** chm-* key -> Firestore subcollection name. */
const COLLECTION_NAMES = {
  'chm-children': 'children',
  'chm-activity': 'activity',
  'chm-pending-docs': 'pendingDocs',
  'chm-documents': 'documents',
  'chm-growth': 'growth',
  'chm-nutrition': 'nutrition',
  'chm-medicines': 'medicines',
  'chm-appointments': 'appointments',
  'chm-emergency': 'emergency',
  'chm-expenses': 'expenses',
  'chm-alerts': 'alerts',
  'chm-health-records': 'healthRecords'
};

/** sample-org-* key -> field name inside the settings/org document. */
const SCALAR_FIELDS = {
  'sample-org-name': 'name',
  'sample-org-code': 'code',
  'sample-org-email': 'email',
  'sample-org-timezone': 'timezone'
};

/** Fields that can hold a base64 payload big enough to burst a document. */
const HEAVY_FIELDS = ['image', 'fileData'];

/**
 * Firestore's hard per-document ceiling is 1 MiB. Stay well clear of it so the
 * surrounding metadata always fits.
 */
const MAX_DOC_BYTES = 900 * 1024;

/** Firestore allows 500 operations per batch; leave headroom. */
const BATCH_LIMIT = 450;

/** Index key under which readSnapshot stashes the current settings document. */
const SETTINGS_INDEX_KEY = 'settings/org';

/**
 * Tenant used when an account's `authorized_users` document carries no `ngo`, or
 * when Firestore cannot be reached at all. Configurable because it is a real NGO
 * name, not a neutral placeholder — a deployment whose main organisation is not
 * "Ayusha Nilayam" should set DEFAULT_NGO so an unlabelled account does not land
 * in a stranger's folder.
 */
const DEFAULT_NGO = (process.env.DEFAULT_NGO || 'Ayusha Nilayam').trim() || 'Ayusha Nilayam';

/* ───────────────────────────────────────────────────────
   TENANT RESOLUTION
   ─────────────────────────────────────────────────────── */

/**
 * Normalize any NGO label into a slug safe for a Firestore document ID.
 * Mirrors the sanitizer the Google integration routes already use.
 * @param {string} value
 * @returns {string}
 */
function sanitizeNgoSlug(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug) return slug;
  // Recurse-free fallback: DEFAULT_NGO is itself slugged inline.
  return String(DEFAULT_NGO).toLowerCase().trim().replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '') || 'default-ngo';
}

/** Email -> authorized_users document ID. Mirrors js/firestore.js. */
function emailToDocId(email) {
  return String(email || '').trim().toLowerCase().replace(/[@.]/g, '_');
}

// Tenant lookups happen on every sync; cache them briefly.
const ngoCache = new Map(); // email -> { slug, name, expiresAt }
const NGO_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Make sure an account's `ngo` custom claim matches its allowlist record.
 *
 * firestore.rules authorizes reads on `request.auth.token.ngo`, and a claim is
 * only ever set by the Admin SDK, so it is the one tenant signal a browser
 * cannot forge. A user who is added to the allowlist after setup would otherwise
 * have no claim at all and be silently locked out of direct reads.
 *
 * Best-effort and fire-and-forget: the API path does not depend on the claim
 * (the server uses the Admin SDK, which bypasses rules), so a failure here is
 * logged and ignored rather than breaking the request. Runs only on a tenant
 * cache miss, i.e. at most once per NGO_CACHE_TTL_MS per account.
 *
 * @param {string} email
 * @param {string} slug
 * @returns {Promise<void>}
 */
async function ensureNgoClaim(email, slug) {
  const auth = getAuth();
  if (!auth || !email) return;

  try {
    const user = await auth.getUserByEmail(email);
    const claims = user.customClaims || {};
    if (claims.ngo === slug) return;
    // Merge so any unrelated claim survives.
    await auth.setCustomUserClaims(user.uid, { ...claims, ngo: slug });
    console.log(`[ngoStore] Set ngo claim "${slug}" for ${email}`);
  } catch (e) {
    // user-not-found is normal: the account exists on the allowlist but has not
    // signed in yet, so there is no Auth record to stamp.
    if (e.code !== 'auth/user-not-found') {
      console.warn(`[ngoStore] Could not set ngo claim for ${email}: ${e.message}`);
    }
  }
}

/**
 * Resolve which NGO a verified account belongs to.
 *
 * Reads the `ngo` field from the account's `authorized_users` document. Falls
 * back to the default tenant when Firestore is unavailable or the document
 * carries no `ngo`, which keeps the single-NGO deployment working unchanged.
 *
 * @param {string} email verified email from the ID token
 * @returns {Promise<{slug: string, name: string}>}
 */
async function resolveNgoForEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const cached = ngoCache.get(normalized);
  if (cached && Date.now() < cached.expiresAt) {
    return { slug: cached.slug, name: cached.name };
  }

  let name = DEFAULT_NGO;
  const db = getDb();

  if (db && normalized) {
    try {
      const snap = await db.collection('authorized_users').doc(emailToDocId(normalized)).get();
      if (snap.exists) {
        const data = snap.data() || {};
        if (data.ngo) name = String(data.ngo);
      }
    } catch (e) {
      console.warn(`[ngoStore] Tenant lookup failed for ${normalized}: ${e.message}`);
    }
  }

  const resolved = { slug: sanitizeNgoSlug(name), name };
  ngoCache.set(normalized, { ...resolved, expiresAt: Date.now() + NGO_CACHE_TTL_MS });

  // Not awaited: nothing on this request path reads the claim.
  if (db && normalized) {
    ensureNgoClaim(normalized, resolved.slug);
  }

  return resolved;
}

/** Forget a cached tenant lookup, e.g. after an allowlist change. */
function invalidateNgoCache(email) {
  if (email) ngoCache.delete(String(email).trim().toLowerCase());
  else ngoCache.clear();
}

/* ───────────────────────────────────────────────────────
   DOCUMENT IDENTITY
   ─────────────────────────────────────────────────────── */

/**
 * Deterministic document ID for a synced record.
 *
 * Records with an `id` (children, appointments, medicines, documents, alerts…)
 * use it directly so repeated syncs are idempotent. Records without one
 * (activity entries, growth and meal logs) hash their own content, which is
 * equally stable because each already carries a unique `timestamp`.
 *
 * @param {object} item
 * @returns {string}
 */
function deriveDocId(item) {
  if (item && item.id) {
    // Firestore forbids '/' in IDs and rejects the reserved '.' / '..' names.
    const safe = String(item.id).replace(/\//g, '_').trim();
    if (safe && safe !== '.' && safe !== '..') return safe.slice(0, 400);
  }
  // Key-order-insensitive, so the same logical record from two different clients
  // cannot land in two documents.
  const hash = crypto.createHash('sha1').update(canonicalJSON(item)).digest('hex');
  return `k_${hash.slice(0, 24)}`;
}

/**
 * JSON with object keys sorted, so two records that differ only in key order
 * compare equal. Without this, a record round-tripped through Firestore would
 * look "changed" on every sync and burn write quota for nothing.
 * @param {any} value
 * @returns {string}
 */
function canonicalJSON(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalJSON(value[k])}`).join(',')}}`;
}

/**
 * Strip oversized binary payloads so a record can never exceed the Firestore
 * document limit.
 *
 * Uploaded documents embed their file as base64 in `image`/`fileData`, which a
 * single photo or PDF can push past 1 MiB. Those belong in Cloud Storage; until
 * that move, the metadata is preserved and the payload dropped rather than
 * failing the whole sync.
 *
 * @param {object} item
 * @param {string} collectionName for the warning message
 * @returns {object}
 */
function fitToDocumentLimit(item, collectionName) {
  let estimated = Buffer.byteLength(JSON.stringify(item), 'utf8');
  if (estimated <= MAX_DOC_BYTES) return item;

  const trimmed = { ...item };
  for (const field of HEAVY_FIELDS) {
    if (trimmed[field] === undefined) continue;
    delete trimmed[field];
    trimmed._payloadDropped = true;
    estimated = Buffer.byteLength(JSON.stringify(trimmed), 'utf8');
    if (estimated <= MAX_DOC_BYTES) break;
  }

  console.warn(
    `[ngoStore] ${collectionName}/${deriveDocId(item)} exceeded ${MAX_DOC_BYTES} bytes; ` +
    `dropped embedded file payload. Move uploads to Cloud Storage to keep them.`
  );
  return trimmed;
}

/* ───────────────────────────────────────────────────────
   READ
   ─────────────────────────────────────────────────────── */

/**
 * Read one NGO's entire database.
 *
 * @param {string} ngoSlug
 * @returns {Promise<{payload: Record<string,string>, index: Map<string, Map<string,{json: string, seq: number}>>}>}
 *   `payload` matches the /api/sync response contract. `index` maps each key to
 *   its stored documents (docId -> canonical JSON plus sequence), for diffing
 *   on write.
 */
async function readSnapshot(ngoSlug) {
  const db = getDb();
  if (!db) throw new Error('Firestore is not available');

  const root = db.collection('ngos').doc(sanitizeNgoSlug(ngoSlug));
  const payload = {};
  const index = new Map();

  const collectionReads = COLLECTION_KEYS.map(async key => {
    const collectionName = COLLECTION_NAMES[key];
    const snap = await root.collection(collectionName).get();

    const rows = [];
    const docIndex = new Map();

    snap.forEach(doc => {
      const data = doc.data() || {};
      const seq = typeof data._seq === 'number' ? data._seq : Number.MAX_SAFE_INTEGER;
      const item = { ...data };
      delete item._seq;
      rows.push({ seq, item });
      docIndex.set(doc.id, { json: canonicalJSON(item), seq });
    });

    // `_seq` reproduces the newest-first order the client array had.
    rows.sort((a, b) => a.seq - b.seq);

    payload[key] = JSON.stringify(rows.map(r => r.item));
    index.set(key, docIndex);
  });

  const settingsRead = root.collection('settings').doc('org').get().then(snap => {
    const data = snap.exists ? (snap.data() || {}) : {};
    SCALAR_KEYS.forEach(key => {
      const value = data[SCALAR_FIELDS[key]];
      payload[key] = (value === undefined || value === null) ? null : String(value);
    });
    // Stashed so writeSnapshot can skip rewriting an unchanged settings document.
    index.set(SETTINGS_INDEX_KEY, data);
  });

  await Promise.all([...collectionReads, settingsRead]);
  return { payload, index };
}

/* ───────────────────────────────────────────────────────
   WRITE
   ─────────────────────────────────────────────────────── */

/**
 * Persist a merged snapshot, writing only what actually changed.
 *
 * Quota discipline matters here: the client syncs on a 1.5s debounce after every
 * edit, so blindly rewriting every document would burn the daily write quota.
 * Keys whose JSON is unchanged are skipped entirely, and within a changed key
 * only differing documents are written.
 *
 * Deletions are applied for `chm-children` only, matching the merge rule that
 * makes the client roster authoritative. The other collections union-merge, so a
 * record absent from this payload is treated as "not sent", not "deleted".
 *
 * @param {string} ngoSlug
 * @param {Record<string,string>} merged output of mergeNamespace()
 * @param {Map<string, Map<string,string>>} [index] from the readSnapshot in this request
 * @returns {Promise<{writes: number, deletes: number}>}
 */
async function writeSnapshot(ngoSlug, merged, index = new Map()) {
  const db = getDb();
  if (!db) throw new Error('Firestore is not available');

  const root = db.collection('ngos').doc(sanitizeNgoSlug(ngoSlug));
  const operations = [];

  COLLECTION_KEYS.forEach(key => {
    let items = [];
    try { items = JSON.parse(merged[key] || '[]'); } catch (e) { return; }
    if (!Array.isArray(items)) return;

    const collectionName = COLLECTION_NAMES[key];
    const stored = index.get(key) || new Map();
    const seen = new Set();

    items.forEach((rawItem, position) => {
      if (!rawItem || typeof rawItem !== 'object') return;

      const item = fitToDocumentLimit(rawItem, collectionName);
      const docId = deriveDocId(item);
      seen.add(docId);

      // Skip only when both the content AND the position are already correct.
      const previous = stored.get(docId);
      if (previous && previous.json === canonicalJSON(item) && previous.seq === position) {
        return;
      }

      operations.push({
        type: 'set',
        ref: root.collection(collectionName).doc(docId),
        data: { ...item, _seq: position }
      });
    });

    // Only authoritative collections remove records when omitted.
    if (key === 'chm-children' || key === 'chm-documents') {
      stored.forEach((_entry, docId) => {
        if (!seen.has(docId)) {
          operations.push({
            type: 'delete',
            ref: root.collection(collectionName).doc(docId)
          });
        }
      });
    }
  });

  // Scalars collapse into one document; write it only when a value actually
  // differs. Without this check every sync rewrote it, since the merge always
  // fills these keys in from the server copy.
  const settings = {};
  const currentSettings = index.get(SETTINGS_INDEX_KEY) || {};
  let settingsChanged = false;
  SCALAR_KEYS.forEach(key => {
    const value = merged[key];
    if (value === undefined || value === null) return;
    const field = SCALAR_FIELDS[key];
    settings[field] = value;
    if (currentSettings[field] !== value) settingsChanged = true;
  });
  if (settingsChanged) {
    operations.push({
      type: 'set',
      ref: root.collection('settings').doc('org'),
      data: settings,
      merge: true
    });
  }

  // Mark the tenant document so `ngos/{slug}` is listable and carries a stamp.
  // Only when something else changed, so an idle client's debounced sync costs
  // zero writes instead of one per poll.
  if (operations.length > 0) {
    operations.push({
      type: 'set',
      ref: root,
      data: { slug: sanitizeNgoSlug(ngoSlug), updatedAt: new Date().toISOString() },
      merge: true
    });
  }

  let writes = 0;
  let deletes = 0;

  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    operations.slice(i, i + BATCH_LIMIT).forEach(op => {
      if (op.type === 'delete') {
        batch.delete(op.ref);
        deletes++;
      } else {
        batch.set(op.ref, op.data, op.merge ? { merge: true } : {});
        writes++;
      }
    });
    await batch.commit();
  }

  return { writes, deletes };
}

module.exports = {
  sanitizeNgoSlug,
  emailToDocId,
  resolveNgoForEmail,
  invalidateNgoCache,
  ensureNgoClaim,
  readSnapshot,
  writeSnapshot,
  DEFAULT_NGO,
  COLLECTION_NAMES,
  SCALAR_FIELDS
};
