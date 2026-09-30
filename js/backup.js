/**
 * backup.js
 * Export and restore of everything this browser holds, so records can be moved
 * between deployments (e.g. from the old Render site to ayushahealth.in).
 *
 * Restoring only ADDS records that are missing. A record that already exists
 * (same id) is kept as it is, so a restore can never overwrite work done on the
 * destination site. Pure functions only; storage.js does the localStorage I/O.
 */

export const BACKUP_FORMAT = 'child-health-management-backup';

/** Keys a backup carries: every synced collection plus the org settings. */
export const BACKUP_KEYS = [
  'chm-children', 'chm-growth', 'chm-health-records', 'chm-appointments', 'chm-medicines',
  'chm-documents', 'chm-alerts', 'chm-activity', 'chm-deleted',
  'chm-nutrition', 'chm-emergency', 'chm-expenses',
  'sample-org-name', 'sample-org-code', 'sample-org-email', 'sample-org-timezone'
];

/** Same record identity rule as the sync server (js/server/syncMerge.js). */
export function recordKey(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.id) return String(item.id);
  if (item.childId && item.date && item.time && item.type) return `APT_${item.childId}_${item.date}_${item.time}_${item.type}`;
  if (item.childId && item.date) return `${item.childId}_${item.date}_${item.recordType || ''}`;
  return JSON.stringify(item);
}

function parseArray(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(value) ? value : [];
  } catch (e) {
    return [];
  }
}

/**
 * Build a backup object from a key -> raw localStorage string map.
 * @param {Record<string, string|null>} storage
 * @param {string} source where it came from (hostname), for the confirmation text
 */
export function buildBackup(storage, source) {
  const data = {};
  BACKUP_KEYS.forEach(key => {
    if (storage[key] !== null && storage[key] !== undefined) data[key] = storage[key];
  });
  return { format: BACKUP_FORMAT, version: 1, source, exportedAt: new Date().toISOString(), data };
}

/**
 * Validate a parsed backup file. Returns an error message, or '' when usable.
 * @param {any} backup
 */
export function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') return 'This file is not a backup.';
  if (backup.format !== BACKUP_FORMAT) return 'This file is not a Child Health backup.';
  if (!backup.data || typeof backup.data !== 'object') return 'The backup file is empty.';
  return '';
}

/**
 * Work out what a restore would add, without changing anything.
 *
 * Deleted records (tombstones in either copy) are never brought back.
 *
 * @param {Record<string, string|null>} current destination's raw values
 * @param {{data: Record<string, string>}} backup
 * @returns {{merged: Record<string, string>, added: Record<string, number>, totalAdded: number}}
 *   `merged` holds the new raw value for every key that gains records.
 */
export function planRestore(current, backup) {
  const tombstones = [...parseArray(current['chm-deleted']), ...parseArray(backup.data['chm-deleted'])];
  const deletedIds = new Map(); // key -> Set(recordId)
  tombstones.forEach(t => {
    if (!t || !t.key || t.recordId === undefined) return;
    if (!deletedIds.has(t.key)) deletedIds.set(t.key, new Set());
    deletedIds.get(t.key).add(String(t.recordId));
  });

  const merged = {};
  const added = {};
  let totalAdded = 0;

  BACKUP_KEYS.filter(key => key.startsWith('chm-')).forEach(key => {
    const existing = parseArray(current[key]);
    const incoming = parseArray(backup.data[key]);
    if (incoming.length === 0) return;

    const known = new Set(existing.map(recordKey));
    const gone = deletedIds.get(key) || new Set();
    const additions = incoming.filter(item => {
      if (!item || typeof item !== 'object') return false;
      if (item.id !== undefined && gone.has(String(item.id))) return false;
      const k = recordKey(item);
      if (known.has(k)) return false;
      known.add(k);
      return true;
    });

    if (additions.length > 0) {
      merged[key] = JSON.stringify([...existing, ...additions]);
      added[key] = additions.length;
      totalAdded += additions.length;
    }
  });

  // Org settings: only fill in values the destination does not have yet.
  BACKUP_KEYS.filter(key => !key.startsWith('chm-')).forEach(key => {
    const value = backup.data[key];
    if (value && !current[key]) merged[key] = value;
  });

  return { merged, added, totalAdded };
}
