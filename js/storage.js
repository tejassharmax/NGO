/* ═══════════════════════════════════════════════════════
   CHILD HEALTH MANAGEMENT — DATA LAYER
   All data is stored in localStorage as JSON.
   ═══════════════════════════════════════════════════════ */

import { apiFetch } from './apiClient.js';
import { showProgressBar, hideProgressBar } from './utils.js';

const CHILDREN_KEY = 'chm-children';
const ACTIVITY_KEY = 'chm-activity';
const PENDING_KEY = 'chm-pending-docs';
const DOCS_KEY = 'chm-documents';
const GROWTH_KEY = 'chm-growth';
const NUTRITION_KEY = 'chm-nutrition';
const MEDICINES_KEY = 'chm-medicines';
const APPOINTMENTS_KEY = 'chm-appointments';
const EMERGENCY_KEY = 'chm-emergency';
const EXPENSES_KEY = 'chm-expenses';
const ALERTS_KEY = 'chm-alerts';
const HEALTH_RECORDS_KEY = 'chm-health-records';
const DELETED_KEY = 'chm-deleted';

/* ─── Children (was Students) ─── */

export function getChildren() {
  let data = localStorage.getItem(CHILDREN_KEY);
  if (!data) {
    seedDatabase();
    data = localStorage.getItem(CHILDREN_KEY);
  }
  return JSON.parse(data || '[]');
}

export function updateChild(child) {
  const children = getChildren();
  const idx = children.findIndex(c => c.id === child.id);
  if (idx !== -1) {
    children[idx] = child;
    logActivity('child_updated', child.name, 'Child record updated');
  } else {
    children.unshift(child);
    logActivity('child_added', child.name, 'New child registered');
  }
  localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
  return child;
}

export function deleteChild(id) {
  const child = getChildren().find(c => c.id === id);
  localStorage.setItem(CHILDREN_KEY, JSON.stringify(getChildren().filter(c => c.id !== id)));
  if (child) {
    logActivity('child_removed', child.name, 'Child record removed');
  }

  // Clean up child-specific records across localStorage so they don't linger
  ['chm-growth', 'chm-appointments', 'chm-medicines', 'chm-alerts', 'chm-health-records', 'chm-documents'].forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const filtered = arr.filter(item => item && item.childId !== id);
          if (filtered.length !== arr.length) {
            // Documents are client-authoritative on the server; the rest need tombstones.
            if (key !== DOCS_KEY) recordDeletions(key, arr.filter(item => item && item.childId === id));
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      }
    } catch (e) {}
  });
}

/* ─── Deletion tombstones ─── */

/**
 * Remember that records were deleted so the sync server drops them on every
 * device. Without this, union-merging with the server copy brought deleted
 * appointments and checkups straight back. See js/server/syncMerge.js.
 * @param {string} key  collection key, e.g. 'chm-appointments'
 * @param {object[]} items  the records being deleted (records without an id are skipped)
 */
function recordDeletions(key, items) {
  const ids = (items || []).map(i => i && i.id).filter(recordId => recordId !== undefined && recordId !== null && recordId !== '');
  if (ids.length === 0) return;
  let list = [];
  try { list = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'); } catch (e) { }
  if (!Array.isArray(list)) list = [];
  const known = new Set(list.map(t => t && t.id));
  const deletedAt = new Date().toISOString();
  ids.forEach(recordId => {
    const tombstoneId = `${key}:${recordId}`;
    if (!known.has(tombstoneId)) list.push({ id: tombstoneId, key, recordId: String(recordId), deletedAt });
  });
  localStorage.setItem(DELETED_KEY, JSON.stringify(list));
}

/** Drop tombstoned records from a collection array. */
function withoutDeleted(key, arr, tombstones) {
  const ids = new Set(tombstones.filter(t => t && t.key === key).map(t => String(t.recordId)));
  if (ids.size === 0) return arr;
  return arr.filter(item => !(item && item.id !== undefined && ids.has(String(item.id))));
}

export function getChild(id) {
  if (!id) return null;
  return getChildren().find(c => c.id === id) || null;
}

export function reorderChildren(orderedIds) {
  const children = getChildren();
  const map = new Map(children.map(c => [c.id, c]));
  const reordered = orderedIds.map(id => map.get(id)).filter(Boolean);
  // Append any children not in orderedIds (safety net)
  children.forEach(c => { if (!orderedIds.includes(c.id)) reordered.push(c); });
  localStorage.setItem(CHILDREN_KEY, JSON.stringify(reordered));
}

/* ─── Activity Log ─── */

export function logActivity(type, subject, description) {
  const activities = getActivities();
  activities.unshift({ type, subject, description, timestamp: Date.now() });
  if (activities.length > 50) activities.length = 50;
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
}

export function getActivities() {
  return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
}

export function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/* ─── Pending Documents ─── */

/* ─── Uploaded Documents ─── */

export function getUploadedDocs() {
  return JSON.parse(localStorage.getItem(DOCS_KEY) || '[]');
}

export function addUploadedDoc(docName, childName, fileData, status = 'Verified', docType = 'Medical report', childId = null, driveFileId = null, driveUrl = null) {
  const docs = getUploadedDocs();
  const newDoc = {
    id: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: docName,
    child: childName,
    childName: childName,
    childId: childId,
    docType: docType,
    category: docType,
    meta: fileData ? `File · ${Math.round(fileData.length * 0.75 / 1024)} KB` : 'No file',
    status: status,
    image: fileData,
    fileData: fileData,
    driveFileId: driveFileId || null,
    driveUrl: driveUrl || null,
    timestamp: Date.now()
  };
  docs.unshift(newDoc);
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  return newDoc;
}

export function updateUploadedDoc(docId, updates) {
  if (!docId) return null;
  const docs = getUploadedDocs();
  const doc = docs.find(d => d.id === docId);
  if (doc) {
    Object.assign(doc, updates);
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
    return doc;
  }
  return null;
}

export function deleteUploadedDoc(idOrIndex) {
  const docs = getUploadedDocs();
  let deletedDoc = null;
  let updatedDocs;

  if (typeof idOrIndex === 'string' && idOrIndex.trim()) {
    deletedDoc = docs.find(d => (d.id && d.id === idOrIndex) || (d.name && d.name === idOrIndex));
    updatedDocs = docs.filter(d => d.id !== idOrIndex && d.name !== idOrIndex);
  } else if (typeof idOrIndex === 'number' && !isNaN(idOrIndex)) {
    deletedDoc = docs[idOrIndex];
    docs.splice(idOrIndex, 1);
    updatedDocs = docs;
  } else {
    updatedDocs = docs.filter(d => d.id !== idOrIndex);
  }

  localStorage.setItem(DOCS_KEY, JSON.stringify(updatedDocs));
  if (deletedDoc) {
    logActivity('doc_deleted', deletedDoc.child || deletedDoc.childName || 'Child', `Deleted document: ${deletedDoc.name || 'Medical Document'}`);
  }
  return updatedDocs;
}

export function getGrowthRecords(childId) {
  const all = JSON.parse(localStorage.getItem(GROWTH_KEY) || '[]');
  all.sort((a, b) => (b.timestamp || new Date(b.date).getTime() || 0) - (a.timestamp || new Date(a.date).getTime() || 0));
  return childId ? all.filter(r => r.childId === childId) : all;
}

export function addGrowthRecord(record) {
  return saveGrowthRecord(record);
}

export function saveGrowthRecord(record) {
  const all = JSON.parse(localStorage.getItem(GROWTH_KEY) || '[]');
  record.id = record.id || `GW-${Date.now()}`;
  record.timestamp = record.timestamp || Date.now();
  record.date = record.date || new Date().toISOString().slice(0, 10);
  record.height = record.height ? String(record.height).replace(/[^0-9.]/g, '').trim() : '';
  record.weight = record.weight ? String(record.weight).replace(/[^0-9.]/g, '').trim() : '';
  record.bmi = record.weight && record.height
    ? +(Number(record.weight) / ((Number(record.height) / 100) ** 2)).toFixed(1)
    : null;

  // Check if an existing record with the same ID or (same childId AND same date) exists
  const existingIdx = all.findIndex(r => (record.id && r.id === record.id) || (r.childId === record.childId && r.date && r.date === record.date));
  const vitalsSummary = [record.height && `${record.height}cm`, record.weight && `${record.weight}kg`, record.temperature && `${record.temperature}°F`, record.bp && `BP ${record.bp}`].filter(Boolean).join(', ') || 'Clinical checkup';
  if (existingIdx !== -1) {
    all[existingIdx] = { ...all[existingIdx], ...record };
    logActivity('growth_updated', record.childName || 'Child', `Updated vitals for ${record.date}: ${vitalsSummary}`);
  } else {
    all.unshift(record);
    logActivity('growth_logged', record.childName || 'Child', `New vitals for ${record.date}: ${vitalsSummary}`);
  }

  // Sort descending by date
  all.sort((a, b) => (new Date(b.date || b.timestamp).getTime() || 0) - (new Date(a.date || a.timestamp).getTime() || 0));
  localStorage.setItem(GROWTH_KEY, JSON.stringify(all));

  // If this record belongs to a child, update the child's top-level vitals if it's the latest date
  if (record.childId) {
    const children = getChildren();
    const childIdx = children.findIndex(c => c.id === record.childId);
    if (childIdx !== -1) {
      const child = children[childIdx];
      const childRecords = all.filter(r => r.childId === record.childId);
      const newest = childRecords[0];
      if (newest && (newest.id === record.id || newest.date === record.date)) {
        if (record.height) child.height = record.height;
        if (record.weight) child.weight = record.weight;
        if (record.medicalConditions !== undefined) child.medicalConditions = record.medicalConditions;
        if (record.allergies !== undefined) child.allergies = record.allergies;
        if (record.medications !== undefined) child.medications = record.medications;
        if (record.dentalRemarks !== undefined) child.dentalRemarks = record.dentalRemarks;
        if (record.hygieneIndex !== undefined) child.hygieneIndex = record.hygieneIndex;
        if (record.healthStatus !== undefined) child.healthStatus = record.healthStatus;
        updateChild(child);
      }
    }
  }

  return record;
}

/**
 * Delete a checkup/growth record by id. Legacy records without an id are addressed
 * by date, which is only unique per child — so a date match is limited to childId,
 * never applied across every child's records on that day.
 */
export function deleteGrowthRecord(id, childId) {
  const all = JSON.parse(localStorage.getItem(GROWTH_KEY) || '[]');
  const matches = (r) => (r.id && r.id === id) || (!r.id && r.date === id && (!childId || r.childId === childId));
  recordDeletions(GROWTH_KEY, all.filter(matches));
  localStorage.setItem(GROWTH_KEY, JSON.stringify(all.filter(r => !matches(r))));
}

/* ─── Nutrition / Meal Log ─── */

/* ─── Medicine Management ─── */

export function getMedicines(childId) {
  const all = JSON.parse(localStorage.getItem(MEDICINES_KEY) || '[]');
  return childId ? all.filter(m => m.childId === childId) : all;
}

export function addMedicine(med) {
  const all = JSON.parse(localStorage.getItem(MEDICINES_KEY) || '[]');
  med.id = med.id || `MED-${Date.now()}`;
  med.timestamp = Date.now();
  all.unshift(med);
  localStorage.setItem(MEDICINES_KEY, JSON.stringify(all));
  logActivity('medicine_added', med.childName || 'Child', `${med.medicineName} — ${med.dosage}`);
  return med;
}

/* ─── Appointments ─── */

export function getAppointments(childId) {
  const all = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');
  return childId ? all.filter(a => a.childId === childId) : all;
}

export function addAppointment(appt) {
  const all = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');

  // Guard against duplicate creation within 5 seconds for same child, date, time & type
  const isDuplicate = all.some(a =>
    a.childId === appt.childId &&
    a.date === appt.date &&
    (a.time || '10:00') === (appt.time || '10:00') &&
    a.type === appt.type &&
    Math.abs((a.timestamp || 0) - Date.now()) < 5000
  );
  if (isDuplicate) {
    console.warn('[Storage] Duplicate appointment creation prevented for:', appt.childName, appt.date);
    return all.find(a => a.childId === appt.childId && a.date === appt.date && (a.time || '10:00') === (appt.time || '10:00') && a.type === appt.type);
  }

  appt.id = appt.id || `APT-${appt.childId || 'GEN'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  appt.timestamp = Date.now();
  all.unshift(appt);
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(all));
  logActivity('appointment_added', appt.childName || 'Child', `${appt.type} on ${appt.date}`);
  return appt;
}

export function updateAppointment(appt) {
  const all = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');
  const idx = all.findIndex(a => a.id === appt.id);
  if (idx !== -1) all[idx] = appt;
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(all));
  return appt;
}

export function deleteAppointment(id) {
  const all = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');
  recordDeletions(APPOINTMENTS_KEY, all.filter(a => String(a.id) === String(id)));
  const filtered = all.filter(a => String(a.id) !== String(id));
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(filtered));
  return true;
}

/* ─── Health Records (Lab results, test reports) ─── */

export function getHealthRecords(childId) {
  const all = JSON.parse(localStorage.getItem(HEALTH_RECORDS_KEY) || '[]');
  return childId ? all.filter(r => r.childId === childId) : all;
}

export function saveHealthRecord(record) {
  const all = JSON.parse(localStorage.getItem(HEALTH_RECORDS_KEY) || '[]');
  record.id = record.id || `HR-${Date.now()}`;
  record.timestamp = record.timestamp || Date.now();
  record.date = record.date || new Date().toISOString().slice(0, 10);

  // Check if an existing record with same ID or (same childId AND same date) exists
  const existingIdx = all.findIndex(r => (record.id && r.id === record.id) || (r.childId === record.childId && r.date && r.date === record.date));
  if (existingIdx !== -1) {
    all[existingIdx] = { ...all[existingIdx], ...record };
    logActivity('health_record_updated', record.childName || 'Child', `Updated blood test report for ${record.date}`);
  } else {
    all.unshift(record);
    logActivity('health_record_logged', record.childName || 'Child', `New blood test report for ${record.date}`);
  }

  // Sort descending by date
  all.sort((a, b) => (new Date(b.date || b.timestamp).getTime() || 0) - (new Date(a.date || a.timestamp).getTime() || 0));
  localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(all));
  return record;
}

export function deleteHealthRecord(id) {
  const all = JSON.parse(localStorage.getItem(HEALTH_RECORDS_KEY) || '[]');
  const matches = (r) => r.id === id;
  recordDeletions(HEALTH_RECORDS_KEY, all.filter(matches));
  localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(all.filter(r => !matches(r))));
}

/* ─── Alerts ─── */

export function getAlerts() {
  let alerts = JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]');
  const children = getChildren();
  const appointments = getAppointments();
  const medicines = getMedicines();
  const now = Date.now();
  const dynamicAlerts = [];

  // 1. Check for overdue appointments
  appointments.forEach(appt => {
    if (appt.status === 'Upcoming' && new Date(appt.date).getTime() < now - 24 * 3600 * 1000) {
      const alertId = `ALR-OVERDUE-${appt.id}`;
      if (!alerts.some(a => a.id === alertId)) {
        dynamicAlerts.push({
          id: alertId,
          type: 'warning',
          childName: appt.childName,
          message: `Reminder: Overdue appointment: ${appt.type} with ${appt.doctor} was scheduled for ${appt.date}`,
          timestamp: now,
          dismissed: false
        });
      }
    }
  });

  // 2. Check for missing Aadhaar or ID documents
  children.forEach(child => {
    if (!child.idNumber || child.idNumber.trim() === '') {
      const alertId = `ALR-MISSING-ID-${child.id}`;
      if (!alerts.some(a => a.id === alertId)) {
        dynamicAlerts.push({
          id: alertId,
          type: 'info',
          childName: child.name,
          message: `Missing records: No ID card/Aadhaar registered for ${child.name}`,
          timestamp: now,
          dismissed: false
        });
      }
    }
  });

  // 3. Check for alarming blood test reports (hemoglobin < 11.0)
  const healthRecords = JSON.parse(localStorage.getItem(HEALTH_RECORDS_KEY) || '[]');
  healthRecords.forEach(record => {
    if (record.hemoglobin && parseFloat(record.hemoglobin) < 11.0) {
      const alertId = `ALR-ANEMIA-${record.childId}-${record.date}`;
      if (!alerts.some(a => a.id === alertId)) {
        dynamicAlerts.push({
          id: alertId,
          type: 'critical',
          childName: record.childName,
          message: `Critical blood values: Low Hemoglobin (${record.hemoglobin} g/dL) detected on ${record.date}`,
          timestamp: now,
          dismissed: false
        });
      }
    }
  });

  // 4. Check for low supplies (medication ending soon)
  medicines.forEach(med => {
    if (med.status === 'Active' && med.endDate) {
      const remainingTime = new Date(med.endDate).getTime() - now;
      if (remainingTime > 0 && remainingTime < 3 * 24 * 3600 * 1000) {
        const alertId = `ALR-MED-LOW-${med.id}`;
        if (!alerts.some(a => a.id === alertId)) {
          dynamicAlerts.push({
            id: alertId,
            type: 'warning',
            childName: med.childName,
            message: `Running low: Medication "${med.medicineName}" supply ending soon (${med.endDate})`,
            timestamp: now,
            dismissed: false
          });
        }
      }
    }
  });

  if (dynamicAlerts.length > 0) {
    alerts = [...dynamicAlerts, ...alerts];
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }

  return alerts;
}

export function dismissAlert(id) {
  const all = getAlerts().map(a => a.id === id ? { ...a, dismissed: true } : a);
  localStorage.setItem(ALERTS_KEY, JSON.stringify(all));
}

/* ─── Utility: Calculate age from DOB ─── */

export function calculateAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return '';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
  if (years < 1) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return `${months} mo`;
  }
  return `${years} yr`;
}

/* ─── Health Status Calculator ─── */

export function healthStatus(child) {
  const flags = [];
  // Check for anemia (low hemoglobin)
  const records = getHealthRecords(child.id);
  const latestCBC = records.find(r => r.type === 'cbc');
  if (latestCBC && latestCBC.hemoglobin) {
    const hb = parseFloat(latestCBC.hemoglobin);
    if (hb < 11) flags.push('Anemia risk');
  }
  // Check BMI
  const growth = getGrowthRecords(child.id);
  if (growth.length > 0) {
    const latest = growth[0];
    if (latest.bmi && latest.bmi < 16) flags.push('Undernourished');
  }
  // Check overdue checkups
  const appts = getAppointments(child.id);
  const overdue = appts.filter(a => a.status !== 'Completed' && new Date(a.date) < new Date());
  if (overdue.length > 0) flags.push('Overdue checkup');

  // Check allergies / medical conditions
  if (child.medicalConditions && child.medicalConditions.trim()) flags.push('Has conditions');

  if (flags.length === 0) return { level: 'good', label: 'Healthy', flags };
  if (flags.some(f => f.includes('Anemia') || f.includes('Undernourished'))) return { level: 'critical', label: 'Needs attention', flags };
  return { level: 'warning', label: 'Review needed', flags };
}

function seedDatabase() {
  localStorage.setItem(CHILDREN_KEY, JSON.stringify([]));
  localStorage.setItem(GROWTH_KEY, JSON.stringify([]));
  localStorage.setItem(NUTRITION_KEY, JSON.stringify([]));
  localStorage.setItem(MEDICINES_KEY, JSON.stringify([]));
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([]));
  localStorage.setItem(EMERGENCY_KEY, JSON.stringify([]));
  localStorage.setItem(EXPENSES_KEY, JSON.stringify([]));
  localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify([]));
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify([]));
  localStorage.setItem(ALERTS_KEY, JSON.stringify([]));
}

/* ───────────────────────────────────────────────────────
   DATA SYNC WITH SERVER-SIDE DB
   ─────────────────────────────────────────────────────── */
let isSyncing = false;

/**
 * Hydrate state directly from server on fresh browser open / login
 */
export async function hydrateFromServer() {
  try {
    isSyncing = true;
    const res = await apiFetch('/api/sync');
    if (res.ok) {
      const serverData = await res.json();
      if (serverData && typeof serverData === 'object') {
        let hasLocalChangesToPush = false;
        // Deletions known to either side, so a stale local copy is not revived below.
        const parseList = (raw) => { try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
        const tombstones = [...parseList(serverData[DELETED_KEY]), ...parseList(localStorage.getItem(DELETED_KEY))];
        Object.keys(serverData).forEach(k => {
          if (serverData[k] !== null && serverData[k] !== undefined && serverData[k] !== 'null') {
            if (k.startsWith('chm-')) {
              // Safely merge server array with local array so offline/unsynced local entries are never lost
              const localRaw = localStorage.getItem(k);
              if (localRaw) {
                try {
                  const localArr = JSON.parse(localRaw);
                  const serverArr = JSON.parse(serverData[k]);
                  if (Array.isArray(localArr) && Array.isArray(serverArr) && localArr.length > 0) {
                    const itemMap = new Map();
                    // Same identity rule as the server (js/server/syncMerge.js): id first,
                    // so an edited appointment replaces its old copy instead of duplicating.
                    const keyFn = item => {
                      if (!item) return '';
                      if (item.id) return String(item.id);
                      if (item.childId && item.date && item.time && item.type) return `APT_${item.childId}_${item.date}_${item.time}_${item.type}`;
                      if (item.childId && item.date) return `${item.childId}_${item.date}_${item.recordType || ''}`;
                      return JSON.stringify(item);
                    };
                    serverArr.forEach(item => { if (item) itemMap.set(keyFn(item), item); });
                    localArr.forEach(item => {
                      if (!item) return;
                      const id = keyFn(item);
                      if (!itemMap.has(id)) {
                        hasLocalChangesToPush = true;
                      }
                      itemMap.set(id, item);
                    });
                    const merged = withoutDeleted(k, Array.from(itemMap.values()), tombstones);
                    originalSetItem(k, JSON.stringify(merged));
                    return;
                  }
                } catch (e) { }
              }
            }
            originalSetItem(k, serverData[k]);
          }
        });
        if (hasLocalChangesToPush) {
          setTimeout(() => { syncWithServer().catch(() => {}); }, 600);
        }
        return true;
      }
    }
  } catch (e) {
    console.warn('[Storage] Hydration notice:', e);
  } finally {
    isSyncing = false;
  }
  return false;
}

let syncPending = false;

export async function syncWithServer() {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  if (isSyncing) {
    syncPending = true;
    return;
  }
  try {
    isSyncing = true;
    showProgressBar(45);
    const keys = [
      CHILDREN_KEY, ACTIVITY_KEY, PENDING_KEY, DOCS_KEY, GROWTH_KEY,
      NUTRITION_KEY, MEDICINES_KEY, APPOINTMENTS_KEY, EMERGENCY_KEY,
      EXPENSES_KEY, ALERTS_KEY, HEALTH_RECORDS_KEY, DELETED_KEY,
      'sample-org-name', 'sample-org-code', 'sample-org-email', 'sample-org-timezone'
    ];

    // Pack local state
    const payload = {};
    keys.forEach(k => {
      payload[k] = localStorage.getItem(k);
    });

    // POST payload to merge/save on server (relative URL + auth token)
    const res = await apiFetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const serverData = await res.json();
      // Apply merged state from server without triggering interceptor loops
      Object.keys(serverData).forEach(k => {
        if (serverData[k] !== null && serverData[k] !== undefined && serverData[k] !== 'null') {
          originalSetItem(k, serverData[k]);
        }
      });
    }
  } catch (err) {
    console.warn('Sync failed (offline or server starting):', err);
  } finally {
    isSyncing = false;
    hideProgressBar();
    if (syncPending) {
      syncPending = false;
      syncWithServer().catch(() => {});
    }
  }
}

let syncDebounceTimer = null;

function triggerSync() {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    syncWithServer().catch(err => console.warn('Background sync failed:', err));
  }, 1500);
}

// Intercept localStorage sets to trigger background sync when key changes
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  originalSetItem(key, value);
  if (!isSyncing && (key.startsWith('chm-') || key.startsWith('sample-org-'))) {
    triggerSync();
  }
};
