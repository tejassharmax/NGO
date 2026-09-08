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
  'chm-expenses', 'chm-alerts', 'chm-health-records',
  'sample-org-name', 'sample-org-code', 'sample-org-email', 'sample-org-timezone'
];

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
 * Stable identity for an item inside a synced array. Appointments get a
 * composite key so the same slot cannot be duplicated across devices.
 * @param {object} item
 * @returns {string}
 */
function itemKey(item) {
  if (item.childId && item.date && item.time && item.type) {
    return `APT_${item.childId}_${item.date}_${item.time}_${item.type}`;
  }
  if (item.id) return String(item.id);
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
      let clientArr = [];
      try { clientArr = JSON.parse(clientData[key] || '[]'); } catch (e) { }
      if (Array.isArray(clientArr) && clientArr.length > 0) {
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

  return merged;
}

module.exports = {
  SYNC_KEYS,
  COLLECTION_KEYS,
  SCALAR_KEYS,
  DISALLOWED_MOCK_NAMES,
  mergeJSONArrays,
  mergeNamespace
};
