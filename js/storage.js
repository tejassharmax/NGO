/* ═══════════════════════════════════════════════════════
   CHILD HEALTH MANAGEMENT — DATA LAYER
   All data is stored in localStorage as JSON.
   ═══════════════════════════════════════════════════════ */

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

export function getChildren() {
  const data = localStorage.getItem(CHILDREN_KEY);
  // Migrate from old key if needed
  if (!data) {
    const oldData = localStorage.getItem('sample-students');
    if (oldData) {
      localStorage.setItem(CHILDREN_KEY, oldData);
      return JSON.parse(oldData);
    }
    localStorage.setItem(CHILDREN_KEY, '[]');
    return [];
  }
  return JSON.parse(data);
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

export function addUploadedDoc(docName, childName, fileData, status = 'Verified', docType = 'Medical report') {
  const docs = getUploadedDocs();
  docs.unshift({
    name: docName,
    child: childName,
    docType: docType,
    meta: fileData ? `Image · ${Math.round(fileData.length * 0.75 / 1024)} KB` : 'No file',
    status: status,
    image: fileData,
    timestamp: Date.now()
  });
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

/* ─── Growth Records ─── */

export function getGrowthRecords(childId) {
  const all = JSON.parse(localStorage.getItem(GROWTH_KEY) || '[]');
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
  return JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]');
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
