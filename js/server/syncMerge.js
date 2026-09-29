/**
 * syncMerge.js
 * The merge rules for /api/sync, extracted so that every storage backend uses
 * byte-identical semantics.
 *
 * These rules were previously inlined in server.js and applied only to the
 * data/db.json file store. Firestore is now the primary backend and the file
 * store the fallback, so the rules had to live somewhere both can call. The
 * behaviour here is deliberately unchanged from the file-store version.
 */

/**
 * Every key the client packs into a sync payload, in the order it is persisted.
 * Keys prefixed `chm-` hold JSON arrays; `sample-org-` keys hold plain strings.
 */
const SYNC_KEYS = [
  'chm-children', 'chm-activity', 'chm-pending-docs', 'chm-documents', 'chm-growth',
  'chm-nutrition', 'chm-medicines', 'chm-appointments', 'chm-emergency',
  'chm-expenses', 'chm-alerts', 'chm-health-records', 'chm-deleted',
  'sample-org-name', 'sample-org-code', 'sample-org-email', 'sample-org-timezone'
];

/**
 * Deletion markers. Union-merged collections cannot express a delete on their own:
 * a record missing from one device's payload looks the same as one it never had,
 * so the server copy would bring it straight back. A tombstone
 * `{ id: '<key>:<recordId>', key, recordId, deletedAt }` in `chm-deleted` says the
 * record is gone for every device.
 */
const TOMBSTONE_KEY = 'chm-deleted';

/**
 * Tombstoned record ids, grouped by collection key.
 * @param {string} tombstonesJSON
 * @returns {Map<string, Set<string>>}
 */
function tombstonesByKey(tombstonesJSON) {
  const byKey = new Map();
  let list = [];
  try { list = JSON.parse(tombstonesJSON || '[]'); } catch (e) { }
  (Array.isArray(list) ? list : []).forEach(t => {
    if (!t || !t.key || t.recordId === undefined || t.recordId === null) return;
    if (!byKey.has(t.key)) byKey.set(t.key, new Set());
    byKey.get(t.key).add(String(t.recordId));
  });
  return byKey;
}

/** Array-valued keys, i.e. everything that becomes a Firestore subcollection. */
const COLLECTION_KEYS = SYNC_KEYS.filter(k => k.startsWith('chm-'));

/** Scalar keys, which collapse into a single `settings/org` document. */
const SCALAR_KEYS = SYNC_KEYS.filter(k => !k.startsWith('chm-'));

/**
 * Legacy seed/demo records that must never be resurrected by a merge. Kept
 * verbatim from the original implementation.
 */
const DISALLOWED_MOCK_NAMES = [
  'Naveen Roy', 'Aisha Khan', 'Aarav Sharma', 'Ananya Patil',
  'Diya Nair', 'Unnamed Child', 'Tejas Sharma'
];

/** Cap on append-only log collections (activity, alerts). */
const LOG_CAP = 100;

/**
 * Stable identity for an item inside a synced array.
 *
 * `id` comes first. Keying appointments on child/date/time/type meant editing any
 * of those produced a second copy, and Firestore (which stores by id) then kept
 * whichever copy was written last. The composite key survives only as a fallback
 * for legacy appointments that were saved without an id.
 * @param {object} item
 * @returns {string}
 */
function itemKey(item) {
  if (item.id) return String(item.id);
  if (item.childId && item.date && item.time && item.type) {
    return `APT_${item.childId}_${item.date}_${item.time}_${item.type}`;
  }
  return JSON.stringify(item);
}

/**
 * Union-merge two JSON arrays, client entries winning on key collision.
 * @param {string} clientJSON
 * @param {string} serverJSON
 * @returns {string} merged JSON array
 */
function mergeJSONArrays(clientJSON, serverJSON) {
  let clientArr = [];
  let serverArr = [];
  try { clientArr = JSON.parse(clientJSON || '[]'); } catch (e) { }
  try { serverArr = JSON.parse(serverJSON || '[]'); } catch (e) { }
  if (!Array.isArray(clientArr)) clientArr = [];
  if (!Array.isArray(serverArr)) serverArr = [];

  const map = new Map();

  serverArr.concat(clientArr).forEach(item => {
    if (!item || typeof item !== 'object') return;
    // Exclude legacy mock records and admin self-registration tests.
    if (item.name && DISALLOWED_MOCK_NAMES.includes(item.name.trim())) return;
    if (item.childName && DISALLOWED_MOCK_NAMES.includes(item.childName.trim())) return;
    map.set(itemKey(item), item);
  });

  let result = Array.from(map.values());
  if (result.length > LOG_CAP && result[0] && typeof result[0] === 'object' &&
      result[0].timestamp && result[0].type) {
    result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    result = result.slice(0, LOG_CAP);
  }

  return JSON.stringify(result);
}

/**
 * Merge a client sync payload against the current server snapshot.
 *
 * `chm-children` is client-authoritative when the client sends a non-empty
 * roster (so edits and reordering propagate); every other `chm-` key is
 * union-merged; scalars take the client value when present.
 *
 * @param {Record<string,string>} clientData raw payload from the browser
 * @param {Record<string,string>} serverData current stored snapshot
 * @returns {Record<string,string>} the snapshot to persist and return
 */
function mergeNamespace(clientData = {}, serverData = {}) {
  const merged = {};

  SYNC_KEYS.forEach(key => {
    if (key === 'chm-children') {
      let clientArr = null;
      try {
        if (clientData[key] !== undefined && clientData[key] !== null) {
          clientArr = JSON.parse(clientData[key]);
        }
      } catch (e) { }
      if (Array.isArray(clientArr)) {
        merged[key] = JSON.stringify(clientArr);
      } else if (serverData[key]) {
        merged[key] = serverData[key];
      } else {
        merged[key] = '[]';
      }
    } else if (key === 'chm-documents') {
      let clientArr = null;
      try {
        if (clientData[key] !== undefined && clientData[key] !== null) {
          clientArr = JSON.parse(clientData[key]);
        }
      } catch (e) { }
      if (Array.isArray(clientArr)) {
        merged[key] = JSON.stringify(clientArr);
      } else if (serverData[key]) {
        merged[key] = serverData[key];
      } else {
        merged[key] = '[]';
      }
    } else if (key.startsWith('chm-')) {
      merged[key] = mergeJSONArrays(clientData[key], serverData[key]);
    } else if (clientData[key] !== undefined && clientData[key] !== null) {
      merged[key] = clientData[key];
    } else {
      merged[key] = serverData[key] || null;
    }
  });

  // Drop every record that any device has deleted.
  tombstonesByKey(merged[TOMBSTONE_KEY]).forEach((ids, key) => {
    if (!merged[key] || key === TOMBSTONE_KEY) return;
    try {
      const arr = JSON.parse(merged[key]);
      if (!Array.isArray(arr)) return;
      merged[key] = JSON.stringify(arr.filter(item => !(item && item.id !== undefined && ids.has(String(item.id)))));
    } catch (e) { }
  });

  return merged;
}

module.exports = {
  SYNC_KEYS,
  COLLECTION_KEYS,
  SCALAR_KEYS,
  TOMBSTONE_KEY,
  DISALLOWED_MOCK_NAMES,
  tombstonesByKey,
  mergeJSONArrays,
  mergeNamespace
};
