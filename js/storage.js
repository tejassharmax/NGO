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
  let data = localStorage.getItem(CHILDREN_KEY);
  if (!data || JSON.parse(data).length === 0) {
    const oldData = localStorage.getItem('sample-students');
    if (oldData && JSON.parse(oldData).length > 0) {
      localStorage.setItem(CHILDREN_KEY, oldData);
      return JSON.parse(oldData);
    }
    seedDatabase();
    data = localStorage.getItem(CHILDREN_KEY);
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

/* ─── Database Seeder ─── */
function seedDatabase() {
  const children = [
    {
      id: 'CH-1025',
      name: 'Naveen Roy',
      dob: '2013-06-15',
      gender: 'Male',
      blood: 'O+',
      idNumber: '3948 2938 1029',
      father: 'A.N. Roy',
      mother: 'Priya Roy',
      phone: '+91 98765 43210',
      address: 'Sector 4, Ludhiana, Punjab - 141001',
      status: 'Verified',
      registeredDate: '2026-03-10',
      height: '142',
      weight: '36',
      medicalConditions: 'Anemia history',
      allergies: 'Dust',
      medications: 'Iron supplements',
      emergencyContact: 'Dr. Amit Kumar',
      emergencyPhone: '+91 98888 77777',
      hospitalName: 'Ludhiana Children Hospital',
      notes: 'Recovering from mild anemia.'
    },
    {
      id: 'CH-1026',
      name: 'Aisha Khan',
      dob: '2021-02-18',
      gender: 'Female',
      blood: 'A+',
      idNumber: '8392 1029 3847',
      father: 'Kabir Khan',
      mother: 'Yasmin Khan',
      phone: '+91 91234 56789',
      address: 'Civil Lines, Ludhiana, Punjab - 141001',
      status: 'Active',
      registeredDate: '2026-05-15',
      height: '105',
      weight: '13.5',
      medicalConditions: 'Undernourished',
      allergies: 'Lactose intolerance',
      medications: 'Multivitamin Syrup',
      emergencyContact: 'Sarita Devi (Caregiver)',
      emergencyPhone: '+91 98221 40393',
      hospitalName: 'Sanjeevani Clinic',
      notes: 'Needs daily monitoring of dietary intake.'
    },
    {
      id: 'CH-1027',
      name: 'Aarav Sharma',
      dob: '2018-09-10',
      gender: 'Male',
      blood: 'B+',
      idNumber: '9203 8472 1092',
      father: 'Rohan Sharma',
      mother: 'Seema Sharma',
      phone: '+91 98123 45678',
      address: 'Dholewal, Ludhiana, Punjab - 141003',
      status: 'Verified',
      registeredDate: '2026-01-20',
      height: '128',
      weight: '28',
      medicalConditions: 'None',
      allergies: 'Peanuts',
      medications: 'Vitamin D drops',
      emergencyContact: 'Rohan Sharma',
      emergencyPhone: '+91 98123 45678',
      hospitalName: 'Apollo Hospital',
      notes: 'Healthy active child.'
    },
    {
      id: 'CH-1028',
      name: 'Ananya Patil',
      dob: '2016-11-22',
      gender: 'Female',
      blood: 'AB+',
      idNumber: '4829 3019 4829',
      father: 'Sunil Patil',
      mother: 'Neha Patil',
      phone: '+91 97654 32109',
      address: 'Model Town, Ludhiana, Punjab - 141002',
      status: 'Verified',
      registeredDate: '2026-02-28',
      height: '135',
      weight: '31',
      medicalConditions: 'Cavity (Oral health)',
      allergies: 'None',
      medications: 'Fluoride rinse',
      emergencyContact: 'Neha Patil',
      emergencyPhone: '+91 97654 32109',
      hospitalName: 'Fortis Hospital',
      notes: 'Scheduled for dental cleaning.'
    },
    {
      id: 'CH-1029',
      name: 'Diya Nair',
      dob: '2023-04-05',
      gender: 'Female',
      blood: 'O-',
      idNumber: '1092 3847 2938',
      father: 'Ramesh Nair',
      mother: 'Lekha Nair',
      phone: '+91 95432 10987',
      address: 'Sarabha Nagar, Ludhiana, Punjab - 141001',
      status: 'Pending',
      registeredDate: '2026-07-12',
      height: '92',
      weight: '11.5',
      medicalConditions: 'None',
      allergies: 'None',
      medications: 'None',
      emergencyContact: 'Ramesh Nair',
      emergencyPhone: '+91 95432 10987',
      hospitalName: 'Apollo Hospital',
      notes: 'Recent registration, waiting for physical verification documents.'
    }
  ];

  localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));

  const growth = [
    { childId: 'CH-1025', childName: 'Naveen Roy', date: '2026-04-10', height: 140, weight: 35, bmi: 17.9 },
    { childId: 'CH-1025', childName: 'Naveen Roy', date: '2026-05-15', height: 141, weight: 35.5, bmi: 17.9 },
    { childId: 'CH-1025', childName: 'Naveen Roy', date: '2026-07-15', height: 142, weight: 36.0, bmi: 17.9 },

    { childId: 'CH-1026', childName: 'Aisha Khan', date: '2026-05-15', height: 104, weight: 13.0, bmi: 12.0 },
    { childId: 'CH-1026', childName: 'Aisha Khan', date: '2026-07-15', height: 105, weight: 13.5, bmi: 12.2 },

    { childId: 'CH-1027', childName: 'Aarav Sharma', date: '2026-03-20', height: 126, weight: 27, bmi: 17.0 },
    { childId: 'CH-1027', childName: 'Aarav Sharma', date: '2026-06-20', height: 128, weight: 28, bmi: 17.1 }
  ];
  localStorage.setItem(GROWTH_KEY, JSON.stringify(growth));

  const meals = [
    { childId: 'CH-1027', childName: 'Aarav Sharma', mealType: 'Breakfast', date: '2026-07-21', description: 'Milk and Oats with Honey', calories: 250 },
    { childId: 'CH-1027', childName: 'Aarav Sharma', mealType: 'Lunch', date: '2026-07-21', description: 'Roti, Dal Tadka, and Potato Sabzi', calories: 450 },
    { childId: 'CH-1027', childName: 'Aarav Sharma', mealType: 'Snack', date: '2026-07-21', description: 'One Apple and Almonds', calories: 120 },
    
    { childId: 'CH-1026', childName: 'Aisha Khan', mealType: 'Breakfast', date: '2026-07-21', description: 'Ragi Porridge and Banana', calories: 300 },
    { childId: 'CH-1026', childName: 'Aisha Khan', mealType: 'Lunch', date: '2026-07-21', description: 'Khichdi with ghee and spinach', calories: 380 },
    
    { childId: 'CH-1025', childName: 'Naveen Roy', mealType: 'Lunch', date: '2026-07-21', description: 'Rice, Fish Curry, and Cabbage', calories: 500 }
  ];
  localStorage.setItem(NUTRITION_KEY, JSON.stringify(meals));

  const medicines = [
    { id: 'MED-1', childId: 'CH-1027', childName: 'Aarav Sharma', medicineName: 'Vitamin D3 Drops', dosage: '400 IU daily', frequency: 'Once a day after breakfast', startDate: '2026-07-10', endDate: '2026-08-10', status: 'Active' },
    { id: 'MED-2', childId: 'CH-1026', childName: 'Aisha Khan', medicineName: 'Iron Syrup (Dexorange)', dosage: '5ml twice daily', frequency: 'Morning and evening after meals', startDate: '2026-07-16', endDate: '2026-08-15', status: 'Active' },
    { id: 'MED-3', childId: 'CH-1025', childName: 'Naveen Roy', medicineName: 'Folic Acid Tab', dosage: '5mg once daily', frequency: 'Night before bedtime', startDate: '2026-07-01', endDate: '2026-07-15', status: 'Completed' }
  ];
  localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));

  const appointments = [
    { id: 'APT-1', childId: 'CH-1025', childName: 'Naveen Roy', type: 'Doctor visit', date: '2026-07-24', time: '10:00 AM', doctor: 'Dr. Amit Kumar (Pediatrician)', notes: 'Blood test follow-up for RBC and Haemoglobin levels', status: 'Upcoming' },
    { id: 'APT-2', childId: 'CH-1026', childName: 'Aisha Khan', type: 'Follow-up', date: '2026-07-26', time: '11:30 AM', doctor: 'Dr. Amit Kumar', notes: 'Check weight and progress of iron syrup therapy', status: 'Upcoming' },
    { id: 'APT-3', childId: 'CH-1027', childName: 'Aarav Sharma', type: 'Dental checkup', date: '2026-07-16', time: '02:00 PM', doctor: 'Dr. Ritu Goel (Dentist)', notes: 'Routine checkup, no issues found', status: 'Completed' },
    { id: 'APT-4', childId: 'CH-1029', childName: 'Diya Nair', type: 'Deworming', date: '2026-07-19', time: '09:30 AM', doctor: 'Caregiver Clinic', notes: 'Albendazole 400mg dose scheduled', status: 'Upcoming' }
  ];
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));

  const emergency = [
    { id: 'EMC-1', name: 'Ludhiana Children Hospital', type: 'Hospital', phone: '+91 161 4567890', specialty: '24/7 Pediatrics & Emergency', address: 'Ferozepur Road, Ludhiana' },
    { id: 'EMC-2', name: 'Dr. Amit Kumar', type: 'Doctor', phone: '+91 98888 77777', specialty: 'Pediatric Consultant', address: 'Model Town, Ludhiana' },
    { id: 'EMC-3', name: 'Sarita Devi', type: 'Caregiver', phone: '+91 98221 40393', specialty: 'NGO Incharge', address: 'Ludhiana Shelter' },
    { id: 'EMC-4', name: 'Pediatric Cardiac Care', type: 'Hospital', phone: '+91 161 8881234', specialty: 'Cardiology', address: 'Sarabha Nagar, Ludhiana' }
  ];
  localStorage.setItem(EMERGENCY_KEY, JSON.stringify(emergency));

  const sponsors = [
    { id: 'SP-1', name: 'Rotary Club Ludhiana', phone: '+91 161 9991111', email: 'rotary.ludhiana@gmail.com', totalContribution: 50000, childrenIds: ['CH-1027', 'CH-1028'] },
    { id: 'SP-2', name: 'Dr. Meera Sen', phone: '+91 98111 22222', email: 'meera.sen@outlook.com', totalContribution: 15000, childrenIds: ['CH-1026'] }
  ];
  localStorage.setItem(SPONSORS_KEY, JSON.stringify(sponsors));

  const expenses = [
    { id: 'EXP-1', date: '2026-07-05', category: 'Food', amount: '8500', description: 'Fresh vegetables, milk, pulses for shelter', childId: '', childName: '' },
    { id: 'EXP-2', date: '2026-07-10', category: 'Medical', amount: '12000', description: 'Pediatric consult & laboratory testing fees', childId: '', childName: '' },
    { id: 'EXP-3', date: '2026-07-12', category: 'Education', amount: '6200', description: 'School bags, uniforms, books for supported children', childId: 'CH-1027', childName: 'Aarav Sharma' },
    { id: 'EXP-4', date: '2026-07-15', category: 'Daily needs', amount: '1500', description: 'Toothbrushes, soaps, dental hygiene kits', childId: '', childName: '' }
  ];
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));

  const healthRecords = [
    {
      id: 'HR-1',
      childId: 'CH-1025',
      childName: 'Naveen Roy',
      type: 'cbc',
      date: '2026-06-27',
      hemoglobin: '9.5',
      wbc: '9300',
      rbc: '5.4',
      platelets: '3.25',
      pcv: '49.8'
    }
  ];
  localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(healthRecords));

  const activity = [
    { type: 'child_added', subject: 'Naveen Roy', description: 'New child registered', timestamp: Date.now() - 3600000 * 24 * 5 },
    { type: 'doc_processed', subject: 'Naveen Roy', description: 'Blood Test Report processed via OCR', timestamp: Date.now() - 3600000 * 24 * 4 },
    { type: 'health_alert', subject: 'Naveen Roy', description: 'Abnormal blood values: Low Hemoglobin (Anemia risk), High RBC Count', timestamp: Date.now() - 3600000 * 24 * 4 },
    { type: 'growth_logged', subject: 'Aisha Khan', description: 'Growth recorded - Height: 105cm, Weight: 13.5kg', timestamp: Date.now() - 3600000 * 2 },
    { type: 'meal_logged', subject: 'Aisha Khan', description: 'Breakfast: Ragi Porridge and Banana', timestamp: Date.now() - 600000 }
  ];
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));

  const alerts = [
    { id: 'ALR-1', type: 'critical', childName: 'Naveen Roy', message: 'Critical: Anemia risk flagged (Hemoglobin: 9.5 g/dL)', timestamp: Date.now() - 3600000 * 24, dismissed: false },
    { id: 'ALR-2', type: 'warning', childName: 'Aisha Khan', message: 'Warning: Aisha Khan is undernourished (BMI: 12.2)', timestamp: Date.now() - 3600000 * 12, dismissed: false },
    { id: 'ALR-3', type: 'info', childName: 'Diya Nair', message: 'Reminder: Overdue deworming appointment for Diya Nair', timestamp: Date.now() - 3600000 * 6, dismissed: false }
  ];
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

/* ───────────────────────────────────────────────────────
   DATA SYNC WITH SERVER-SIDE DB
   ─────────────────────────────────────────────────────── */
let isSyncing = false;

export async function syncWithServer() {
  if (isSyncing) return;
  try {
    isSyncing = true;
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

    // POST payload to merge/save on server
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const serverData = await res.json();
      // Apply merged state from server
      Object.keys(serverData).forEach(k => {
        if (serverData[k] !== null && serverData[k] !== undefined) {
          localStorage.setItem(k, serverData[k]);
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
