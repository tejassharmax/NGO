/* ═══════════════════════════════════════════════════════
   CHILD HEALTH MANAGEMENT — DATA LAYER
   All data is stored in localStorage as JSON.
   ═══════════════════════════════════════════════════════ */

import { apiFetch } from './apiClient.js';

const CHILDREN_KEY = 'chm-children';
const ACTIVITY_KEY = 'chm-activity';
const PENDING_KEY = 'chm-pending-docs';
const DOCS_KEY = 'chm-documents';
const GROWTH_KEY = 'chm-growth';
const NUTRITION_KEY = 'chm-nutrition';
const MEDICINES_KEY = 'chm-medicines';
const APPOINTMENTS_KEY = 'chm-appointments';
const EMERGENCY_KEY = 'chm-emergency';
const SPONSORS_KEY = 'chm-sponsors';
const EXPENSES_KEY = 'chm-expenses';
const ALERTS_KEY = 'chm-alerts';
const HEALTH_RECORDS_KEY = 'chm-health-records';

/* ─── Children (was Students) ─── */

const PRESET_IDS = ['CH-1025', 'CH-1026', 'CH-1027', 'CH-1028', 'CH-1029', 'CH-3923', 'CH-3136', 'CH-8372', 'CH-1001', 'CH-1002', 'CH-3938', 'CH-1079'];
const PRESET_NAMES = ['Naveen Roy', 'Aisha Khan', 'Aarav Sharma', 'Ananya Patil', 'Diya Nair', 'Ananya Patel'];

export function getChildren() {
  let data = localStorage.getItem(CHILDREN_KEY);
  if (!data) {
    seedDatabase();
    data = localStorage.getItem(CHILDREN_KEY);
  }
  const list = JSON.parse(data || '[]');
  const filtered = list.filter(c => c && !PRESET_IDS.includes(c.id) && !PRESET_NAMES.includes(c.name));
  if (filtered.length !== list.length) {
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(filtered));
  }
  return filtered;
}

export function addChild(child) {
  const children = getChildren();
  children.unshift(child);
  localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
  logActivity('child_added', child.name, 'New child registered');
  return child;
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
}

export function getChild(id) {
  return getChildren().find(c => c.id === id) || getChildren()[0];
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

export function activityIcon(type) {
  const map = {
    'doc_processed': 'scan',
    'child_added': 'users',
    'child_updated': 'pencil',
    'child_removed': 'trash',
    'doc_verified': 'check',
    'doc_uploaded': 'upload',
    'export_created': 'download',
    'growth_logged': 'chart',
    'meal_logged': 'apple',
    'medicine_added': 'pill',
    'appointment_added': 'calendar',
    'expense_logged': 'wallet',
    'sponsor_added': 'heart',
    'health_alert': 'alertCircle'
  };
  return map[type] || 'clock';
}

export function activityLabel(type) {
  const map = {
    'doc_processed': 'Document processed',
    'child_added': 'New child registered',
    'child_updated': 'Profile updated',
    'child_removed': 'Child removed',
    'doc_verified': 'Record verified',
    'doc_uploaded': 'Document uploaded',
    'export_created': 'Export created',
    'growth_logged': 'Growth recorded',
    'meal_logged': 'Meal logged',
    'medicine_added': 'Medicine prescribed',
    'appointment_added': 'Appointment scheduled',
    'expense_logged': 'Expense recorded',
    'sponsor_added': 'Sponsor added',
    'health_alert': 'Health alert'
  };
  return map[type] || 'Activity';
}

/* ─── Pending Documents ─── */

export function getPendingDocs() {
  return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
}

export function addPendingDoc(docName, childName) {
  const docs = getPendingDocs();
  docs.unshift({ docName, childName, timestamp: Date.now() });
  if (docs.length > 20) docs.length = 20;
  localStorage.setItem(PENDING_KEY, JSON.stringify(docs));
}

export function removePendingDoc(index) {
  const docs = getPendingDocs();
  docs.splice(index, 1);
  localStorage.setItem(PENDING_KEY, JSON.stringify(docs));
}

/* ─── Uploaded Documents ─── */

export function getUploadedDocs() {
  return JSON.parse(localStorage.getItem(DOCS_KEY) || '[]');
}

export function addUploadedDoc(docName, childName, fileData, status = 'Verified', docType = 'Medical report', childId = null) {
  const docs = getUploadedDocs();
  docs.unshift({
    id: `DOC-${Date.now()}`,
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
    timestamp: Date.now()
  });
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export function deleteUploadedDoc(index) {
  const docs = getUploadedDocs();
  docs.splice(index, 1);
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export function getGrowthRecords(childId) {
  const all = JSON.parse(localStorage.getItem(GROWTH_KEY) || '[]');
  all.sort((a, b) => (b.timestamp || new Date(b.date).getTime() || 0) - (a.timestamp || new Date(a.date).getTime() || 0));
  return childId ? all.filter(r => r.childId === childId) : all;
}

export function addGrowthRecord(record) {
  const all = JSON.parse(localStorage.getItem(GROWTH_KEY) || '[]');
  record.timestamp = Date.now();
  record.bmi = record.weight && record.height
    ? +(record.weight / ((record.height / 100) ** 2)).toFixed(1)
    : null;
  all.unshift(record);
  localStorage.setItem(GROWTH_KEY, JSON.stringify(all));
  logActivity('growth_logged', record.childName || 'Child', `Height: ${record.height}cm, Weight: ${record.weight}kg`);
  return record;
}

/* ─── Nutrition / Meal Log ─── */

export function getMeals(childId, dateStr) {
  const all = JSON.parse(localStorage.getItem(NUTRITION_KEY) || '[]');
  let filtered = all;
  if (childId) filtered = filtered.filter(m => m.childId === childId);
  if (dateStr) filtered = filtered.filter(m => m.date === dateStr);
  return filtered;
}

export function getAllMeals() {
  return JSON.parse(localStorage.getItem(NUTRITION_KEY) || '[]');
}

export function addMeal(meal) {
  const all = JSON.parse(localStorage.getItem(NUTRITION_KEY) || '[]');
  meal.timestamp = Date.now();
  all.unshift(meal);
  localStorage.setItem(NUTRITION_KEY, JSON.stringify(all));
  logActivity('meal_logged', meal.childName || 'Child', `${meal.mealType}: ${meal.description}`);
  return meal;
}

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

export function updateMedicine(med) {
  const all = JSON.parse(localStorage.getItem(MEDICINES_KEY) || '[]');
  const idx = all.findIndex(m => m.id === med.id);
  if (idx !== -1) all[idx] = med;
  localStorage.setItem(MEDICINES_KEY, JSON.stringify(all));
  return med;
}

/* ─── Appointments ─── */

export function getAppointments(childId) {
  const all = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');
  return childId ? all.filter(a => a.childId === childId) : all;
}

export function addAppointment(appt) {
  const all = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');
  appt.id = appt.id || `APT-${Date.now()}`;
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
  const filtered = all.filter(a => String(a.id) !== String(id));
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(filtered));
  return true;
}

/* ─── Emergency Contacts ─── */

export function getEmergencyContacts() {
  return JSON.parse(localStorage.getItem(EMERGENCY_KEY) || '[]');
}

export function addEmergencyContact(contact) {
  const all = getEmergencyContacts();
  contact.id = contact.id || `EMC-${Date.now()}`;
  contact.timestamp = Date.now();
  all.unshift(contact);
  localStorage.setItem(EMERGENCY_KEY, JSON.stringify(all));
  return contact;
}

export function deleteEmergencyContact(id) {
  const all = getEmergencyContacts().filter(c => c.id !== id);
  localStorage.setItem(EMERGENCY_KEY, JSON.stringify(all));
}

/* ─── Sponsors ─── */

export function getSponsors() {
  return JSON.parse(localStorage.getItem(SPONSORS_KEY) || '[]');
}

export function addSponsor(sponsor) {
  const all = getSponsors();
  sponsor.id = sponsor.id || `SP-${Date.now()}`;
  sponsor.timestamp = Date.now();
  all.unshift(sponsor);
  localStorage.setItem(SPONSORS_KEY, JSON.stringify(all));
  logActivity('sponsor_added', sponsor.name, 'New sponsor registered');
  return sponsor;
}

export function updateSponsor(sponsor) {
  const all = getSponsors();
  const idx = all.findIndex(s => s.id === sponsor.id);
  if (idx !== -1) all[idx] = sponsor;
  localStorage.setItem(SPONSORS_KEY, JSON.stringify(all));
  return sponsor;
}

export function deleteSponsor(id) {
  const all = getSponsors().filter(s => s.id !== id);
  localStorage.setItem(SPONSORS_KEY, JSON.stringify(all));
}

/* ─── Expenses ─── */

export function getExpenses(month) {
  const all = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
  if (month) return all.filter(e => e.date && e.date.startsWith(month));
  return all;
}

export function addExpense(expense) {
  const all = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
  expense.id = expense.id || `EXP-${Date.now()}`;
  expense.timestamp = Date.now();
  all.unshift(expense);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(all));
  logActivity('expense_logged', expense.category || 'Expense', `₹${expense.amount} — ${expense.description}`);
  return expense;
}

export function deleteExpense(id) {
  const all = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]').filter(e => e.id !== id);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(all));
}

/* ─── Health Records (Lab results, test reports) ─── */

export function getHealthRecords(childId) {
  const all = JSON.parse(localStorage.getItem(HEALTH_RECORDS_KEY) || '[]');
  return childId ? all.filter(r => r.childId === childId) : all;
}

export function addHealthRecord(record) {
  const all = JSON.parse(localStorage.getItem(HEALTH_RECORDS_KEY) || '[]');
  record.id = record.id || `HR-${Date.now()}`;
  record.timestamp = Date.now();
  all.unshift(record);
  localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(all));
  return record;
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

export function addAlert(alert) {
  const all = getAlerts();
  alert.id = alert.id || `ALR-${Date.now()}`;
  alert.timestamp = Date.now();
  all.unshift(alert);
  if (all.length > 100) all.length = 100;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(all));
  return alert;
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

export function ageGroup(dob) {
  if (!dob) return 'Unknown';
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return 'Unknown';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
  if (years < 1) return '0–1 years';
  if (years < 3) return '1–3 years';
  if (years < 5) return '3–5 years';
  if (years < 8) return '5–8 years';
  if (years < 12) return '8–12 years';
  return '12+ years';
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
  localStorage.setItem(SPONSORS_KEY, JSON.stringify([]));
  localStorage.setItem(EXPENSES_KEY, JSON.stringify([]));
  localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify([]));
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify([]));
  localStorage.setItem(ALERTS_KEY, JSON.stringify([]));
}

/* ───────────────────────────────────────────────────────
   DATA SYNC WITH SERVER-SIDE DB
   ─────────────────────────────────────────────────────── */
let isSyncing = false;

export async function syncWithServer() {
  if (isSyncing) return;
  try {
    isSyncing = true;
    getChildren();
    const keys = [
      CHILDREN_KEY, ACTIVITY_KEY, PENDING_KEY, DOCS_KEY, GROWTH_KEY,
      NUTRITION_KEY, MEDICINES_KEY, APPOINTMENTS_KEY, EMERGENCY_KEY,
      EXPENSES_KEY, ALERTS_KEY, HEALTH_RECORDS_KEY,
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
      // Apply merged state from server without overwriting non-empty local storage with empty server state
      Object.keys(serverData).forEach(k => {
        if (serverData[k] !== null && serverData[k] !== undefined) {
          const localStr = localStorage.getItem(k);
          if (!localStr || localStr === '[]' || localStr === '') {
            if (serverData[k] !== '[]' && serverData[k] !== '') {
              localStorage.setItem(k, serverData[k]);
            }
          } else if (serverData[k] && serverData[k] !== '[]') {
            try {
              const localArr = JSON.parse(localStr);
              const serverArr = JSON.parse(serverData[k]);
              if (Array.isArray(localArr) && Array.isArray(serverArr)) {
                const map = new Map();
                serverArr.concat(localArr).forEach(item => {
                  if (item) {
                    const key = item.id || JSON.stringify(item);
                    map.set(key, item);
                  }
                });
                localStorage.setItem(k, JSON.stringify(Array.from(map.values())));
              }
            } catch (e) {
              localStorage.setItem(k, serverData[k]);
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn('Sync failed (offline or server starting):', err);
  } finally {
    isSyncing = false;
  }
}

function triggerSync() {
  syncWithServer().catch(err => console.warn('Background sync failed:', err));
}

// Intercept localStorage sets to trigger background sync when key changes
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  originalSetItem(key, value);
  if (!isSyncing && (key.startsWith('chm-') || key.startsWith('sample-org-'))) {
    triggerSync();
  }
};
