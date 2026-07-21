(() => {
  // js/utils.js
  var icons = {
    grid: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    users: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    file: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>',
    chart: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 5-7"/></svg>',
    export: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M4 21h16"/></svg>',
    settings: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    menu: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    search: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    bell: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
    sun: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    plus: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    upload: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 16V3M7 8l5-5 5 5M5 21h14"/></svg>',
    arrowRight: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowUp: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    filter: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16M7 12h10M10 19h4"/></svg>',
    chevronDown: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    chevronLeft: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    chevronRight: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    more: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>',
    eye: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    pencil: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>',
    trash: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg>',
    download: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
    check: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    clock: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    scan: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10"/></svg>',
    calendar: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    paperclip: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l8.5-8.5a4 4 0 1 1 5.7 5.7l-8.5 8.5a2 2 0 1 1-2.8-2.8l7.8-7.8"/></svg>',
    printer: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>',
    mail: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    moon: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8 8.5 8.5 0 1 0 20.2 14.5Z"/></svg>',
    x: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    rotate: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0 1 5"/><path d="M20 4v7h-7"/></svg>',
    maximize: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg>',
    lock: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    // New health-related icons
    heart: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.3l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    heartPulse: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19.5 12.6l-7.5 7.7-7.5-7.7A5 5 0 0 1 7.5 4a5 5 0 0 1 4.5 2.8A5 5 0 0 1 16.5 4a5 5 0 0 1 3 8.6z"/><path d="M3.2 12h4.3l1.5-3 2 6 1.5-3h4.3"/></svg>',
    pill: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><path d="m8.5 8.5 7 7"/></svg>',
    apple: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2C9.8 2 8 3.3 8 5c0 .8.3 1.5.8 2H6a4 4 0 0 0-4 4c0 5 4 10 7 11h6c3-1 7-6 7-11a4 4 0 0 0-4-4h-2.8c.5-.5.8-1.2.8-2 0-1.7-1.8-3-4-3z"/></svg>',
    ruler: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2"/></svg>',
    wallet: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>',
    phone: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.68 2.35a2 2 0 0 1-.45 2.11L8.09 9.43a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.75.32 1.54.55 2.35.68A2 2 0 0 1 22 16.9z"/></svg>',
    alertCircle: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    shield: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    activity: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    clipboard: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
    stethoscope: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>',
    building: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>',
    userCheck: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/></svg>'
  };
  var icon = (name) => icons[name] || "";
  var initials = (name) => name.split(" ").map((item) => item[0]).join("").slice(0, 2).toUpperCase();
  var escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  var formatDate = (date) => {
    try {
      return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
    } catch {
      return date || "";
    }
  };
  var pagePath = (page2) => {
    const inPages = window.location.pathname.replace(/\\/g, "/").includes("/pages/");
    if (page2 === "dashboard") return inPages ? "../index.html" : "index.html";
    return inPages ? `${page2}.html` : `pages/${page2}.html`;
  };
  var statusBadge = (status) => `<span class="badge badge--${status === "Active" || status === "Verified" ? "success" : status === "Pending" ? "warning" : status === "Critical" ? "danger" : "neutral"}"><i class="badge__dot"></i>${status}</span>`;
  var healthDot = (level) => `<span class="health-dot health-dot--${level}" aria-label="${level}"></span>`;

  // js/storage.js
  var CHILDREN_KEY = "chm-children";
  var ACTIVITY_KEY = "chm-activity";
  var PENDING_KEY = "chm-pending-docs";
  var DOCS_KEY = "chm-documents";
  var GROWTH_KEY = "chm-growth";
  var NUTRITION_KEY = "chm-nutrition";
  var MEDICINES_KEY = "chm-medicines";
  var APPOINTMENTS_KEY = "chm-appointments";
  var EMERGENCY_KEY = "chm-emergency";
  var SPONSORS_KEY = "chm-sponsors";
  var EXPENSES_KEY = "chm-expenses";
  var HEALTH_RECORDS_KEY = "chm-health-records";
  function getChildren() {
    const data = localStorage.getItem(CHILDREN_KEY);
    if (!data) {
      const oldData = localStorage.getItem("sample-students");
      if (oldData) {
        localStorage.setItem(CHILDREN_KEY, oldData);
        return JSON.parse(oldData);
      }
      localStorage.setItem(CHILDREN_KEY, "[]");
      return [];
    }
    return JSON.parse(data);
  }
  function updateChild(child) {
    const children = getChildren();
    const idx = children.findIndex((c) => c.id === child.id);
    if (idx !== -1) {
      children[idx] = child;
      logActivity("child_updated", child.name, "Child record updated");
    } else {
      children.unshift(child);
      logActivity("child_added", child.name, "New child registered");
    }
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
    return child;
  }
  function deleteChild(id) {
    const child = getChildren().find((c) => c.id === id);
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(getChildren().filter((c) => c.id !== id)));
    if (child) {
      logActivity("child_removed", child.name, "Child record removed");
    }
  }
  function getChild(id) {
    return getChildren().find((c) => c.id === id) || getChildren()[0];
  }
  function logActivity(type, subject, description) {
    const activities = getActivities();
    activities.unshift({ type, subject, description, timestamp: Date.now() });
    if (activities.length > 50) activities.length = 50;
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
  }
  function getActivities() {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
  }
  function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 6e4);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }
  function activityIcon(type) {
    const map = {
      "doc_processed": "scan",
      "child_added": "users",
      "child_updated": "pencil",
      "child_removed": "trash",
      "doc_verified": "check",
      "doc_uploaded": "upload",
      "export_created": "download",
      "growth_logged": "chart",
      "meal_logged": "apple",
      "medicine_added": "pill",
      "appointment_added": "calendar",
      "expense_logged": "wallet",
      "sponsor_added": "heart",
      "health_alert": "alertCircle"
    };
    return map[type] || "clock";
  }
  function activityLabel(type) {
    const map = {
      "doc_processed": "Document processed",
      "child_added": "New child registered",
      "child_updated": "Profile updated",
      "child_removed": "Child removed",
      "doc_verified": "Record verified",
      "doc_uploaded": "Document uploaded",
      "export_created": "Export created",
      "growth_logged": "Growth recorded",
      "meal_logged": "Meal logged",
      "medicine_added": "Medicine prescribed",
      "appointment_added": "Appointment scheduled",
      "expense_logged": "Expense recorded",
      "sponsor_added": "Sponsor added",
      "health_alert": "Health alert"
    };
    return map[type] || "Activity";
  }
  function getPendingDocs() {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  }
  function addPendingDoc(docName, childName) {
    const docs = getPendingDocs();
    docs.unshift({ docName, childName, timestamp: Date.now() });
    if (docs.length > 20) docs.length = 20;
    localStorage.setItem(PENDING_KEY, JSON.stringify(docs));
  }
  function getUploadedDocs() {
    return JSON.parse(localStorage.getItem(DOCS_KEY) || "[]");
  }
  function addUploadedDoc(docName, childName, fileData, status = "Verified", docType = "Medical report") {
    const docs = getUploadedDocs();
    docs.unshift({
      name: docName,
      child: childName,
      docType,
      meta: fileData ? `Image \xB7 ${Math.round(fileData.length * 0.75 / 1024)} KB` : "No file",
      status,
      image: fileData,
      timestamp: Date.now()
    });
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  }
  function getGrowthRecords(childId) {
    const all = JSON.parse(localStorage.getItem(GROWTH_KEY) || "[]");
    return childId ? all.filter((r) => r.childId === childId) : all;
  }
  function addGrowthRecord(record) {
    const all = JSON.parse(localStorage.getItem(GROWTH_KEY) || "[]");
    record.timestamp = Date.now();
    record.bmi = record.weight && record.height ? +(record.weight / (record.height / 100) ** 2).toFixed(1) : null;
    all.unshift(record);
    localStorage.setItem(GROWTH_KEY, JSON.stringify(all));
    logActivity("growth_logged", record.childName || "Child", `Height: ${record.height}cm, Weight: ${record.weight}kg`);
    return record;
  }
  function getAllMeals() {
    return JSON.parse(localStorage.getItem(NUTRITION_KEY) || "[]");
  }
  function addMeal(meal) {
    const all = JSON.parse(localStorage.getItem(NUTRITION_KEY) || "[]");
    meal.timestamp = Date.now();
    all.unshift(meal);
    localStorage.setItem(NUTRITION_KEY, JSON.stringify(all));
    logActivity("meal_logged", meal.childName || "Child", `${meal.mealType}: ${meal.description}`);
    return meal;
  }
  function getMedicines(childId) {
    const all = JSON.parse(localStorage.getItem(MEDICINES_KEY) || "[]");
    return childId ? all.filter((m) => m.childId === childId) : all;
  }
  function addMedicine(med) {
    const all = JSON.parse(localStorage.getItem(MEDICINES_KEY) || "[]");
    med.id = med.id || `MED-${Date.now()}`;
    med.timestamp = Date.now();
    all.unshift(med);
    localStorage.setItem(MEDICINES_KEY, JSON.stringify(all));
    logActivity("medicine_added", med.childName || "Child", `${med.medicineName} \u2014 ${med.dosage}`);
    return med;
  }
  function getAppointments(childId) {
    const all = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || "[]");
    return childId ? all.filter((a) => a.childId === childId) : all;
  }
  function addAppointment(appt) {
    const all = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || "[]");
    appt.id = appt.id || `APT-${Date.now()}`;
    appt.timestamp = Date.now();
    all.unshift(appt);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(all));
    logActivity("appointment_added", appt.childName || "Child", `${appt.type} on ${appt.date}`);
    return appt;
  }
  function getEmergencyContacts() {
    return JSON.parse(localStorage.getItem(EMERGENCY_KEY) || "[]");
  }
  function addEmergencyContact(contact) {
    const all = getEmergencyContacts();
    contact.id = contact.id || `EMC-${Date.now()}`;
    contact.timestamp = Date.now();
    all.unshift(contact);
    localStorage.setItem(EMERGENCY_KEY, JSON.stringify(all));
    return contact;
  }
  function deleteEmergencyContact(id) {
    const all = getEmergencyContacts().filter((c) => c.id !== id);
    localStorage.setItem(EMERGENCY_KEY, JSON.stringify(all));
  }
  function getSponsors() {
    return JSON.parse(localStorage.getItem(SPONSORS_KEY) || "[]");
  }
  function addSponsor(sponsor) {
    const all = getSponsors();
    sponsor.id = sponsor.id || `SP-${Date.now()}`;
    sponsor.timestamp = Date.now();
    all.unshift(sponsor);
    localStorage.setItem(SPONSORS_KEY, JSON.stringify(all));
    logActivity("sponsor_added", sponsor.name, "New sponsor registered");
    return sponsor;
  }
  function getExpenses(month) {
    const all = JSON.parse(localStorage.getItem(EXPENSES_KEY) || "[]");
    if (month) return all.filter((e) => e.date && e.date.startsWith(month));
    return all;
  }
  function addExpense(expense) {
    const all = JSON.parse(localStorage.getItem(EXPENSES_KEY) || "[]");
    expense.id = expense.id || `EXP-${Date.now()}`;
    expense.timestamp = Date.now();
    all.unshift(expense);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(all));
    logActivity("expense_logged", expense.category || "Expense", `\u20B9${expense.amount} \u2014 ${expense.description}`);
    return expense;
  }
  function getHealthRecords(childId) {
    const all = JSON.parse(localStorage.getItem(HEALTH_RECORDS_KEY) || "[]");
    return childId ? all.filter((r) => r.childId === childId) : all;
  }
  function addHealthRecord(record) {
    const all = JSON.parse(localStorage.getItem(HEALTH_RECORDS_KEY) || "[]");
    record.id = record.id || `HR-${Date.now()}`;
    record.timestamp = Date.now();
    all.unshift(record);
    localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(all));
    return record;
  }
  function calculateAge(dob) {
    if (!dob) return "";
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return "";
    const now = /* @__PURE__ */ new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || m === 0 && now.getDate() < birth.getDate()) years--;
    if (years < 1) {
      const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
      return `${months} mo`;
    }
    return `${years} yr`;
  }
  function healthStatus(child) {
    const flags = [];
    const records = getHealthRecords(child.id);
    const latestCBC = records.find((r) => r.type === "cbc");
    if (latestCBC && latestCBC.hemoglobin) {
      const hb = parseFloat(latestCBC.hemoglobin);
      if (hb < 11) flags.push("Anemia risk");
    }
    const growth = getGrowthRecords(child.id);
    if (growth.length > 0) {
      const latest = growth[0];
      if (latest.bmi && latest.bmi < 16) flags.push("Undernourished");
    }
    const appts = getAppointments(child.id);
    const overdue = appts.filter((a) => a.status !== "Completed" && new Date(a.date) < /* @__PURE__ */ new Date());
    if (overdue.length > 0) flags.push("Overdue checkup");
    if (child.medicalConditions && child.medicalConditions.trim()) flags.push("Has conditions");
    if (flags.length === 0) return { level: "good", label: "Healthy", flags };
    if (flags.some((f) => f.includes("Anemia") || f.includes("Undernourished"))) return { level: "critical", label: "Needs attention", flags };
    return { level: "warning", label: "Review needed", flags };
  }

  // js/table.js
  function childRows(children) {
    if (!children.length) return `<tr><td colspan="7"><div class="empty-state"><span class="empty-state__icon">${icon("users")}</span><h3>No children found</h3><p>Try changing your search or register a new child.</p></div></td></tr>`;
    return children.map((child) => {
      const hs = healthStatus(child);
      const age = calculateAge(child.dob);
      return `<tr>
    <td><label class="checkbox"><input type="checkbox" aria-label="Select ${child.name}" data-select-row="${child.id}"><span class="sr-only">Select</span></label></td>
    <td><a class="table-person" href="${pagePath("child-profile")}?id=${child.id}"><span class="table-avatar">${initials(child.name)}</span><span><b>${child.name}</b><span>${child.id}</span></span></a></td>
    <td>${age || "\u2014"}</td><td class="hide-tablet">${child.gender || "\u2014"}</td><td class="hide-tablet">${child.blood || "\u2014"}</td><td>${healthDot(hs.level)} ${statusBadge(child.status)}</td>
    <td><div class="table-actions"><a class="icon-button icon-button--small tooltip" data-tooltip="View" aria-label="View ${child.name}" href="${pagePath("child-profile")}?id=${child.id}">${icon("eye")}</a><button class="icon-button icon-button--small tooltip" data-tooltip="Edit" type="button" aria-label="Edit ${child.name}" data-edit="${child.id}">${icon("pencil")}</button><button class="icon-button icon-button--small tooltip" data-tooltip="Delete" type="button" aria-label="Delete ${child.name}" data-delete="${child.id}">${icon("trash")}</button></div></td>
  </tr>`;
    }).join("");
  }
  function updateChildTable(children) {
    const body = document.querySelector("#child-table-body");
    if (body) body.innerHTML = childRows(children);
    const count = document.querySelector("#child-count");
    if (count) count.textContent = `${children.length} children`;
  }

  // js/chart.js
  function getChartData() {
    const children = getChildren();
    const now = /* @__PURE__ */ new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = String(d.getMonth() + 1).padStart(2, "0");
      const yearStr = String(d.getFullYear());
      const count = children.filter((c) => c.registeredDate && c.registeredDate.includes(`${yearStr}-${monthStr}-`)).length;
      data.push({ month: months[d.getMonth()], value: count, label: fullMonths[d.getMonth()] });
    }
    return data;
  }
  function registrationChart() {
    const chartData = getChartData();
    const currentValue = chartData[chartData.length - 1]?.value || 0;
    const prevValue = chartData[chartData.length - 2]?.value || 0;
    const pctChange = prevValue > 0 ? Math.round((currentValue - prevValue) / prevValue * 100) : currentValue > 0 ? 100 : 0;
    const changeText = pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`;
    return `<div class="chart-summary"><b>${currentValue}</b><span>${changeText} vs. last month</span></div>
  <div class="chart-interactive" id="registration-chart">
    <svg class="chart-canvas" viewBox="0 0 640 180" preserveAspectRatio="none" aria-label="Children registered chart">
      <defs>
        <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.00"/>
        </linearGradient>
      </defs>
      <g class="chart-grid"></g>
      <path class="chart-area-path" d=""></path>
      <path class="chart-line-path" d=""></path>
      <line class="chart-hover-line" x1="0" y1="0" x2="0" y2="155" style="display:none;"></line>
      <circle class="chart-hover-circle" cx="0" cy="0" r="5" style="display:none;"></circle>
    </svg>
    <div class="chart-tooltip-html" style="opacity: 0;"></div>
    <div class="chart-labels"></div>
  </div>`;
  }
  function initChart() {
    const chart = document.getElementById("registration-chart");
    if (!chart) return;
    const chartData = getChartData();
    const svg = chart.querySelector(".chart-canvas");
    const tooltip = chart.querySelector(".chart-tooltip-html");
    const labelsDiv = chart.querySelector(".chart-labels");
    const gridGroup = svg.querySelector(".chart-grid");
    const areaPath = svg.querySelector(".chart-area-path");
    const linePath = svg.querySelector(".chart-line-path");
    const hoverLine = svg.querySelector(".chart-hover-line");
    const hoverCircle = svg.querySelector(".chart-hover-circle");
    const W = 640;
    const H = 180;
    const padX = 30;
    const padY = 25;
    const maxVal = Math.max(5, ...chartData.map((d) => d.value)) * 1.2 || 10;
    gridGroup.innerHTML = "";
    const gridLines = 5;
    for (let i = 0; i < gridLines; i++) {
      const y = padY + i / (gridLines - 1) * (H - 2 * padY);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "0");
      line.setAttribute("y1", String(y));
      line.setAttribute("x2", String(W));
      line.setAttribute("y2", String(y));
      line.setAttribute("class", "chart-grid-line");
      gridGroup.appendChild(line);
    }
    const points = chartData.map((d, i) => {
      const x = padX + i / (chartData.length - 1) * (W - 2 * padX);
      const y = H - padY - d.value / maxVal * (H - 2 * padY);
      return { x, y, value: d.value, month: d.month, label: d.label };
    });
    labelsDiv.innerHTML = points.map((p) => `<span>${p.month}</span>`).join("");
    if (points.length > 0) {
      let lineD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const cp1x = p1.x + (p2.x - p1.x) / 3;
        const cp2x = p1.x + 2 * (p2.x - p1.x) / 3;
        lineD += ` C ${cp1x} ${p1.y}, ${cp2x} ${p2.y}, ${p2.x} ${p2.y}`;
      }
      linePath.setAttribute("d", lineD);
      const areaD = `${lineD} L ${points[points.length - 1].x} ${H - padY} L ${points[0].x} ${H - padY} Z`;
      areaPath.setAttribute("d", areaD);
    }
    svg.addEventListener("pointermove", (event) => {
      const rect = svg.getBoundingClientRect();
      const mouseX = (event.clientX - rect.left) / rect.width * W;
      let closest = points[0];
      let minDist = Math.abs(points[0].x - mouseX);
      points.forEach((p) => {
        const dist = Math.abs(p.x - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      });
      hoverLine.setAttribute("x1", String(closest.x));
      hoverLine.setAttribute("x2", String(closest.x));
      hoverLine.style.display = "";
      hoverCircle.setAttribute("cx", String(closest.x));
      hoverCircle.setAttribute("cy", String(closest.y));
      hoverCircle.style.display = "";
      tooltip.innerHTML = `<strong>${closest.label}</strong><div>${closest.value} registration${closest.value !== 1 ? "s" : ""}</div>`;
      tooltip.style.opacity = "1";
      const tipRect = tooltip.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const tooltipX = closest.x / W * svgRect.width - tipRect.width / 2;
      const tooltipY = closest.y / H * svgRect.height - tipRect.height - 10;
      tooltip.style.transform = `translate(${tooltipX}px, ${tooltipY}px)`;
    });
    svg.addEventListener("pointerleave", () => {
      hoverLine.style.display = "none";
      hoverCircle.style.display = "none";
      tooltip.style.opacity = "0";
    });
  }

  // js/router.js
  var nav = [
    { section: "Overview", items: [["dashboard", "Dashboard", "grid"]] },
    { section: "Children", items: [["children", "Children", "users"], ["growth", "Growth", "ruler"], ["nutrition", "Nutrition", "apple"]] },
    { section: "Health", items: [["medicines", "Medicines", "pill"], ["appointments", "Appointments", "calendar"], ["documents", "Documents", "file"]] },
    { section: "Management", items: [["sponsors", "Sponsors", "heart"], ["expenses", "Expenses", "wallet"], ["emergency", "Emergency", "phone"]] },
    { section: "Workspace", items: [["reports", "Reports", "chart"], ["export", "Export", "export"]] }
  ];
  var pageTitles = {
    dashboard: "Dashboard",
    children: "Children",
    "child-profile": "Child profile",
    "register-child": "Register child",
    "ocr-upload": "Medical document upload",
    "ocr-review": "Review extracted information",
    "ocr-details": "Additional details",
    "ocr-processing": "Processing document",
    documents: "Health records",
    reports: "Health reports",
    export: "Export centre",
    settings: "Settings",
    growth: "Growth tracking",
    nutrition: "Nutrition tracker",
    medicines: "Medicine management",
    appointments: "Appointments",
    emergency: "Emergency contacts",
    sponsors: "Sponsor management",
    expenses: "Expense management"
  };
  function navItem(item, active) {
    const [page2, label, glyph] = item;
    return `<a class="nav-item ${page2 === active ? "nav-item--active" : ""}" href="${pagePath(page2)}" ${page2 === active ? 'aria-current="page"' : ""}>${icon(glyph)}<span class="nav-item__text">${label}</span></a>`;
  }
  function shell(page2, content) {
    const orgName = localStorage.getItem("sample-org-name") || "An Organisation";
    const orgInitials = orgName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase() || "AO";
    const navHTML = nav.map((group) => `<div class="sidebar__label">${group.section}</div>${group.items.map((item) => navItem(item, page2)).join("")}`).join("");
    return `<div class="app-shell">
    <aside class="sidebar" aria-label="Primary navigation">
      <div class="sidebar__header"><a class="sidebar__brand" href="${pagePath("dashboard")}" aria-label="Home"><span class="brand-mark">${icon("heartPulse")}</span><span class="brand-name">ChildCare</span></a><button class="sidebar__toggle" type="button" data-collapse-sidebar aria-label="Collapse sidebar">${icon("menu")}</button></div>
      <nav class="sidebar__nav">${navHTML}<div class="sidebar__label">System</div><a class="nav-item ${page2 === "settings" ? "nav-item--active" : ""}" href="${pagePath("settings")}">${icon("settings")}<span class="nav-item__text">Settings</span></a></nav>
      <div class="sidebar__foot"><div class="workspace-user"><span class="workspace-user__avatar">${orgInitials}</span><span class="workspace-user__copy"><span class="workspace-user__name">${orgName}</span><span class="workspace-user__role">Admin</span></span></div></div>
    </aside><div class="mobile-backdrop" hidden data-close-sidebar></div>
    <main class="app-main" id="app-main"><header class="topbar">${page2 === "dashboard" ? "" : `<button class="icon-button" data-topbar-back aria-label="Go back">${icon("chevronLeft")}</button>`}<div class="topbar__crumbs"><span>ChildCare</span><span aria-hidden="true"> / </span><b>${pageTitles[page2] || "Workspace"}</b></div><label class="topbar-search"><span class="sr-only">Search child records</span>${icon("search")}<input type="search" placeholder="Search children, health records\u2026" data-global-search><kbd>\u2318 K</kbd></label><div class="topbar__actions"><button class="icon-button tooltip" data-tooltip="Toggle theme" data-theme-toggle type="button" aria-label="Toggle color theme">${icon("sun")}</button><button class="icon-button tooltip" data-tooltip="Notifications" type="button" aria-label="Notifications" data-notifications>${icon("bell")}</button><div class="topbar-profile"><button class="topbar-profile__trigger" data-profile-menu type="button" aria-haspopup="true" aria-expanded="false"><span class="avatar">AD</span><span class="topbar-profile__name">Admin</span>${icon("chevronDown")}</button><div class="dropdown" hidden data-profile-dropdown><a class="dropdown__item" href="${pagePath("settings")}">${icon("settings")}Account settings</a><div class="divider"></div><button class="dropdown__item" type="button" data-sign-out>${icon("lock")}Sign out</button></div></div></div></header><section class="content page-enter">${content}</section></main></div>`;
  }
  var heading = (title, description, actions) => `<div class="page-heading"><div class="page-heading__copy"><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="page-heading__actions">${actions}</div>` : ""}</div>`;
  function getDynamicGreeting() {
    const hour = (/* @__PURE__ */ new Date()).getHours();
    if (hour < 12) return "Good morning, Admin";
    if (hour < 17) return "Good afternoon, Admin";
    return "Good evening, Admin";
  }
  var statCard = (label, value, trend, glyph, color) => `<article class="card stat-card card--interactive"><div class="stat-card__top"><span class="stat-card__label">${label}</span><span class="stat-card__icon stat-card__icon--${color}">${icon(glyph)}</span></div><div class="stat-card__number">${value}</div><div class="stat-card__footer"><span class="trend--up">${icon("arrowUp")} ${trend}</span><span>from last month</span></div></article>`;
  var field = (label, name, placeholder, type = "text", hint = "", value = "") => `<label class="field"><span class="field__label">${label}</span><input class="input" name="${name}" type="${type}" placeholder="${placeholder}" value="${escapeHTML(value)}">${hint ? `<span class="field__hint">${hint}</span>` : ""}</label>`;
  function formatDateForInput(dateStr) {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const matchDMY = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (matchDMY) {
      const [_, d, m, y] = matchDMY;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch (e) {
    }
    return "";
  }
  function dashboardPage() {
    const children = getChildren();
    const totalChildren = children.length;
    const pendingDocsTotal = getPendingDocs().length;
    const flaggedChildren = children.filter((c) => healthStatus(c).level !== "good");
    const alertCount = flaggedChildren.length;
    const now = /* @__PURE__ */ new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3);
    const upcomingAppts = getAppointments().filter((a) => {
      const d = new Date(a.date);
      return a.status !== "Completed" && d >= now && d <= weekAhead;
    }).length;
    const activeMeds = getMedicines().filter((m) => m.status === "Active").length;
    const verifiedCount = children.filter((c) => c.status === "Verified" || c.status === "Active").length;
    const activities = getActivities().slice(0, 5);
    let activityHTML = "";
    if (activities.length === 0) {
      activityHTML = `<div class="empty-state" style="padding:24px 12px"><span class="empty-state__icon">${icon("clock")}</span><h3 style="font-size:13px">No activity yet</h3><p>Actions like registering children or uploading documents will appear here.</p></div>`;
    } else {
      activityHTML = `<div class="activity-list">${activities.map((a) => `<div class="activity-item"><span class="activity-icon">${icon(activityIcon(a.type))}</span><div class="activity-copy"><b>${activityLabel(a.type)}</b> for ${a.subject}<time>${timeAgo(a.timestamp)}</time></div></div>`).join("")}</div>`;
    }
    let attentionHTML = "";
    if (flaggedChildren.length === 0) {
      attentionHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon("check")}</span><h3 style="font-size:13px">All children healthy</h3><p>No health alerts at this time.</p></div></td></tr>`;
    } else {
      attentionHTML = flaggedChildren.slice(0, 4).map((child) => {
        const hs = healthStatus(child);
        return `<tr><td><a class="table-person" href="${pagePath("child-profile")}?id=${child.id}"><span class="table-avatar">${initials(child.name)}</span><span class="table-person__info"><b class="table-person__name">${child.name}</b><span class="table-person__id">${child.id}</span></span></a></td><td>${calculateAge(child.dob) || "\u2014"}</td><td class="hide-tablet">${hs.flags.join(", ")}</td><td>${healthDot(hs.level)} ${statusBadge(hs.level === "critical" ? "Critical" : "Pending")}</td></tr>`;
      }).join("");
    }
    const pendingDocs = getPendingDocs().slice(0, 5);
    let pendingDocsHTML = "";
    if (pendingDocs.length === 0) {
      pendingDocsHTML = `<div class="empty-state" style="padding:24px 12px"><span class="empty-state__icon">${icon("file")}</span><h3 style="font-size:13px">No pending documents</h3><p>Documents pending review will appear here.</p></div>`;
    } else {
      pendingDocsHTML = pendingDocs.map((doc, index) => `<div class="list-row"><span class="list-row__avatar">${index + 1}</span><span class="list-row__copy"><b>${doc.docName}</b><span>${doc.childName}</span></span><span class="list-row__meta">Awaiting<br>review</span></div>`).join("");
    }
    return shell("dashboard", `${heading(getDynamicGreeting(), "Here\u2019s an overview of your children\u2019s health workspace today.", `<a class="button" href="${pagePath("ocr-upload")}">${icon("scan")}Upload document</a><a class="button button--primary" href="${pagePath("register-child")}">${icon("plus")}Register child</a>`)}
  <div class="stat-grid">${statCard("Total children", totalChildren.toLocaleString(), verifiedCount > 0 ? Math.round(verifiedCount / Math.max(totalChildren, 1) * 100) + "%" : "0%", "users", "blue")}${statCard("Health alerts", alertCount.toLocaleString(), alertCount > 0 ? alertCount + " need attention" : "All clear", "alertCircle", alertCount > 0 ? "amber" : "green")}${statCard("Upcoming appointments", upcomingAppts.toLocaleString(), upcomingAppts > 0 ? "Next 7 days" : "None scheduled", "calendar", "violet")}${statCard("Active medications", activeMeds.toLocaleString(), activeMeds > 0 ? activeMeds + " prescriptions" : "None active", "pill", "green")}</div>
  <div class="dashboard-grid dashboard-grid--primary"><section class="card chart-card"><header class="card__header"><div><h2 class="card__title">Registration overview</h2><p class="card__caption">Children registered over the last seven months</p></div><button class="button button--sm" data-report-export>${icon("download")}Export</button></header><div class="chart-card__body">${registrationChart()}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Quick actions</h2><p class="card__caption">Common tasks, kept close</p></div></header><div class="card__body"><div class="quick-actions"><a class="quick-action" href="${pagePath("register-child")}"><span class="quick-action__icon">${icon("plus")}</span>Register child</a><a class="quick-action" href="${pagePath("ocr-upload")}"><span class="quick-action__icon">${icon("scan")}</span>Scan document</a><a class="quick-action" href="${pagePath("growth")}"><span class="quick-action__icon">${icon("ruler")}</span>Log growth</a><a class="quick-action" href="${pagePath("nutrition")}"><span class="quick-action__icon">${icon("apple")}</span>Log meal</a><a class="quick-action" href="${pagePath("appointments")}"><span class="quick-action__icon">${icon("calendar")}</span>Appointments</a><a class="quick-action" href="${pagePath("medicines")}"><span class="quick-action__icon">${icon("pill")}</span>Medicines</a></div></div></section></div>
  <div class="dashboard-grid dashboard-grid--lower"><section class="card"><header class="card__header"><div><h2 class="card__title">Children needing attention</h2><p class="card__caption">Health alerts and flagged records</p></div><a class="button button--sm" href="${pagePath("children")}">View all ${icon("arrowRight")}</a></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Child</th><th>Age</th><th class="hide-tablet">Health flags</th><th>Status</th></tr></thead><tbody>${attentionHTML}</tbody></table></div></section><div class="dashboard-grid"><section class="card"><header class="card__header"><div><h2 class="card__title">Recent activity</h2></div><button class="icon-button icon-button--small" type="button" data-activity>${icon("more")}</button></header><div class="card__body">${activityHTML}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Pending documents</h2><p class="card__caption">Needs a quick review</p></div><span class="badge badge--warning">${pendingDocsTotal > 0 ? pendingDocsTotal + " pending" : "None"}</span></header><div class="card__body">${pendingDocsHTML}</div></section></div></div>`);
  }
  function loginPage() {
    return `<main class="login-page"><section class="login-panel"><div class="login-panel__brand" aria-label="ChildCare home"><span class="brand-mark">${icon("heartPulse")}</span><b>ChildCare</b></div><div class="card login-card"><h1>Workspace access</h1>
  <div style="background:rgba(37,99,235,0.1); color:var(--color-primary); padding:10px 14px; border-radius:8px; font-size:12px; margin-bottom:18px; border:1px solid rgba(37,99,235,0.15); line-height:1.4">
    \u{1F511} <b>Demo Admin Credentials:</b> Use ID <code>admin-ngo</code>
  </div>
  <form data-login-form>
    <label class="field"><span class="field__label">Admin User ID *</span><input class="input" type="text" data-admin-id-input placeholder="e.g. admin-ngo" required autocomplete="off"></label>
    <button class="button button--primary" type="submit" style="width:100%; margin-top:6px; min-height:44px; font-size:14px">Sign in with Admin ID ${icon("arrowRight")}</button>
  </form>
  <div style="display:flex; align-items:center; gap:10px; margin:20px 0; color:var(--color-text-muted); font-size:11px"><div style="flex:1; height:1px; background:var(--color-border)"></div>OR<div style="flex:1; height:1px; background:var(--color-border)"></div></div>
  <button class="button tooltip" data-tooltip="Sign in with pre-authorized Google Account" data-google-login type="button" style="width:100%; min-height:44px; display:flex; align-items:center; justify-content:center; gap:10px; font-weight:600; font-size:14px">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.56 2.69-3.86 2.69-6.62Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18Z" fill="#34A853"/><path d="M3.97 10.76a5.4 5.4 0 0 1 0-3.52V4.91H.95a9 9 0 0 0 0 8.18l3.02-2.33Z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A9 9 0 0 0 .95 4.91l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z" fill="#EA4335"/></svg>
    Continue with Google
  </button>
  <p class="login-card__foot">Protected by role-based permissions and secure audit logs.</p></div></section></main>`;
  }
  function childrenPage() {
    const children = getChildren();
    const totalItems = children.length;
    const itemsPerPage2 = 5;
    const totalPages = Math.ceil(totalItems / itemsPerPage2) || 1;
    const paginated = children.slice(0, itemsPerPage2);
    return shell("children", `${heading("Children", "Search, monitor, and manage every child record in one place.", `<button class="button" type="button" data-bulk-export>${icon("export")}Export</button><a class="button button--primary" href="${pagePath("register-child")}">${icon("plus")}Register child</a>`)}
  <section class="card"><div class="table-toolbar"><label class="input-group table-toolbar__search">${icon("search")}<input class="input" id="child-search" type="search" placeholder="Search name, guardian, phone, ID\u2026" aria-label="Search children"></label><div class="table-toolbar__actions"><button class="button button--sm" type="button" data-filter-toggle>${icon("filter")}Filters</button><button class="icon-button tooltip" data-tooltip="Column visibility" type="button" aria-label="Change visible columns">${icon("settings")}</button></div></div><div class="filter-row" hidden data-filter-row><label class="field"><span class="field__label">Status</span><select class="select" data-filter-status><option value="">All statuses</option><option>Active</option><option>Pending</option><option>Verified</option></select></label><label class="field"><span class="field__label">Blood group</span><select class="select" data-filter-blood><option value="">All groups</option><option>A+</option><option>B+</option><option>O+</option><option>AB+</option><option>A-</option><option>B-</option><option>O-</option><option>AB-</option></select></label><button class="button button--ghost button--sm" type="button" data-clear-filters>Clear filters</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th><label class="checkbox"><input id="select-all" type="checkbox" aria-label="Select all children"><span class="sr-only">Select all</span></label></th><th data-resizable><button class="sort-button" type="button" data-sort="name">Child ${icon("chevronDown")}</button></th><th data-resizable>Age</th><th class="hide-tablet">Gender</th><th class="hide-tablet">Blood group</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody id="child-table-body">${childRows(paginated)}</tbody></table></div><footer class="pagination"><span id="child-count">${totalItems} children (Page 1 of ${totalPages})</span><div class="pagination__buttons"><button class="button button--sm" id="btn-prev" disabled>${icon("chevronLeft")}Previous</button><button class="button button--sm" id="btn-next" ${totalPages <= 1 ? "disabled" : ""}>Next${icon("chevronRight")}</button></div></footer></section>`);
  }
  function childProfilePage() {
    const id = new URLSearchParams(window.location.search).get("id");
    const child = getChild(id);
    if (!child) return shell("child-profile", '<div class="card"><div class="card__body">Child record not found.</div></div>');
    const hs = healthStatus(child);
    const age = calculateAge(child.dob);
    const growth = getGrowthRecords(child.id);
    const latestGrowth = growth[0];
    const appts = getAppointments(child.id);
    const meds = getMedicines(child.id).filter((m) => m.status === "Active");
    return shell("child-profile", `${heading("Child profile", "A complete, well-organized health record for this child.", `<button class="button" type="button" data-profile-print>${icon("printer")}Print</button><button class="button button--primary" type="button" data-edit="${child.id}">${icon("pencil")}Edit profile</button>`)}
  <section class="card"><div class="profile-header"><span class="profile-header__avatar">${initials(child.name)}</span><div class="profile-header__copy"><h1>${child.name}</h1><p>${child.id} \xB7 ${age ? age + " old" : "Age unknown"}</p><div class="profile-header__meta">${healthDot(hs.level)} ${statusBadge(child.status)}<span class="badge badge--neutral">${child.gender || "Not specified"}</span><span class="badge badge--blue">Blood: ${child.blood || "Unknown"}</span>${hs.flags.length ? `<span class="badge badge--warning">${hs.flags.join(", ")}</span>` : ""}</div></div><div class="profile-header__actions"><button class="icon-button tooltip" type="button" data-tooltip="More actions" aria-label="More actions">${icon("more")}</button></div></div><div class="profile-tabs"><div class="tabs" role="tablist"><button class="tab tab--active" role="tab" aria-selected="true">Overview</button><button class="tab" role="tab">Guardian & Emergency</button><button class="tab" role="tab">Health Records</button><button class="tab" role="tab">Growth & Nutrition</button><button class="tab" role="tab">Documents</button><button class="tab" role="tab">Timeline</button><button class="tab" role="tab">Notes</button></div></div></section>
  <div class="profile-layout"><div class="dashboard-grid"><section class="card"><header class="card__header"><div><h2 class="card__title">Personal information</h2><p class="card__caption">Core details</p></div><button class="icon-button icon-button--small" type="button" data-edit="${child.id}" aria-label="Edit personal information">${icon("pencil")}</button></header><div class="card__body"><div class="detail-list"><div class="detail-row"><span>Full name</span><b>${child.name}</b></div><div class="detail-row"><span>Date of birth</span><b>${child.dob ? formatDate(child.dob) : "Not specified"}</b></div><div class="detail-row"><span>Age</span><b>${age || "Not specified"}</b></div><div class="detail-row"><span>Gender</span><b>${child.gender || "Not specified"}</b></div><div class="detail-row"><span>Blood group</span><b>${child.blood || "Not specified"}</b></div><div class="detail-row"><span>ID number</span><b>${child.idNumber || "Not specified"}</b></div><div class="detail-row"><span>Phone</span><b>${child.phone || "Not specified"}</b></div><div class="detail-row"><span>Registration date</span><b>${child.registeredDate ? formatDate(child.registeredDate) : "Not specified"}</b></div></div></div></section>
  <section class="card"><header class="card__header"><div><h2 class="card__title">Health summary</h2><p class="card__caption">Latest vitals and health status</p></div></header><div class="card__body"><div class="detail-list"><div class="detail-row"><span>Health status</span><b>${healthDot(hs.level)} ${hs.label}</b></div><div class="detail-row"><span>Height</span><b>${latestGrowth ? latestGrowth.height + " cm" : child.height ? child.height + " cm" : "\u2014"}</b></div><div class="detail-row"><span>Weight</span><b>${latestGrowth ? latestGrowth.weight + " kg" : child.weight ? child.weight + " kg" : "\u2014"}</b></div><div class="detail-row"><span>BMI</span><b>${latestGrowth && latestGrowth.bmi ? latestGrowth.bmi : "\u2014"}</b></div><div class="detail-row"><span>Medical conditions</span><b>${child.medicalConditions || "None reported"}</b></div><div class="detail-row"><span>Allergies</span><b>${child.allergies || "None reported"}</b></div><div class="detail-row"><span>Active medications</span><b>${meds.length > 0 ? meds.map((m) => m.medicineName).join(", ") : "None"}</b></div><div class="detail-row"><span>Upcoming appointments</span><b>${appts.filter((a) => a.status !== "Completed" && new Date(a.date) >= /* @__PURE__ */ new Date()).length || "None"}</b></div></div></div></section></div>
  <div class="dashboard-grid"><section class="card"><header class="card__header"><div><h2 class="card__title">Record timeline</h2><p class="card__caption">Recent changes and events</p></div></header><div class="card__body"><div class="timeline"><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Profile verified</b><p>Health information and contacts confirmed.</p><time>Today, 10:32 AM</time></div></div><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Document added</b><p>Medical document uploaded by administrator.</p><time>12 Jul 2026</time></div></div><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Child registered</b><p>Record created in the health management workspace.</p><time>${child.registeredDate ? formatDate(child.registeredDate) : "Recently"}</time></div></div></div></div></section>
  <section class="card"><header class="card__header"><div><h2 class="card__title">Guardian & Emergency</h2></div></header><div class="card__body"><div class="detail-list detail-list--single"><div class="detail-row"><span>Father / guardian</span><b>${child.father || "Not specified"}</b></div><div class="detail-row"><span>Mother</span><b>${child.mother || "Not specified"}</b></div><div class="detail-row"><span>Phone</span><b>${child.phone || "Not specified"}</b></div><div class="detail-row"><span>Emergency contact</span><b>${child.emergencyContact || "Not specified"}</b></div><div class="detail-row"><span>Emergency phone</span><b>${child.emergencyPhone || "Not specified"}</b></div><div class="detail-row"><span>Hospital</span><b>${child.hospitalName || "Not specified"}</b></div></div></div></section></div></div>`);
  }
  function steps(active, upload = false) {
    const items = upload ? ["Upload", "Processing", "Review & verify", "Additional details", "Save record"] : ["Choose method", "Child details", "Health & guardian", "Review & save"];
    return `<aside class="card form-aside"><div class="stepper">${items.map((item, index) => `<div class="stepper__item ${index < active ? "stepper__item--complete" : ""} ${index === active ? "stepper__item--active" : ""}"><span class="stepper__dot">${index < active ? icon("check") : index + 1}</span><span class="stepper__label">${item}</span></div>`).join("")}</div></aside>`;
  }
  function registerChildPage() {
    const searchParams = new URLSearchParams(window.location.search);
    const method = searchParams.get("method");
    const editId = searchParams.get("edit");
    const child = editId ? getChild(editId) : null;
    if (method !== "manual" && !editId) {
      return shell("register-child", `${heading("Register a child", "Choose the quickest, most reliable way to start a new child record.")}<section class="card"><div class="card__body"><div class="method-grid"><article class="method-card card card--interactive"><span class="method-card__icon">${icon("pencil")}</span><div><h2 class="card__title">Enter details manually</h2><p>Start with a clean, guided form. Best when the information is already at hand.</p></div><a class="button" href="${pagePath("register-child")}?method=manual">Start manual entry ${icon("arrowRight")}</a></article><article class="method-card card card--interactive"><span class="method-card__icon">${icon("scan")}</span><div><h2 class="card__title">Smart document upload</h2><p>Extract information from a medical document, then personally verify every field before saving.</p></div><a class="button button--primary" href="${pagePath("ocr-upload")}">Upload a document ${icon("arrowRight")}</a></article></div></div></section><section class="card section-gap"><div class="card__body"><div class="accordion"><div class="accordion__item is-open"><button class="accordion__trigger" type="button">Why keep manual entry and Smart Upload separate? ${icon("chevronDown")}</button><div class="accordion__content">Documents can speed up entry, but extracted values are never saved automatically. You stay in control of the final child record.</div></div></div></div></section>`);
    }
    let firstName = "", lastName = "", email = "", father = "", phone = "", blood = "";
    if (child) {
      const parts = child.name.split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
      email = child.email || "";
      father = child.father || "";
      phone = child.phone || "";
      blood = child.blood || "";
    }
    const title = child ? "Edit child profile" : "Register child";
    const desc = child ? "Modify the child record. Required fields are marked with an asterisk." : "Create a reliable child health record. Required fields are marked with an asterisk.";
    const submitText = child ? "Save changes" : "Save child record";
    return shell("register-child", `${heading(title, desc, `<a class="button button--ghost" href="${child ? `${pagePath("child-profile")}?id=${child.id}` : pagePath("children")}">Cancel</a><button class="button button--primary" form="child-form" type="submit">${submitText}</button>`)}<div class="form-layout"><form class="card" id="child-form">${child ? `<input type="hidden" name="id" value="${child.id}">` : ""}
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Child information</h2><p>Use the child's legal name as it appears on official documents.</p></div><div class="form-grid--two">${field("First name *", "firstName", "e.g. Naveen", "text", "", firstName)}${field("Last name *", "lastName", "e.g. Roy", "text", "", lastName)}${field("Date of birth *", "birthDate", "", "date", "", child ? formatDateForInput(child.dob) : "")}${field("Gender *", "gender", "e.g. Male", "text", "", child ? child.gender : "")}${field("Blood group", "blood", "e.g. O+", "text", "", blood)}${field("ID number (Aadhaar)", "idNumber", "0000 0000 0000", "text", "", child ? child.idNumber : "")}</div></section>
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Health baseline</h2><p>Initial health measurements and known conditions.</p></div><div class="form-grid--two">${field("Height (cm)", "height", "e.g. 140", "number", "", child ? child.height : "")}${field("Weight (kg)", "weight", "e.g. 35", "number", "", child ? child.weight : "")}<label class="field form-span-all"><span class="field__label">Known medical conditions</span><textarea class="textarea" name="medicalConditions" placeholder="e.g. Asthma, Diabetes, Epilepsy">${child ? escapeHTML(child.medicalConditions) : ""}</textarea></label><label class="field form-span-all"><span class="field__label">Allergies</span><textarea class="textarea" name="allergies" placeholder="e.g. Peanuts, Penicillin, Dust">${child ? escapeHTML(child.allergies) : ""}</textarea></label>${field("Current medications", "medications", "e.g. Inhaler, Vitamin D", "text", "", child ? child.medications : "")}</div></section>
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Guardian & emergency contact</h2><p>This contact will receive health updates and emergency notifications.</p></div><div class="form-grid--two">${field("Parent / guardian name *", "father", "e.g. A.N. Roy", "text", "", father)}${field("Mother name", "mother", "e.g. Priya Roy", "text", "", child ? child.mother : "")}${field("Phone number *", "phone", "+91 00000 00000", "tel", "", phone)}${field("Email address", "email", "guardian@example.com", "email", "", email)}${field("Emergency contact name", "emergencyContact", "e.g. Dr. Sharma", "text", "", child ? child.emergencyContact : "")}${field("Emergency phone", "emergencyPhone", "+91 00000 00000", "tel", "", child ? child.emergencyPhone : "")}${field("Nearest hospital", "hospitalName", "e.g. Apollo Hospital", "text", "", child ? child.hospitalName : "")}</div></section>
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Address & notes</h2></div><div class="form-grid--two"><label class="field form-span-all"><span class="field__label">Home address</span><textarea class="textarea" name="address" placeholder="Street address, city, state, postcode">${child ? escapeHTML(child.address) : ""}</textarea></label><label class="field form-span-all"><span class="field__label">Internal notes</span><textarea class="textarea" name="notes" placeholder="Optional notes visible to staff only.">${child ? escapeHTML(child.notes) : ""}</textarea></label></div></section></form>${steps(1)}</div>`);
  }
  function ocrUploadPage() {
    return shell("ocr-upload", `${heading("Medical document upload", "Upload a clear medical document (Aadhaar, birth certificate, lab report). Nothing will be saved until you review every extracted field.", `<a class="button button--ghost" href="${pagePath("register-child")}">Cancel</a>`)}<div class="form-layout"><section class="card"><div class="card__body"><div class="upload-zone" data-upload-zone><span class="upload-zone__icon">${icon("upload")}</span><h2 class="card__title">Drop a document here</h2><p>Or choose a file from your device. We'll extract only the details needed for the child record.</p><button class="button button--primary" type="button" data-start-ocr>${icon("file")}Choose document</button><input class="sr-only" type="file" accept=".jpg,.jpeg,.png" data-upload-input><span class="upload-zone__formats">JPG or PNG \xB7 Up to 15 MB</span></div></div><div class="form-section"><div class="accordion"><div class="accordion__item is-open"><button class="accordion__trigger" type="button">How Smart Upload protects your data ${icon("chevronDown")}</button><div class="accordion__content">A document is processed only to populate a draft. You review the values, add any missing details, and choose when to create the record.</div></div></div></div></section>${steps(0, true)}</div>`);
  }
  function ocrProcessingPage() {
    return shell("ocr-processing", `${heading("Processing document", "We\u2019re creating a draft from your upload. This never creates or updates a child record automatically.")}<section class="card"><div class="ocr-processing"><span class="ocr-processing__sample">${icon("scan")}</span><h2>Extracting information</h2><p>Reading document structure, identifying details, and preparing them for your review.</p><div class="ocr-processing__progress"><div class="ocr-processing__progress-header"><span>Processing document</span><span class="ocr-progress-pct">0%</span></div><div class="progress"><div class="progress__bar ocr-progress-bar" style="width: 0%"></div></div></div></div></section>`);
  }
  function ocrReviewPage() {
    const ocrData = JSON.parse(localStorage.getItem("ocr-parsed-data") || "{}");
    const firstName = ocrData.firstName || "";
    const lastName = ocrData.lastName || "";
    const dob = ocrData.dob || "";
    const blood = ocrData.blood || "";
    const father = ocrData.father || "";
    const mother = ocrData.mother || "";
    const phone = ocrData.phone || "";
    const idNumber = ocrData.idNumber || "";
    const gender = ocrData.gender || "";
    const uploadedFile = localStorage.getItem("ocr-upload-file");
    let previewHTML = "";
    if (uploadedFile) {
      previewHTML = `<div class="document-preview-img-wrap" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; background:#f3f4f6; position:relative; min-height:360px;">
      <img class="document-preview-img" src="${uploadedFile}" alt="Uploaded document" style="max-width:100%; max-height:100%; object-fit:contain; transition:transform 0.2s ease;" data-rotation="0">
    </div>`;
    } else {
      previewHTML = `<div class="document-sheet"><div class="document-sheet__brand">MEDICAL RECORD</div><div class="document-sheet__title">CHILD HEALTH RECORD FORM</div><div class="document-sheet__line document-sheet__line--wide"></div><div class="document-sheet__line document-sheet__line--half"></div><div class="document-sheet__table"><div class="document-sheet__cell"><b>CHILD NAME</b><span>${firstName} ${lastName}</span></div><div class="document-sheet__cell"><b>DATE OF BIRTH</b><span>${dob}</span></div><div class="document-sheet__cell"><b>FATHER'S NAME</b><span>${father}</span></div><div class="document-sheet__cell"><b>BLOOD GROUP</b><span>${blood}</span></div><div class="document-sheet__cell"><b>PHONE</b><span>${phone}</span></div><div class="document-sheet__cell"><b>ID NUMBER</b><span>${idNumber}</span></div></div></div>`;
    }
    return shell("ocr-review", `${heading("Review extracted information", "Check the values below against the original document before continuing.", `<button class="button" type="button" data-ocr-back>Back</button><button class="button button--primary" type="button" data-ocr-continue>Continue to details ${icon("arrowRight")}</button>`)}<div class="form-layout"><div class="review-layout"><section class="card document-preview"><div class="document-toolbar"><span class="badge badge--blue">Uploaded document</span><div class="document-toolbar__controls"><button class="icon-button icon-button--small tooltip" data-tooltip="Rotate" type="button" data-ocr-rotate>${icon("rotate")}</button><button class="icon-button icon-button--small tooltip" data-tooltip="Fullscreen" type="button" data-ocr-fullscreen>${icon("maximize")}</button></div></div>${previewHTML}</section><form class="card"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Extracted fields</h2><p>Fields marked for review are lower-confidence values. Nothing proceeds without your confirmation.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">First name</span><input class="input" value="${firstName}" name="firstName"></label><label class="field"><span class="field__label">Last name</span><input class="input" value="${lastName}" name="lastName"></label><label class="field"><span class="field__label">Date of birth</span><input class="input" value="${dob}" name="date"></label><label class="field"><span class="field__label">Gender</span><input class="input" value="${gender}" name="gender"></label><label class="field"><span class="field__label">Blood group</span><input class="input" value="${blood}" name="blood"></label><label class="field"><span class="field__label">ID number</span><input class="input" value="${idNumber}" name="idNumber"></label><label class="field form-span-all"><span class="field__label">Father / guardian</span><input class="input" value="${father}" name="father"></label><label class="field form-span-all"><span class="field__label">Mother name</span><input class="input" value="${mother}" name="mother"></label></div></section><section class="form-section"><label class="checkbox"><input type="checkbox" data-ocr-confirm required><span>I've checked the extracted details against the original document.</span></label></section></form></div>${steps(2, true)}</div>`);
  }
  function ocrDetailsPage() {
    const ocrData = JSON.parse(localStorage.getItem("ocr-parsed-data") || "{}");
    const firstName = ocrData.firstName || "";
    const lastName = ocrData.lastName || "";
    const father = ocrData.father || "";
    const mother = ocrData.mother || "";
    const gender = ocrData.gender || "";
    const blood = ocrData.blood || "";
    const phone = ocrData.phone || "";
    const idNumber = ocrData.idNumber || "";
    return shell("ocr-details", `${heading("Additional details", "Complete the remaining information before you save this verified child record.", `<a class="button" href="${pagePath("ocr-review")}">Back</a><button class="button button--primary" type="submit" form="ocr-additional-form">Save child record</button>`)}<div class="form-layout"><form class="card" id="ocr-additional-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Registration & contact</h2><p>These details were not present in the uploaded document.</p></div><div class="form-grid--two">${field("Mother name", "mother", "e.g. Priya Roy", "text", "", mother)}${field("Mobile number *", "phone", "e.g. +91 98221 40393", "tel", "", phone)}${field("Email address", "email", "guardian@example.com", "email")}${field("Height (cm)", "height", "e.g. 140", "number")}${field("Weight (kg)", "weight", "e.g. 35", "number")}<label class="field form-span-all"><span class="field__label">Known medical conditions</span><textarea class="textarea" name="medicalConditions" placeholder="e.g. Asthma, Diabetes"></textarea></label><label class="field form-span-all"><span class="field__label">Allergies</span><textarea class="textarea" name="allergies" placeholder="e.g. Peanuts, Penicillin"></textarea></label><label class="field form-span-all"><span class="field__label">Address</span><textarea class="textarea" name="address" placeholder="Street address, city, state, postcode"></textarea></label></div></section><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Final verification</h2><p>You're about to create the child record. It can be updated later by authorized staff.</p></div><label class="checkbox"><input type="checkbox" required><span>I confirm the information is accurate and complete.</span></label></section><input type="hidden" name="firstName" value="${firstName}"><input type="hidden" name="lastName" value="${lastName}"><input type="hidden" name="father" value="${father}"><input type="hidden" name="gender" value="${gender}"><input type="hidden" name="blood" value="${blood}"><input type="hidden" name="idNumber" value="${idNumber}"><input type="hidden" name="dob" value="${ocrData.dob || ""}"></form>${steps(3, true)}</div>`);
  }
  function growthPage() {
    const children = getChildren();
    const allGrowth = getGrowthRecords();
    const recentGrowth = allGrowth.slice(0, 10);
    let tableHTML = "";
    if (recentGrowth.length === 0) {
      tableHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon("ruler")}</span><h3 style="font-size:13px">No growth records yet</h3><p>Add a growth measurement using the form above.</p></div></td></tr>`;
    } else {
      tableHTML = recentGrowth.map((r) => `<tr><td><b>${r.childName || "\u2014"}</b></td><td>${r.date || "\u2014"}</td><td>${r.height} cm</td><td>${r.weight} kg</td><td>${r.bmi || "\u2014"}</td><td>${r.bmi ? r.bmi < 16 ? '<span class="badge badge--danger">Underweight</span>' : r.bmi > 25 ? '<span class="badge badge--warning">Overweight</span>' : '<span class="badge badge--success">Normal</span>' : "\u2014"}</td></tr>`).join("");
    }
    const childOptions = children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    return shell("growth", `${heading("Growth tracking", "Track height, weight, and BMI for every child. Identify growth problems early.", `<button class="button button--primary" type="submit" form="growth-form">${icon("plus")}Add measurement</button>`)}
  <div class="form-layout"><form class="card" id="growth-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">New measurement</h2><p>Record height and weight for a child. BMI will be auto-calculated.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required><option value="">Select child</option>${childOptions}</select></label>${field("Date *", "date", "", "date", "", (/* @__PURE__ */ new Date()).toISOString().slice(0, 10))}${field("Height (cm) *", "height", "e.g. 140", "number")}${field("Weight (kg) *", "weight", "e.g. 35", "number")}</div></section></form>
  <section class="card"><header class="card__header"><div><h2 class="card__title">Recent measurements</h2><p class="card__caption">All growth records across children</p></div></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Child</th><th>Date</th><th>Height</th><th>Weight</th><th>BMI</th><th>Status</th></tr></thead><tbody>${tableHTML}</tbody></table></div></section></div>`);
  }
  function nutritionPage() {
    const children = getChildren();
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const todayMeals = getAllMeals().filter((m) => m.date === today);
    const allMeals = getAllMeals().slice(0, 15);
    let mealsHTML = "";
    if (allMeals.length === 0) {
      mealsHTML = `<div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon("apple")}</span><h3 style="font-size:13px">No meals logged yet</h3><p>Use the form above to log a child's meal.</p></div>`;
    } else {
      mealsHTML = `<div class="document-grid">${allMeals.map((m) => `<article class="card document-card card--interactive"><div class="document-card__body" style="padding:14px"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px"><h3 style="font-size:14px; font-weight:600; margin:0">${m.childName || "\u2014"}</h3><span class="badge badge--neutral">${m.mealType}</span></div><p style="font-size:13px; color:var(--color-text-muted); margin:0 0 6px">${m.description}</p><div style="font-size:11px; color:var(--color-text-muted); display:flex; justify-content:space-between"><span>${m.date}</span>${m.calories ? `<span>${m.calories} kcal</span>` : ""}</div></div></article>`).join("")}</div>`;
    }
    const childOptions = children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    return shell("nutrition", `${heading("Nutrition tracker", "Document daily meals and help improve diets based on health reports.", `<button class="button button--primary" type="submit" form="meal-form">${icon("plus")}Log meal</button>`)}
  <div class="form-layout"><form class="card" id="meal-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Log a meal</h2><p>Record what a child ate today.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required><option value="">Select child</option>${childOptions}</select></label><label class="field"><span class="field__label">Meal type *</span><select class="select" name="mealType" required><option>Breakfast</option><option>Lunch</option><option>Snack</option><option>Dinner</option></select></label>${field("Date *", "date", "", "date", "", today)}${field("Calories (optional)", "calories", "e.g. 350", "number")}<label class="field form-span-all"><span class="field__label">Description *</span><textarea class="textarea" name="description" placeholder="e.g. Rice, dal, vegetables, curd" required></textarea></label></div></section></form>
  <section class="card"><header class="card__header"><div><h2 class="card__title">Meal log</h2><p class="card__caption">Today: ${todayMeals.length} meals logged</p></div></header><div class="card__body">${mealsHTML}</div></section></div>`);
  }
  function medicinesPage() {
    const children = getChildren();
    const allMeds = getMedicines();
    const activeMeds = allMeds.filter((m) => m.status === "Active");
    const completedMeds = allMeds.filter((m) => m.status === "Completed");
    let medsHTML = "";
    if (allMeds.length === 0) {
      medsHTML = `<div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon("pill")}</span><h3 style="font-size:13px">No prescriptions tracked</h3><p>Add a prescription using the form above.</p></div>`;
    } else {
      medsHTML = `<div class="document-grid">${allMeds.slice(0, 12).map((m) => {
        const startDate = new Date(m.startDate);
        const endDate = new Date(m.endDate);
        const now = /* @__PURE__ */ new Date();
        const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1e3 * 60 * 60 * 24)));
        const elapsed = Math.max(0, Math.ceil((now - startDate) / (1e3 * 60 * 60 * 24)));
        const pct = Math.min(100, Math.round(elapsed / totalDays * 100));
        return `<article class="card document-card card--interactive"><div class="document-card__body" style="padding:14px"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px"><h3 style="font-size:14px; font-weight:600; margin:0">${m.medicineName}</h3>${statusBadge(m.status)}</div><p style="font-size:13px; color:var(--color-text-muted); margin:0 0 4px">${m.childName || "\u2014"} \xB7 ${m.dosage}</p><p style="font-size:12px; color:var(--color-text-muted); margin:0 0 8px">${m.frequency} \xB7 ${m.startDate} \u2192 ${m.endDate}</p><div class="progress" style="height:6px"><div class="progress__bar" style="width:${pct}%; background:${m.status === "Completed" ? "var(--color-success)" : "var(--color-primary)"}"></div></div><span style="font-size:11px; color:var(--color-text-muted)">${pct}% complete</span></div></article>`;
      }).join("")}</div>`;
    }
    const childOptions = children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    return shell("medicines", `${heading("Medicine management", "Track all medicines given to children including prescriptions, dosage, and treatment completion.", `<button class="button button--primary" type="submit" form="medicine-form">${icon("plus")}Add prescription</button>`)}
  <div class="stat-grid" style="margin-bottom:24px">${statCard("Active prescriptions", activeMeds.length.toLocaleString(), activeMeds.length > 0 ? "Ongoing" : "None", "pill", "blue")}${statCard("Completed", completedMeds.length.toLocaleString(), completedMeds.length > 0 ? "Finished" : "None", "check", "green")}</div>
  <div class="form-layout"><form class="card" id="medicine-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">New prescription</h2></div><div class="form-grid--two"><label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required><option value="">Select child</option>${childOptions}</select></label>${field("Medicine name *", "medicineName", "e.g. Amoxicillin", "text")}${field("Dosage *", "dosage", "e.g. 250mg twice daily", "text")}${field("Frequency", "frequency", "e.g. Every 8 hours", "text")}${field("Start date *", "startDate", "", "date", "", (/* @__PURE__ */ new Date()).toISOString().slice(0, 10))}${field("End date *", "endDate", "", "date")}</div></section></form>
  <section class="card"><header class="card__header"><div><h2 class="card__title">All prescriptions</h2></div></header><div class="card__body">${medsHTML}</div></section></div>`);
  }
  function appointmentsPage() {
    const children = getChildren();
    const allAppts = getAppointments();
    const now = /* @__PURE__ */ new Date();
    const upcoming = allAppts.filter((a) => a.status !== "Completed" && new Date(a.date) >= now);
    const overdue = allAppts.filter((a) => a.status !== "Completed" && new Date(a.date) < now);
    const completed = allAppts.filter((a) => a.status === "Completed");
    let apptsHTML = "";
    if (allAppts.length === 0) {
      apptsHTML = `<div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon("calendar")}</span><h3 style="font-size:13px">No appointments scheduled</h3><p>Schedule an appointment using the form above.</p></div>`;
    } else {
      apptsHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Child</th><th>Type</th><th>Date</th><th>Doctor / Hospital</th><th>Status</th></tr></thead><tbody>${allAppts.slice(0, 15).map((a) => {
        const isOverdue = a.status !== "Completed" && new Date(a.date) < now;
        return `<tr ${isOverdue ? 'style="background:rgba(220,38,38,0.04)"' : ""}><td><b>${a.childName || "\u2014"}</b></td><td><span class="badge badge--neutral">${a.type}</span></td><td>${a.date}${a.time ? " " + a.time : ""}</td><td>${a.doctor || "\u2014"}</td><td>${isOverdue ? '<span class="badge badge--danger"><i class="badge__dot"></i>Overdue</span>' : statusBadge(a.status || "Upcoming")}</td></tr>`;
      }).join("")}</tbody></table></div>`;
    }
    const childOptions = children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    return shell("appointments", `${heading("Appointments & reminders", "Schedule and track medical appointments, immunizations, deworming, and dental checkups.", `<button class="button button--primary" type="submit" form="appointment-form">${icon("plus")}Add appointment</button>`)}
  <div class="stat-grid" style="margin-bottom:24px">${statCard("Upcoming", upcoming.length.toLocaleString(), upcoming.length > 0 ? "Scheduled" : "None", "calendar", "blue")}${statCard("Overdue", overdue.length.toLocaleString(), overdue.length > 0 ? "Need attention" : "All clear", "alertCircle", overdue.length > 0 ? "amber" : "green")}${statCard("Completed", completed.length.toLocaleString(), completed.length > 0 ? "Done" : "None", "check", "green")}</div>
  <div class="form-layout"><form class="card" id="appointment-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Schedule appointment</h2></div><div class="form-grid--two"><label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required><option value="">Select child</option>${childOptions}</select></label><label class="field"><span class="field__label">Type *</span><select class="select" name="type" required><option>Doctor visit</option><option>Immunization</option><option>Deworming</option><option>Dental checkup</option><option>Lab test</option><option>Follow-up</option></select></label>${field("Date *", "date", "", "date")}${field("Time", "time", "", "time")}${field("Doctor / Hospital", "doctor", "e.g. Dr. Kumar, Apollo", "text")}${field("Notes", "notes", "e.g. Bring previous reports", "text")}</div></section></form>
  <section class="card"><header class="card__header"><div><h2 class="card__title">All appointments</h2></div></header><div class="card__body">${apptsHTML}</div></section></div>`);
  }
  function emergencyPage() {
    const contacts = getEmergencyContacts();
    let contactsHTML = "";
    if (contacts.length === 0) {
      contactsHTML = `<div class="empty-state" style="padding:48px 24px"><span class="empty-state__icon">${icon("phone")}</span><h3>No emergency contacts yet</h3><p>Add hospitals, doctors, and caregiver contacts for quick access during emergencies.</p></div>`;
    } else {
      contactsHTML = `<div class="document-grid">${contacts.map((c) => `<article class="card document-card card--interactive"><div class="document-card__body" style="padding:16px"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px"><h3 style="font-size:14px; font-weight:600; margin:0">${c.name}</h3><span class="badge badge--neutral">${c.type}</span></div><div class="detail-list detail-list--single" style="font-size:13px"><div class="detail-row"><span>Phone</span><b><a href="tel:${c.phone}" style="color:var(--color-primary)">${c.phone}</a></b></div>${c.specialty ? `<div class="detail-row"><span>Specialty</span><b>${c.specialty}</b></div>` : ""}${c.address ? `<div class="detail-row"><span>Address</span><b>${c.address}</b></div>` : ""}</div><button class="icon-button icon-button--small" style="position:absolute; top:8px; right:8px" type="button" data-delete-contact="${c.id}" aria-label="Delete">${icon("trash")}</button></div></article>`).join("")}</div>`;
    }
    return shell("emergency", `${heading("Emergency contacts", "Quick-access directory for hospitals, doctors, guardians, and caregivers.", `<button class="button button--primary" type="submit" form="emergency-form">${icon("plus")}Add contact</button>`)}
  <div class="form-layout"><form class="card" id="emergency-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Add emergency contact</h2></div><div class="form-grid--two">${field("Name *", "name", "e.g. Apollo Hospital", "text")}<label class="field"><span class="field__label">Type *</span><select class="select" name="type" required><option>Hospital</option><option>Doctor</option><option>Guardian</option><option>Caregiver</option><option>Staff</option></select></label>${field("Phone *", "phone", "+91 00000 00000", "tel")}${field("Specialty", "specialty", "e.g. Pediatrics", "text")}<label class="field form-span-all"><span class="field__label">Address</span><textarea class="textarea" name="address" placeholder="Full address"></textarea></label></div></section></form>
  <section class="card"><header class="card__header"><div><h2 class="card__title">All contacts</h2></div></header><div class="card__body">${contactsHTML}</div></section></div>`);
  }
  function sponsorsPage() {
    const sponsors = getSponsors();
    const children = getChildren();
    let sponsorsHTML = "";
    if (sponsors.length === 0) {
      sponsorsHTML = `<div class="empty-state" style="padding:48px 24px"><span class="empty-state__icon">${icon("heart")}</span><h3>No sponsors registered</h3><p>Add sponsors to track their contributions and the children they support.</p></div>`;
    } else {
      sponsorsHTML = `<div class="document-grid">${sponsors.map((s) => {
        const linkedChildren = children.filter((c) => (s.childrenIds || []).includes(c.id));
        return `<article class="card document-card card--interactive"><div class="document-card__body" style="padding:16px"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px"><h3 style="font-size:14px; font-weight:600; margin:0">${s.name}</h3><span class="badge badge--blue">${linkedChildren.length} children</span></div><div class="detail-list detail-list--single" style="font-size:13px"><div class="detail-row"><span>Contact</span><b>${s.phone || s.email || "\u2014"}</b></div><div class="detail-row"><span>Total contribution</span><b>\u20B9${(s.totalContribution || 0).toLocaleString()}</b></div><div class="detail-row"><span>Children</span><b>${linkedChildren.map((c) => c.name).join(", ") || "None linked"}</b></div></div></div></article>`;
      }).join("")}</div>`;
    }
    const childOptions = children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    return shell("sponsors", `${heading("Sponsor management", "Track sponsors, their contributions, and the children they support.", `<button class="button button--primary" type="submit" form="sponsor-form">${icon("plus")}Add sponsor</button>`)}
  <div class="form-layout"><form class="card" id="sponsor-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Register sponsor</h2></div><div class="form-grid--two">${field("Sponsor name *", "name", "e.g. Rajesh Kumar", "text")}${field("Phone", "phone", "+91 00000 00000", "tel")}${field("Email", "email", "sponsor@example.com", "email")}${field("Initial contribution (\u20B9)", "contribution", "e.g. 5000", "number")}<label class="field form-span-all"><span class="field__label">Link to children</span><select class="select" name="childrenIds" multiple style="min-height:80px">${childOptions}</select><span class="field__hint">Hold Ctrl/Cmd to select multiple children</span></label></div></section></form>
  <section class="card"><header class="card__header"><div><h2 class="card__title">All sponsors</h2></div></header><div class="card__body">${sponsorsHTML}</div></section></div>`);
  }
  function expensesPage() {
    const allExpenses = getExpenses();
    const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const thisMonthExpenses = allExpenses.filter((e) => e.date && e.date.startsWith(currentMonth));
    const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const catTotals = {};
    thisMonthExpenses.forEach((e) => {
      catTotals[e.category] = (catTotals[e.category] || 0) + (parseFloat(e.amount) || 0);
    });
    let expenseRows = "";
    if (allExpenses.length === 0) {
      expenseRows = `<tr><td colspan="5"><div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon("wallet")}</span><h3 style="font-size:13px">No expenses logged</h3><p>Record expenses using the form above.</p></div></td></tr>`;
    } else {
      expenseRows = allExpenses.slice(0, 15).map((e) => `<tr><td>${e.date}</td><td><span class="badge badge--neutral">${e.category}</span></td><td>${e.description}</td><td><b>\u20B9${parseFloat(e.amount).toLocaleString()}</b></td><td>${e.childName || "General"}</td></tr>`).join("");
    }
    const children = getChildren();
    const childOptions = children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    return shell("expenses", `${heading("Expense management", "Manage expenses for food, medical, education, and daily needs with monthly reports.", `<button class="button button--primary" type="submit" form="expense-form">${icon("plus")}Log expense</button>`)}
  <div class="stat-grid" style="margin-bottom:24px">${statCard("This month", "\u20B9" + totalThisMonth.toLocaleString(), Object.keys(catTotals).length + " categories", "wallet", "blue")}${statCard("Food", "\u20B9" + (catTotals["Food"] || 0).toLocaleString(), catTotals["Food"] ? "Spent" : "None", "apple", "green")}${statCard("Medical", "\u20B9" + (catTotals["Medical"] || 0).toLocaleString(), catTotals["Medical"] ? "Spent" : "None", "heartPulse", "amber")}${statCard("Education", "\u20B9" + (catTotals["Education"] || 0).toLocaleString(), catTotals["Education"] ? "Spent" : "None", "clipboard", "violet")}</div>
  <div class="form-layout"><form class="card" id="expense-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Log expense</h2></div><div class="form-grid--two">${field("Date *", "date", "", "date", "", (/* @__PURE__ */ new Date()).toISOString().slice(0, 10))}<label class="field"><span class="field__label">Category *</span><select class="select" name="category" required><option>Food</option><option>Medical</option><option>Education</option><option>Daily needs</option><option>Other</option></select></label>${field("Amount (\u20B9) *", "amount", "e.g. 500", "number")}${field("Description *", "description", "e.g. Monthly groceries", "text")}<label class="field"><span class="field__label">Child (optional)</span><select class="select" name="childId"><option value="">General expense</option>${childOptions}</select></label></div></section></form>
  <section class="card"><header class="card__header"><div><h2 class="card__title">Expense log</h2></div></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Child</th></tr></thead><tbody>${expenseRows}</tbody></table></div></section></div>`);
  }
  function documentsPage() {
    const docs = getUploadedDocs();
    let contentHTML = "";
    if (docs.length === 0) {
      contentHTML = `<div class="empty-state" style="padding:48px 24px">
      <span class="empty-state__icon">${icon("file")}</span>
      <h3>No documents uploaded yet</h3>
      <p>Use Smart Upload to extract details from medical documents.</p>
    </div>`;
    } else {
      contentHTML = `<div class="document-grid" id="document-grid">
      ${docs.map((doc, idx) => `
        <article class="card document-card card--interactive" data-document-idx="${idx}" data-document="${(doc.name || "").toLowerCase()} ${(doc.child || doc.student || "").toLowerCase()}">
          <div class="document-card__preview" style="position:relative; width:100%; height:120px; overflow:hidden; background:var(--color-bg-alt); display:flex; align-items:center; justify-content:center; border-radius:6px;">
            ${doc.image ? `<img src="${doc.image}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" />` : icon("file")}
          </div>
          <div class="document-card__body" style="padding-top:12px;">
            <div class="document-card__title-line" style="display:flex; justify-content:space-between; align-items:center;">
              <h2 class="document-card__title" style="font-size:14px; font-weight:600; margin:0;">${doc.name}</h2>
              ${statusBadge(doc.status)}
            </div>
            <div class="document-card__meta" style="margin-top:6px; font-size:12px; color:var(--color-text-muted); display:flex; justify-content:space-between;">
              <span>${doc.child || doc.student || "\u2014"}</span>
              <span>${doc.meta}</span>
            </div>
          </div>
        </article>
      `).join("")}
    </div>`;
    }
    return shell("documents", `${heading("Health records & documents", "Upload, organise, and review medical reports, Aadhaar, school documents, and prescriptions.", `<a class="button" href="${pagePath("ocr-upload")}">${icon("scan")}Smart upload</a>`)}<section class="card"><div class="table-toolbar"><label class="input-group table-toolbar__search">${icon("search")}<input class="input" type="search" placeholder="Search documents or children" data-document-search></label><div class="table-toolbar__actions"><button class="button button--sm" type="button" data-filter-docs>${icon("filter")}Status: All</button></div></div><div class="card__body">${contentHTML}</div></section>`);
  }
  function reportsPage() {
    const children = getChildren();
    const total = children.length;
    const activeCount = children.filter((c) => c.status === "Active" || c.status === "Verified").length;
    const pendingCount = children.filter((c) => c.status === "Pending").length;
    const verifiedCount = children.filter((c) => c.status === "Verified").length;
    const activePct = total > 0 ? Math.round(activeCount / total * 100) : 0;
    const flaggedCount = children.filter((c) => healthStatus(c).level !== "good").length;
    const healthyPct = total > 0 ? Math.round((total - flaggedCount) / total * 100) : 0;
    const flaggedPct = total > 0 ? Math.round(flaggedCount / total * 100) : 0;
    const females = children.filter((c) => c.gender?.toLowerCase() === "female").length;
    const males = children.filter((c) => c.gender?.toLowerCase() === "male").length;
    const femalePct = total > 0 ? Math.round(females / total * 100) : 0;
    const malePct = total > 0 ? Math.round(males / total * 100) : 0;
    const otherPct = total > 0 ? Math.max(0, 100 - (femalePct + malePct)) : 0;
    const bloodCounts = {};
    children.forEach((c) => {
      const b = (c.blood || "").trim();
      if (b) bloodCounts[b] = (bloodCounts[b] || 0) + 1;
    });
    const sortedBlood = Object.entries(bloodCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const finalBlood = sortedBlood.map(([group, count]) => [group, total > 0 ? Math.round(count / total * 100) : 0]);
    while (finalBlood.length < 4) {
      const defaults = [["O+", 0], ["B+", 0], ["A+", 0], ["AB+", 0]];
      finalBlood.push(defaults[finalBlood.length]);
    }
    const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const monthExpenses = getExpenses(currentMonth);
    const totalExpense = monthExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    return shell("reports", `${heading("Health reports & analytics", "Monthly summary of children\u2019s health status, nutrition, and expenditures.", `<button class="button" type="button" data-report-email>${icon("mail")}Email report</button><button class="button" type="button" data-report-print>${icon("printer")}Print</button><button class="button button--primary" type="button" data-report-export>${icon("download")}Export</button>`)}
  <section class="card"><div class="filter-row"><label class="field"><span class="field__label">Report period</span><select class="select"><option>Last 6 months</option><option>Last 12 months</option><option>This year</option></select></label><label class="field"><span class="field__label">Status</span><select class="select"><option>All statuses</option><option>Active</option><option>Pending</option></select></label><button class="button button--sm" type="button" data-apply-report>Apply filters</button></div></section>
  <div class="report-grid section-gap"><article class="card report-card"><span class="eyebrow">Children</span><div class="report-card__value">${total}</div><p class="report-card__caption">total children registered</p></article><article class="card report-card"><span class="eyebrow">Healthy</span><div class="report-card__value">${total - flaggedCount}</div><p class="report-card__caption">${healthyPct}% with no health flags</p></article><article class="card report-card"><span class="eyebrow">This month's expenses</span><div class="report-card__value">\u20B9${totalExpense.toLocaleString()}</div><p class="report-card__caption">${monthExpenses.length} transactions</p></article></div>
  <div class="dashboard-grid dashboard-grid--lower"><section class="card chart-card"><header class="card__header"><div><h2 class="card__title">Registration trend</h2><p class="card__caption">New child records created each month</p></div></header><div class="chart-card__body">${registrationChart()}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Gender distribution</h2><p class="card__caption">Across all child records</p></div></header><div class="card__body"><div class="distribution"><div class="distribution__row"><span class="distribution__label">Female</span><div class="progress"><div class="progress__bar" style="width: ${femalePct}%; background: var(--color-violet);"></div></div><span class="distribution__value">${femalePct}%</span></div><div class="distribution__row"><span class="distribution__label">Male</span><div class="progress"><div class="progress__bar" style="width: ${malePct}%; background: var(--color-primary);"></div></div><span class="distribution__value">${malePct}%</span></div><div class="distribution__row"><span class="distribution__label">Other</span><div class="progress"><div class="progress__bar" style="width: ${otherPct}%; background: #94a3b8;"></div></div><span class="distribution__value">${otherPct}%</span></div></div></div></section></div>
  <div class="dashboard-grid dashboard-grid--lower"><section class="card"><header class="card__header"><div><h2 class="card__title">Blood group distribution</h2><p class="card__caption">Useful for medical readiness</p></div></header><div class="card__body"><div class="distribution">${finalBlood.map(([group, value]) => `<div class="distribution__row"><span class="distribution__label">${group}</span><div class="progress"><div class="progress__bar" style="width: ${value}%;"></div></div><span class="distribution__value">${value}%</span></div>`).join("")}</div></div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Health status overview</h2><p class="card__caption">Children flagged for health concerns</p></div></header><div class="card__body"><div class="distribution"><div class="distribution__row"><span class="distribution__label">Healthy</span><div class="progress"><div class="progress__bar" style="width: ${healthyPct}%; background: var(--color-success);"></div></div><span class="distribution__value">${healthyPct}%</span></div><div class="distribution__row"><span class="distribution__label">Needs attention</span><div class="progress"><div class="progress__bar" style="width: ${flaggedPct}%; background: var(--color-warning);"></div></div><span class="distribution__value">${flaggedPct}%</span></div></div></div></section></div>`);
  }
  function exportPage() {
    const children = getChildren();
    const totalChildren = children.length;
    const pendingCount = children.filter((c) => c.status === "Pending").length;
    return shell("export", `${heading("Export centre", "Create an export scoped to exactly the records you need.", `<a class="button button--ghost" href="${pagePath("children")}">Back to children</a>`)}<div class="form-layout"><section class="card"><div class="form-section"><div class="form-section__heading"><h2 class="card__title">Configure your export</h2><p>Select the data, format, and delivery for a secure, reusable export.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">Records</span><select class="select"><option>All registered children (${totalChildren})</option><option>Children with pending documents (${pendingCount})</option><option>Children with health alerts</option><option>Selected child records</option></select></label><label class="field"><span class="field__label">Format</span><select class="select"><option>Excel workbook (.xlsx)</option><option>CSV file (.csv)</option><option>PDF summary (.pdf)</option></select></label><label class="field"><span class="field__label">Include fields</span><select class="select"><option>Core record details</option><option>Complete health records</option><option>Medical information only</option><option>Growth data only</option></select></label><label class="field"><span class="field__label">Delivery</span><select class="select"><option>Download now</option><option>Email a secure link</option></select></label></div></div><div class="form-section"><div class="form-section__heading"><h2 class="card__title">Privacy controls</h2><p>Limit sensitive data to the people who need it.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span>Mask contact phone numbers</label><label class="switch"><input type="checkbox"><span class="switch__track"></span>Include medical information</label></div><div class="form-section"><button class="button button--primary" type="button" data-create-export>${icon("download")}Create export</button></div></section><aside class="card form-aside"><div class="card__header"><div><h2 class="card__title">Export summary</h2></div></div><div class="card__body"><div class="detail-list detail-list--single"><div class="detail-row"><span>Estimated records</span><b>${totalChildren} children</b></div><div class="detail-row"><span>Estimated size</span><b>~ 2.4 MB</b></div><div class="detail-row"><span>Data access</span><b>Administrators only</b></div></div><div class="card__caption card__caption--spaced">Exports are logged in your activity history for auditability.</div></div></aside></div>`);
  }
  function settingsPage() {
    const orgName = localStorage.getItem("sample-org-name") || "An Organisation";
    const orgCode = localStorage.getItem("sample-org-code") || "ORG-IND-01";
    const orgEmail = localStorage.getItem("sample-org-email") || "admin@organisation.org";
    const orgTimezone = localStorage.getItem("sample-org-timezone") || "Asia / Kolkata";
    return shell("settings", `${heading("Settings", "Keep your workspace secure, consistent, and ready for your organisation.", `<button class="button button--primary" type="button" data-save-settings>Save changes</button>`)}<div class="settings-layout"><nav class="card settings-nav" aria-label="Settings sections"><button type="button" class="active">Workspace</button><button type="button">Profile & team</button><button type="button">Child health fields</button><button type="button">Notifications</button><button type="button">Security</button></nav><section class="card settings-panel"><h2>Workspace</h2><p class="muted">Manage the details that appear across your workspace.</p><div class="form-grid--two form-gap">${field("Organisation name", "schoolName", "An Organisation", "text", "", orgName)}${field("Organisation code", "schoolCode", "ORG-IND-01", "text", "", orgCode)}${field("Primary contact email", "contact", "admin@organisation.org", "email", "", orgEmail)}${field("Timezone", "timezone", "Asia / Kolkata", "text", "", orgTimezone)}</div><div class="settings-row"><div><b>Registration notifications</b><p>Notify administrators when a new child record is added.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span><span class="sr-only">Registration notifications</span></label></div><div class="settings-row"><div><b>Document review reminders</b><p>Send a weekly reminder for records awaiting verification.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span><span class="sr-only">Document review reminders</span></label></div><div class="settings-row"><div><b>Health alert notifications</b><p>Notify when a child's health status changes to critical.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span><span class="sr-only">Health alert notifications</span></label></div><div class="settings-row"><div><b>Two-factor authentication</b><p>Require administrators to use an additional security step at sign in.</p></div><button class="button button--sm" type="button" data-2fa>Configure</button></div></section></div>`);
  }
  function renderPage(page2) {
    const pages = {
      login: loginPage,
      dashboard: dashboardPage,
      children: childrenPage,
      "child-profile": childProfilePage,
      "register-child": registerChildPage,
      "ocr-upload": ocrUploadPage,
      "ocr-processing": ocrProcessingPage,
      "ocr-review": ocrReviewPage,
      "ocr-details": ocrDetailsPage,
      documents: documentsPage,
      reports: reportsPage,
      export: exportPage,
      settings: settingsPage,
      growth: growthPage,
      nutrition: nutritionPage,
      medicines: medicinesPage,
      appointments: appointmentsPage,
      emergency: emergencyPage,
      sponsors: sponsorsPage,
      expenses: expensesPage
    };
    return (pages[page2] || dashboardPage)();
  }

  // js/search.js
  function searchChildren(query) {
    const term = query.trim().toLowerCase();
    return getChildren().filter((child) => !term || Object.values(child).some((value) => String(value).toLowerCase().includes(term)));
  }
  function globalSearchMarkup(query = "") {
    const results = searchChildren(query).slice(0, 5);
    return `<div class="modal-backdrop" role="presentation"><section class="modal global-search" role="dialog" aria-modal="true" aria-labelledby="search-title"><header class="global-search__input"><span>${icon("search")}</span><input id="global-search-input" class="input" value="${query}" placeholder="Search children, guardians, health records\u2026" aria-label="Search all child records" autofocus><kbd>Esc</kbd></header><div class="global-search__results"><p class="global-search__hint" id="search-title">Search across all child records</p>${results.length ? results.map((child) => {
      const age = calculateAge(child.dob);
      return `<a class="global-search__result" href="${pagePath("child-profile")}?id=${child.id}"><span class="table-avatar">${initials(child.name)}</span><span><b>${child.name}</b><small>${child.id} \xB7 ${age || "\u2014"} \xB7 ${child.blood || "\u2014"}</small></span><span class="global-search__go">${icon("arrowRight")}</span></a>`;
    }).join("") : '<div class="empty-state"><span class="empty-state__icon">' + icon("search") + "</span><h3>No matching records</h3><p>Try a name, guardian, phone number, ID, or blood group.</p></div>"}</div></section></div>`;
  }

  // js/toast.js
  function toast(title, message = "Your changes have been saved.") {
    const root = document.querySelector("#toast-root");
    if (!root) return;
    const element = document.createElement("div");
    element.className = "toast";
    element.innerHTML = `<span class="toast__icon">${icon("check")}</span><div><div class="toast__title">${title}</div><div class="toast__message">${message}</div></div><button class="icon-button icon-button--small" type="button" aria-label="Dismiss notification">${icon("x")}</button>`;
    root.append(element);
    const remove = () => element.remove();
    element.querySelector("button").addEventListener("click", remove);
    window.setTimeout(remove, 4200);
  }

  // js/modal.js
  function closeModal() {
    document.querySelector("#modal-root").replaceChildren();
  }
  function modal({ title, body, confirmText = "Confirm", confirmClass = "button--primary", onConfirm }) {
    const root = document.querySelector("#modal-root");
    root.innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal__header"><div><h2 id="modal-title" class="modal__title">${title}</h2></div><button class="icon-button icon-button--small" type="button" aria-label="Close dialog" data-modal-close>${icon("x")}</button></header><div class="modal__body">${body}</div><footer class="modal__footer"><button class="button" type="button" data-modal-close>Cancel</button><button class="button ${confirmClass}" type="button" data-modal-confirm>${confirmText}</button></footer></section></div>`;
    root.querySelectorAll("[data-modal-close]").forEach((button) => button.addEventListener("click", closeModal));
    root.querySelector(".modal-backdrop").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeModal();
    });
    root.querySelector("[data-modal-confirm]").addEventListener("click", () => {
      onConfirm?.();
      closeModal();
    });
    root.querySelector("[data-modal-close]")?.focus();
  }

  // js/form.js
  function collectChild(form) {
    const values = Object.fromEntries(new FormData(form));
    let id = values.id;
    let registeredDate = values.registeredDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    let status = "Active";
    if (id) {
      const existing = getChild(id);
      if (existing) {
        registeredDate = existing.registeredDate || registeredDate;
        status = existing.status || status;
      }
    } else {
      id = `CH-${String(1025 + Math.floor(Math.random() * 9975)).padStart(4, "0")}`;
    }
    const mother = values.mother || "";
    const dob = values.dob || values.birthDate || "";
    const idNumber = values.idNumber || "";
    return {
      id,
      name: `${values.firstName || "New"} ${values.lastName || "Child"}`.trim(),
      email: values.email || "",
      gender: values.gender || "",
      blood: values.blood || "",
      father: values.father || "",
      mother: mother || "",
      phone: values.phone || "",
      address: values.address || "",
      notes: values.notes || "",
      registeredDate,
      status,
      dob,
      idNumber,
      // Health baseline fields
      height: values.height || "",
      weight: values.weight || "",
      medicalConditions: values.medicalConditions || "",
      allergies: values.allergies || "",
      medications: values.medications || "",
      emergencyContact: values.emergencyContact || "",
      emergencyPhone: values.emergencyPhone || "",
      hospitalName: values.hospitalName || ""
    };
  }
  function saveChild(form) {
    return updateChild(collectChild(form));
  }

  // js/app.js
  var activeSort = { field: "name", direction: "asc" };
  var activeDocFilter = "All";
  var currentPage = 1;
  var itemsPerPage = 5;
  var isLoggedIn = localStorage.getItem("sample-logged-in") === "true";
  var page = document.body.dataset.page || "dashboard";
  if (!isLoggedIn && page !== "login") {
    window.location.href = pagePath("login");
  } else if (isLoggedIn && page === "login") {
    window.location.href = pagePath("dashboard");
  } else {
    const app = document.querySelector("#app");
    if (app) {
      app.innerHTML = renderPage(page);
    }
    if (page === "dashboard" || page === "reports") {
      initChart();
    }
    enableColumnResize();
    document.addEventListener("click", (event) => {
      const target = event.target.closest("button, a, input[data-global-search], [data-upload-zone], [data-close-sidebar], [data-topbar-back]");
      if (!target) return;
      if (target.matches("[data-topbar-back]")) {
        const prevPageMap = {
          "child-profile": "children",
          "register-child": "children",
          "ocr-review": "ocr-upload",
          "ocr-details": "ocr-review",
          "ocr-processing": "ocr-upload",
          "children": "dashboard",
          "documents": "dashboard",
          "reports": "dashboard",
          "export": "dashboard",
          "settings": "dashboard",
          "growth": "dashboard",
          "nutrition": "dashboard",
          "medicines": "dashboard",
          "appointments": "dashboard",
          "emergency": "dashboard",
          "sponsors": "dashboard",
          "expenses": "dashboard"
        };
        const prev = prevPageMap[page] || "dashboard";
        window.location.href = pagePath(prev);
      }
      if (target.matches("[data-collapse-sidebar]")) document.querySelector(".app-shell").classList.toggle("sidebar-collapsed");
      if (target.matches("[data-open-sidebar]")) {
        document.querySelector(".app-shell").classList.add("sidebar-open");
        document.querySelector(".mobile-backdrop").hidden = false;
      }
      if (target.matches("[data-close-sidebar]")) {
        document.querySelector(".app-shell").classList.remove("sidebar-open");
        target.hidden = true;
      }
      if (target.matches("[data-theme-toggle]")) setTheme(!document.body.classList.contains("theme-dark"));
      if (target.matches("[data-notifications]")) toast("You\u2019re all caught up", "No new health alerts need your attention.");
      if (target.matches("[data-profile-menu]")) {
        const dropdown = document.querySelector("[data-profile-dropdown]");
        const visible = dropdown.hidden;
        dropdown.hidden = !visible;
        target.setAttribute("aria-expanded", String(visible));
      }
      if (target.matches("[data-sign-out]")) {
        localStorage.removeItem("sample-logged-in");
        toast("Signed out", "You have securely signed out of your workspace.");
        window.setTimeout(() => {
          window.location.href = pagePath("login");
        }, 850);
      }
      if (target.closest("[data-google-login]")) {
        toast("Connecting to Google...", "Redirecting to secure single sign-on.");
        window.setTimeout(() => {
          localStorage.setItem("sample-logged-in", "true");
          toast("Google Login Successful", "Logged in as Admin (admin@childcare.org).");
          window.setTimeout(() => {
            window.location.href = pagePath("dashboard");
          }, 850);
        }, 1200);
      }
      if (target.matches("[data-global-search]")) openGlobalSearch();
      if (target.matches("[data-filter-toggle]")) {
        const row = document.querySelector("[data-filter-row]");
        row.hidden = !row.hidden;
      }
      if (target.matches("[data-sort]")) {
        const field2 = target.dataset.sort;
        activeSort = { field: field2, direction: activeSort.field === field2 && activeSort.direction === "asc" ? "desc" : "asc" };
        applyTableFilters();
      }
      if (target.matches("[data-clear-filters]")) {
        document.querySelectorAll("[data-filter-status], [data-filter-blood]").forEach((input) => {
          input.value = "";
        });
        applyTableFilters();
      }
      if (target.matches("[data-delete]")) {
        const id = target.dataset.delete;
        const child = getChildren().find((item) => item.id === id);
        modal({ title: `Remove ${child?.name || "child"}?`, body: "This removes the child record from this workspace. This action cannot be undone.", confirmText: "Remove child", confirmClass: "button--danger", onConfirm: () => {
          deleteChild(id);
          applyTableFilters();
          toast("Child removed", "The record has been removed from this workspace.");
        } });
      }
      if (target.matches("[data-edit]")) {
        const id = target.dataset.edit;
        window.location.href = `${pagePath("register-child")}?method=manual&edit=${id}`;
      }
      if (target.matches("#btn-prev")) {
        if (currentPage > 1) {
          currentPage--;
          applyTableFilters();
        }
      }
      if (target.matches("#btn-next")) {
        const children = filteredChildren();
        const totalPages = Math.ceil(children.length / itemsPerPage) || 1;
        if (currentPage < totalPages) {
          currentPage++;
          applyTableFilters();
        }
      }
      const childCard = target.closest("[data-child-id]");
      if (childCard && !target.matches("button, a")) {
        const childId = childCard.dataset.childId;
        window.location.href = `${pagePath("child-profile")}?id=${childId}`;
      }
      const docCardClick = target.closest("[data-document-idx]");
      if (docCardClick && !target.matches("button, a")) {
        const idx = docCardClick.dataset.documentIdx;
        const docs = getUploadedDocs();
        const doc = docs[idx];
        if (doc) {
          modal({
            title: `${doc.name} - ${doc.child || doc.student || "\u2014"}`,
            body: doc.image ? `<div style="text-align:center; max-height: 70vh; overflow: auto;"><img src="${doc.image}" style="max-width:100%; max-height: 55vh; object-fit:contain; border-radius:6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" /></div>` : `<div class="empty-state" style="padding: 24px;"><span class="empty-state__icon">${icon("file")}</span><p>No preview image available for this document.</p></div>`,
            confirmText: "Close",
            onConfirm: () => {
            }
          });
        }
      }
      if (target.matches("[data-bulk-export], [data-report-export], [data-create-export]")) {
        exportChildrenToExcel();
      }
      if (target.matches("[data-report-email]")) toast("Report queued for email", "A secure report link will be delivered to your inbox.");
      if (target.matches("[data-report-print], [data-profile-print]")) window.print();
      if (target.matches("[data-apply-report]")) toast("Report updated", "Your report now reflects the selected filters.");
      if (target.matches("[data-save-settings]")) {
        const orgNameInput = document.querySelector('input[name="schoolName"]')?.value.trim() || "An Organisation";
        const orgCodeInput = document.querySelector('input[name="schoolCode"]')?.value.trim() || "ORG-IND-01";
        const orgEmailInput = document.querySelector('input[name="contact"]')?.value.trim() || "admin@organisation.org";
        const orgTimezoneInput = document.querySelector('input[name="timezone"]')?.value.trim() || "Asia / Kolkata";
        localStorage.setItem("sample-org-name", orgNameInput);
        localStorage.setItem("sample-org-code", orgCodeInput);
        localStorage.setItem("sample-org-email", orgEmailInput);
        localStorage.setItem("sample-org-timezone", orgTimezoneInput);
        toast("Settings saved", "Your workspace preferences are up to date.");
        window.setTimeout(() => {
          window.location.reload();
        }, 600);
      }
      if (target.matches("[data-2fa]")) toast("Security configuration", "Two-factor authentication configuration would open here.");
      if (target.matches("[data-upload-document]")) toast("Choose a document", "Use Smart Upload for guided document extraction.");
      if (target.matches("[data-filter-docs]")) {
        const statuses = ["All", "Pending", "Verified"];
        const currIdx = statuses.indexOf(activeDocFilter);
        activeDocFilter = statuses[(currIdx + 1) % statuses.length];
        target.innerHTML = `${icon("filter")}Status: ${activeDocFilter}`;
        applyDocumentFilters();
      }
      if (target.matches("[data-activity]")) toast("Activity feed", "Your activity history is up to date.");
      if (target.matches("[data-start-ocr]")) document.querySelector("[data-upload-input]")?.click();
      if (target.matches("[data-upload-zone]")) document.querySelector("[data-upload-input]")?.click();
      if (target.matches("[data-ocr-back]")) window.history.back();
      if (target.matches("[data-ocr-continue]")) {
        if (document.querySelector("[data-ocr-confirm]")?.checked) {
          const ocrData = JSON.parse(localStorage.getItem("ocr-parsed-data") || "{}");
          const formFields = document.querySelectorAll("form.card input, form.card select");
          formFields.forEach((field2) => {
            if (field2.name) {
              ocrData[field2.name] = field2.value;
            }
          });
          localStorage.setItem("ocr-parsed-data", JSON.stringify(ocrData));
          window.location.href = pagePath("ocr-details");
        } else {
          toast("Review required", "Confirm that you have checked the extracted details before continuing.");
        }
      }
      if (target.matches("[data-ocr-rotate], [data-ocr-rotate] *")) {
        const img = document.querySelector(".document-preview-img");
        if (img) {
          let rotation = parseInt(img.dataset.rotation || "0", 10);
          rotation = (rotation + 90) % 360;
          img.dataset.rotation = String(rotation);
          img.style.transform = `rotate(${rotation}deg)`;
        } else {
          toast("Preview not active", "No document image is currently loaded to rotate.");
        }
      }
      if (target.matches("[data-ocr-fullscreen], [data-ocr-fullscreen] *")) {
        const wrapper = document.querySelector(".document-preview-img-wrap") || document.querySelector(".document-sheet");
        if (wrapper) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            wrapper.requestFullscreen?.() || wrapper.webkitRequestFullscreen?.() || wrapper.msRequestFullscreen?.();
          }
        } else {
          toast("Preview not active", "No document preview is loaded to maximize.");
        }
      }
      if (target.matches(".accordion__trigger")) target.closest(".accordion__item").classList.toggle("is-open");
      if (target.matches(".tab")) {
        target.closest(".tabs").querySelectorAll(".tab").forEach((tab) => {
          tab.classList.toggle("tab--active", tab === target);
          tab.setAttribute("aria-selected", String(tab === target));
        });
      }
      if (target.closest(".settings-nav button")) {
        target.closest(".settings-nav").querySelectorAll("button").forEach((button) => button.classList.toggle("active", button === target));
        toast(`${target.textContent.trim()} settings`, "This section is ready for configuration.");
      }
      if (target.matches("[data-delete-contact]")) {
        const contactId = target.dataset.deleteContact;
        modal({ title: "Remove contact?", body: "This will permanently remove this emergency contact.", confirmText: "Remove", confirmClass: "button--danger", onConfirm: () => {
          deleteEmergencyContact(contactId);
          toast("Contact removed", "Emergency contact has been deleted.");
          window.setTimeout(() => window.location.reload(), 500);
        } });
      }
    });
    document.addEventListener("input", (event) => {
      if (event.target.matches("#child-search, [data-filter-status], [data-filter-blood]")) {
        currentPage = 1;
        applyTableFilters();
      }
      if (event.target.matches("[data-document-search]")) applyDocumentFilters();
    });
    document.addEventListener("change", (event) => {
      if (event.target.matches("[data-filter-status], [data-filter-blood]")) {
        currentPage = 1;
        applyTableFilters();
      }
      if (event.target.matches("#select-all")) document.querySelectorAll("[data-select-row]").forEach((input) => {
        input.checked = event.target.checked;
      });
      if (event.target.matches("[data-upload-input]") && event.target.files?.length) {
        processUploadedFile(event.target.files[0]);
      }
    });
    document.addEventListener("dragover", (event) => {
      const zone = event.target.closest("[data-upload-zone]");
      if (zone) {
        event.preventDefault();
        zone.classList.add("is-dragging");
      }
    });
    document.addEventListener("dragleave", (event) => {
      const zone = event.target.closest("[data-upload-zone]");
      if (zone && !zone.contains(event.relatedTarget)) {
        zone.classList.remove("is-dragging");
      }
    });
    document.addEventListener("drop", (event) => {
      const zone = event.target.closest("[data-upload-zone]");
      if (zone) {
        event.preventDefault();
        zone.classList.remove("is-dragging");
        if (event.dataTransfer.files?.length) {
          processUploadedFile(event.dataTransfer.files[0]);
        }
      }
    });
    document.querySelector("#child-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const child = saveChild(form);
      toast("Child saved", `${child.name}'s record is ready.`);
      window.setTimeout(() => {
        window.location.href = `${pagePath("child-profile")}?id=${child.id}`;
      }, 500);
    });
    document.querySelector("#ocr-additional-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const child = saveChild(form);
      logActivity("doc_processed", child.name, "OCR-verified child saved");
      addPendingDoc("Health record", child.name);
      const fileData = localStorage.getItem("ocr-upload-file");
      const fileName = localStorage.getItem("ocr-upload-filename") || "Medical Document";
      let docLabel = "Medical Report";
      if (fileName.toLowerCase().includes("aadhaar") || fileName.toLowerCase().includes("aadhar")) {
        docLabel = "Aadhaar Card";
      } else if (fileName.toLowerCase().includes("birth") || fileName.toLowerCase().includes("cert")) {
        docLabel = "Birth Certificate";
      } else if (fileName.toLowerCase().includes("blood") || fileName.toLowerCase().includes("cbc") || fileName.toLowerCase().includes("test")) {
        docLabel = "Blood Test Report";
      }
      addUploadedDoc(docLabel, child.name, fileData, "Verified", docLabel);
      const ocrData = JSON.parse(localStorage.getItem("ocr-parsed-data") || "{}");
      if (ocrData.isBloodReport || ocrData.hemoglobin || ocrData.rbc) {
        addHealthRecord({
          childId: child.id,
          childName: child.name,
          type: "cbc",
          date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          hemoglobin: ocrData.hemoglobin || "",
          wbc: ocrData.wbc || "",
          rbc: ocrData.rbc || "",
          platelets: ocrData.platelets || "",
          pcv: ocrData.pcv || ""
        });
        const alerts = [];
        if (ocrData.hemoglobin && parseFloat(ocrData.hemoglobin) < 11) {
          alerts.push("Low Hemoglobin (Anemia risk)");
        }
        if (ocrData.rbc && parseFloat(ocrData.rbc) > 4.8) {
          alerts.push("High RBC Count");
        }
        if (alerts.length > 0) {
          logActivity("health_alert", child.name, `Abnormal blood values: ${alerts.join(", ")}`);
        } else {
          logActivity("health_alert", child.name, `Normal blood test processed`);
        }
      }
      toast("Verified child saved", `${child.name}'s record is now active.`);
      window.setTimeout(() => {
        window.location.href = `${pagePath("child-profile")}?id=${child.id}`;
      }, 500);
    });
    document.querySelector("#growth-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form));
      const child = getChild(values.childId);
      addGrowthRecord({
        childId: values.childId,
        childName: child ? child.name : "Unknown",
        date: values.date,
        height: parseFloat(values.height),
        weight: parseFloat(values.weight)
      });
      toast("Growth recorded", "Measurement has been saved.");
      window.setTimeout(() => window.location.reload(), 500);
    });
    document.querySelector("#meal-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form));
      const child = getChild(values.childId);
      addMeal({
        childId: values.childId,
        childName: child ? child.name : "Unknown",
        mealType: values.mealType,
        date: values.date,
        description: values.description,
        calories: values.calories || ""
      });
      toast("Meal logged", "Nutrition entry has been saved.");
      window.setTimeout(() => window.location.reload(), 500);
    });
    document.querySelector("#medicine-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form));
      const child = getChild(values.childId);
      addMedicine({
        childId: values.childId,
        childName: child ? child.name : "Unknown",
        medicineName: values.medicineName,
        dosage: values.dosage,
        frequency: values.frequency || "As directed",
        startDate: values.startDate,
        endDate: values.endDate,
        status: "Active"
      });
      toast("Prescription added", "Medicine tracking has started.");
      window.setTimeout(() => window.location.reload(), 500);
    });
    document.querySelector("#appointment-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form));
      const child = getChild(values.childId);
      addAppointment({
        childId: values.childId,
        childName: child ? child.name : "Unknown",
        type: values.type,
        date: values.date,
        time: values.time || "",
        doctor: values.doctor || "",
        notes: values.notes || "",
        status: "Upcoming"
      });
      toast("Appointment scheduled", "Reminder has been set.");
      window.setTimeout(() => window.location.reload(), 500);
    });
    document.querySelector("#emergency-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form));
      addEmergencyContact({
        name: values.name,
        type: values.type,
        phone: values.phone,
        specialty: values.specialty || "",
        address: values.address || ""
      });
      toast("Contact added", "Emergency contact has been saved.");
      window.setTimeout(() => window.location.reload(), 500);
    });
    document.querySelector("#sponsor-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const formData = new FormData(form);
      const values = Object.fromEntries(formData);
      const childrenIds = formData.getAll("childrenIds");
      addSponsor({
        name: values.name,
        phone: values.phone || "",
        email: values.email || "",
        totalContribution: parseFloat(values.contribution) || 0,
        childrenIds
      });
      toast("Sponsor registered", "Sponsor record has been created.");
      window.setTimeout(() => window.location.reload(), 500);
    });
    document.querySelector("#expense-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form));
      const child = values.childId ? getChild(values.childId) : null;
      addExpense({
        date: values.date,
        category: values.category,
        amount: values.amount,
        description: values.description,
        childId: values.childId || "",
        childName: child ? child.name : ""
      });
      toast("Expense logged", "Transaction has been recorded.");
      window.setTimeout(() => window.location.reload(), 500);
    });
    document.querySelector("[data-login-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const adminIdInput = event.target.querySelector("[data-admin-id-input]")?.value.trim();
      if (adminIdInput === "admin-ngo") {
        localStorage.setItem("sample-logged-in", "true");
        toast("Login Successful", "Welcome to the Child Health Management workspace.");
        window.setTimeout(() => {
          window.location.href = pagePath("dashboard");
        }, 850);
      } else {
        toast("Access Denied", "Incorrect Admin User ID. Please check the demo credentials.", "danger");
      }
    });
    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openGlobalSearch();
      }
      if (event.key === "Escape") closeModal();
    });
    if (page === "ocr-processing") {
      const fileData = localStorage.getItem("ocr-upload-file");
      const fileName = localStorage.getItem("ocr-upload-filename") || "document.png";
      const fileType = localStorage.getItem("ocr-upload-filetype") || "image/png";
      if (fileData) {
        const progressBar = document.querySelector(".ocr-progress-bar");
        const progressPctText = document.querySelector(".ocr-progress-pct");
        let currentProgress = 0;
        const progressTimer = window.setInterval(() => {
          if (currentProgress < 90) {
            currentProgress += Math.floor(Math.random() * 8) + 2;
            if (currentProgress > 90) currentProgress = 90;
            if (progressBar) progressBar.style.width = `${currentProgress}%`;
            if (progressPctText) progressPctText.textContent = `${currentProgress}%`;
          }
        }, 200);
        fetch(fileData).then((res) => res.blob()).then((blob) => {
          const file = new File([blob], fileName, { type: fileType });
          const formData = new FormData();
          formData.append("document", file);
          const startTime = Date.now();
          fetch("/api/ocr", {
            method: "POST",
            body: formData
          }).then((response) => {
            if (!response.ok) throw new Error("OCR API failed");
            return response.json();
          }).then((result) => {
            window.clearInterval(progressTimer);
            if (result.success) {
              if (progressBar) progressBar.style.width = "100%";
              if (progressPctText) progressPctText.textContent = "100%";
              localStorage.setItem("ocr-parsed-data", JSON.stringify(result.data));
              const name = [result.data.firstName, result.data.lastName].filter(Boolean).join(" ") || "Unknown";
              logActivity("doc_processed", name, "Document extracted via OCR");
              const elapsed = Date.now() - startTime;
              const remaining = Math.max(0, 1e3 - elapsed);
              window.setTimeout(() => {
                window.location.href = pagePath("ocr-review");
              }, remaining);
            } else {
              throw new Error(result.error || "Extraction failed");
            }
          }).catch((err) => {
            window.clearInterval(progressTimer);
            console.error("Live OCR failed:", err);
            localStorage.removeItem("ocr-parsed-data");
            modal({
              title: "Extraction Failed",
              body: "<p>The system could not identify or extract valid information from this document. Please ensure it is a clear scan of a supported document (e.g. Aadhaar Card, Birth Certificate, Blood Test Report).</p>",
              confirmText: "Try Again",
              onConfirm: () => {
                window.location.href = pagePath("ocr-upload");
              }
            });
            const processingContainer = document.querySelector(".ocr-processing");
            if (processingContainer) {
              processingContainer.innerHTML = `<span class="ocr-processing__sample" style="color:var(--color-danger)">${icon("alertCircle") || "\u26A0\uFE0F"}</span><h2>Extraction failed</h2><p>Please try again with a clearer image.</p>`;
            }
          });
        });
      } else {
        window.setTimeout(() => {
          window.location.href = pagePath("ocr-review");
        }, 1850);
      }
    }
  }
  function enableColumnResize() {
    document.querySelectorAll("th[data-resizable]").forEach((header) => {
      if (header.querySelector(".column-resizer")) return;
      const handle = document.createElement("button");
      handle.className = "column-resizer";
      handle.type = "button";
      handle.setAttribute("aria-label", `Resize ${header.textContent.trim()} column`);
      header.append(handle);
      handle.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = header.getBoundingClientRect().width;
        const resize = (moveEvent) => {
          header.style.width = `${Math.max(120, startWidth + moveEvent.clientX - startX)}px`;
        };
        const stop = () => {
          document.removeEventListener("pointermove", resize);
          document.removeEventListener("pointerup", stop);
        };
        document.addEventListener("pointermove", resize);
        document.addEventListener("pointerup", stop);
      });
    });
  }
  function setTheme(isDark) {
    document.body.classList.toggle("theme-dark", isDark);
    localStorage.setItem("sample-theme", isDark ? "dark" : "light");
  }
  setTheme(localStorage.getItem("sample-theme") === "dark");
  function openGlobalSearch(query = "") {
    const root = document.querySelector("#modal-root");
    if (!root) return;
    root.innerHTML = globalSearchMarkup(query);
    const input = root.querySelector("#global-search-input");
    if (input) {
      input.focus();
      input.select();
      input.addEventListener("input", () => openGlobalSearch(input.value));
    }
    root.querySelector(".modal-backdrop")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeModal();
    });
  }
  function filteredChildren() {
    const query = document.querySelector("#child-search")?.value || "";
    const status = document.querySelector("[data-filter-status]")?.value || "";
    const blood = document.querySelector("[data-filter-blood]")?.value || "";
    return searchChildren(query).filter((child) => (!status || child.status === status) && (!blood || child.blood === blood));
  }
  function applyTableFilters() {
    const children = filteredChildren().sort((a, b) => String(a[activeSort.field] || "").localeCompare(String(b[activeSort.field] || "")) * (activeSort.direction === "asc" ? 1 : -1));
    const totalItems = children.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = children.slice(start, start + itemsPerPage);
    updateChildTable(paginated);
    const countSpan = document.getElementById("child-count");
    if (countSpan) {
      countSpan.textContent = `${totalItems} children (Page ${currentPage} of ${totalPages})`;
    }
    const btnPrev = document.getElementById("btn-prev");
    if (btnPrev) btnPrev.disabled = currentPage === 1;
    const btnNext = document.getElementById("btn-next");
    if (btnNext) btnNext.disabled = currentPage === totalPages;
  }
  function applyDocumentFilters() {
    const searchVal = document.querySelector("[data-document-search]")?.value.toLowerCase().trim() || "";
    document.querySelectorAll(".document-card").forEach((card) => {
      const text = card.dataset.document || "";
      const matchesSearch = text.includes(searchVal);
      const badge = card.querySelector(".badge");
      const statusBadgeText = badge ? badge.textContent.trim() : "";
      const matchesStatus = activeDocFilter === "All" || activeDocFilter === "Pending" && statusBadgeText.includes("Pending") || activeDocFilter === "Verified" && (statusBadgeText.includes("Verified") || statusBadgeText.includes("Active"));
      card.style.display = matchesSearch && matchesStatus ? "" : "none";
    });
  }
  function processUploadedFile(file) {
    if (!file.type.startsWith("image/")) {
      toast("Unsupported file format", "Please upload a clean image file (JPG or PNG).");
      return;
    }
    toast("Document received", "Starting a secure draft extraction.");
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        try {
          const pngDataUrl = canvas.toDataURL("image/png");
          localStorage.setItem("ocr-upload-file", pngDataUrl);
          localStorage.setItem("ocr-upload-filename", file.name.replace(/\.[^/.]+$/, "") + ".png");
          localStorage.setItem("ocr-upload-filetype", "image/png");
        } catch (err) {
          console.warn("Canvas conversion failed, saving original:", err);
          localStorage.setItem("ocr-upload-file", e.target.result);
          localStorage.setItem("ocr-upload-filename", file.name);
          localStorage.setItem("ocr-upload-filetype", file.type);
        }
        window.setTimeout(() => {
          window.location.href = pagePath("ocr-processing");
        }, 500);
      };
      img.onerror = function() {
        console.warn("Image loading failed, saving original:", file.name);
        localStorage.setItem("ocr-upload-file", e.target.result);
        localStorage.setItem("ocr-upload-filename", file.name);
        localStorage.setItem("ocr-upload-filetype", file.type);
        window.setTimeout(() => {
          window.location.href = pagePath("ocr-processing");
        }, 500);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  function loadSheetJS(callback) {
    if (window.XLSX) {
      callback();
      return;
    }
    toast("Preparing export", "Loading the secure Excel engine...");
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => callback();
    script.onerror = () => toast("Export failed", "Could not load the Excel export library. Please check your internet connection.");
    document.head.appendChild(script);
  }
  function exportChildrenToExcel() {
    const children = getChildren();
    if (children.length === 0) {
      toast("No data to export", "Register some children first.");
      return;
    }
    loadSheetJS(() => {
      const data = children.map((c) => ({
        "Child ID": c.id || "",
        "Name": c.name || "",
        "Date of Birth": c.dob || "",
        "Age": calculateAge(c.dob) || "",
        "Gender": c.gender || "",
        "Blood Group": c.blood || "",
        "Father / Guardian": c.father || "",
        "Mother": c.mother || "",
        "Phone": c.phone || "",
        "Registration Date": c.registeredDate || "",
        "Height (cm)": c.height || "",
        "Weight (kg)": c.weight || "",
        "Medical Conditions": c.medicalConditions || "",
        "Allergies": c.allergies || "",
        "Address": c.address || "",
        "Health Status": healthStatus(c).label,
        "Verification Status": c.status || "Active"
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Children Health Records");
      XLSX.writeFile(wb, "ChildCare_Health_Records.xlsx");
      logActivity("export_created", "Excel file", "Exported all children health data to Excel");
      toast("Export complete", "Your children health records Excel file has been downloaded.");
    });
  }
})();
