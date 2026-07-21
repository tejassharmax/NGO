import { icon, initials, pagePath, statusBadge, escapeHTML, formatDate } from './utils.js';
import { getStudents, getStudent, getActivities, getPendingDocs, timeAgo, activityIcon, activityLabel, getUploadedDocs } from './storage.js';
import { studentRows } from './table.js';
import { admissionsChart } from './chart.js';

const nav = [
  ['dashboard', 'Dashboard', 'grid'],
  ['students', 'Students', 'users'],
  ['documents', 'Documents', 'file'],
  ['reports', 'Reports', 'chart'],
  ['export', 'Export', 'export']
];

const pageTitles = {
  dashboard: 'Dashboard',
  students: 'Students',
  'student-profile': 'Student profile',
  'add-student': 'Add student',
  'ocr-upload': 'Smart upload',
  'ocr-review': 'Review extracted information',
  'ocr-details': 'Additional details',
  documents: 'Documents',
  reports: 'Reports',
  export: 'Export centre',
  settings: 'Settings'
};

function navItem(item, active) {
  const [page, label, glyph] = item;
  return `<a class="nav-item ${page === active ? 'nav-item--active' : ''}" href="${pagePath(page)}" ${page === active ? 'aria-current="page"' : ''}>${icon(glyph)}<span class="nav-item__text">${label}</span></a>`;
}

export function shell(page, content) {
  const orgName = localStorage.getItem('sample-org-name') || 'An Organisation';
  const orgInitials = orgName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'AO';
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="Primary navigation">
      <div class="sidebar__header"><a class="sidebar__brand" href="${pagePath('dashboard')}" aria-label="Sample home"><span class="brand-mark">${icon('users')}</span><span class="brand-name">sample</span></a><button class="sidebar__toggle" type="button" data-collapse-sidebar aria-label="Collapse sidebar">${icon('menu')}</button></div>
      <nav class="sidebar__nav">${nav.map((item) => navItem(item, page)).join('')}<div class="sidebar__label">Workspace</div><a class="nav-item ${page === 'settings' ? 'nav-item--active' : ''}" href="${pagePath('settings')}">${icon('settings')}<span class="nav-item__text">Settings</span></a></nav>
      <div class="sidebar__foot"><div class="workspace-user"><span class="workspace-user__avatar">${orgInitials}</span><span class="workspace-user__copy"><span class="workspace-user__name">${orgName}</span><span class="workspace-user__role">Admin</span></span></div></div>
    </aside><div class="mobile-backdrop" hidden data-close-sidebar></div>
    <main class="app-main" id="app-main"><header class="topbar">${page === 'dashboard' ? '' : `<button class="icon-button" data-topbar-back aria-label="Go back">${icon('chevronLeft')}</button>`}<div class="topbar__crumbs"><span>Sample</span><span aria-hidden="true"> / </span><b>${pageTitles[page] || 'Workspace'}</b></div><label class="topbar-search"><span class="sr-only">Search student records</span>${icon('search')}<input type="search" placeholder="Search student records" data-global-search><kbd>⌘ K</kbd></label><div class="topbar__actions"><button class="icon-button tooltip" data-tooltip="Toggle theme" data-theme-toggle type="button" aria-label="Toggle color theme">${icon('sun')}</button><button class="icon-button tooltip" data-tooltip="Notifications" type="button" aria-label="Notifications" data-notifications>${icon('bell')}</button><div class="topbar-profile"><button class="topbar-profile__trigger" data-profile-menu type="button" aria-haspopup="true" aria-expanded="false"><span class="avatar">AD</span><span class="topbar-profile__name">Admin</span>${icon('chevronDown')}</button><div class="dropdown" hidden data-profile-dropdown><a class="dropdown__item" href="${pagePath('settings')}">${icon('settings')}Account settings</a><div class="divider"></div><button class="dropdown__item" type="button" data-sign-out>${icon('lock')}Sign out</button></div></div></div></header><section class="content page-enter">${content}</section></main></div>`;
}

const heading = (title, description, actions) => `<div class="page-heading"><div class="page-heading__copy"><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="page-heading__actions">${actions}</div>` : ''}</div>`;

function getDynamicGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, Admin';
  if (hour < 17) return 'Good afternoon, Admin';
  return 'Good evening, Admin';
}

const statCard = (label, value, trend, glyph, color) => `<article class="card stat-card card--interactive"><div class="stat-card__top"><span class="stat-card__label">${label}</span><span class="stat-card__icon stat-card__icon--${color}">${icon(glyph)}</span></div><div class="stat-card__number">${value}</div><div class="stat-card__footer"><span class="trend--up">${icon('arrowUp')} ${trend}</span><span>from last month</span></div></article>`;

export function dashboardPage() {
  const students = getStudents();
  const totalStudents = students.length;
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const admissionsThisMonth = students.filter(s => s.admission && s.admission.includes(`-${currentMonth}-`)).length;
  const pendingCount = students.filter(s => s.status === 'Pending').length;
  const verifiedCount = students.filter(s => s.status === 'Verified' || s.status === 'Active').length;

  // Recent activity from localStorage
  const activities = getActivities().slice(0, 5);
  let activityHTML = '';
  if (activities.length === 0) {
    activityHTML = `<div class="empty-state" style="padding:24px 12px"><span class="empty-state__icon">${icon('clock')}</span><h3 style="font-size:13px">No activity yet</h3><p>Actions like adding students or uploading documents will appear here.</p></div>`;
  } else {
    activityHTML = `<div class="activity-list">${activities.map(a => `<div class="activity-item"><span class="activity-icon">${icon(activityIcon(a.type))}</span><div class="activity-copy"><b>${activityLabel(a.type)}</b> for ${a.subject}<time>${timeAgo(a.timestamp)}</time></div></div>`).join('')}</div>`;
  }

  // Pending documents from localStorage
  const pendingDocs = getPendingDocs().slice(0, 5);
  const pendingDocsTotal = getPendingDocs().length;
  let pendingDocsHTML = '';
  if (pendingDocs.length === 0) {
    pendingDocsHTML = `<div class="empty-state" style="padding:24px 12px"><span class="empty-state__icon">${icon('file')}</span><h3 style="font-size:13px">No pending documents</h3><p>Documents pending review will appear here.</p></div>`;
  } else {
    pendingDocsHTML = pendingDocs.map((doc, index) => `<div class="list-row"><span class="list-row__avatar">${index + 1}</span><span class="list-row__copy"><b>${doc.docName}</b><span>${doc.studentName}</span></span><span class="list-row__meta">Awaiting<br>review</span></div>`).join('');
  }

  // Recent admissions table
  let recentAdmissionsHTML = '';
  if (students.length === 0) {
    recentAdmissionsHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon('users')}</span><h3 style="font-size:13px">No students yet</h3><p>Add your first student to get started.</p></div></td></tr>`;
  } else {
    recentAdmissionsHTML = students.slice(0, 4).map((student) => `<tr><td><a class="table-person" href="${pagePath('student-profile')}?id=${student.id}"><span class="table-avatar">${initials(student.name)}</span><span class="table-person__info"><b class="table-person__name">${student.name}</b><span class="table-person__id">${student.id}</span></span></a></td><td>${student.class}</td><td class="hide-tablet">${formatDate(student.admission)}</td><td>${statusBadge(student.status)}</td></tr>`).join('');
  }

  return shell('dashboard', `${heading(getDynamicGreeting(), 'Here’s a calm overview of your school workspace today.', `<a class="button" href="${pagePath('ocr-upload')}">${icon('scan')}Smart upload</a><a class="button button--primary" href="${pagePath('add-student')}">${icon('plus')}Add student</a>`)}
  <div class="stat-grid">${statCard('Total students', totalStudents.toLocaleString(), admissionsThisMonth > 0 ? Math.round(admissionsThisMonth / Math.max(totalStudents, 1) * 100) + '%' : '0%', 'users', 'blue')}${statCard('Admissions this month', admissionsThisMonth.toLocaleString(), admissionsThisMonth > 0 ? '+' + admissionsThisMonth : '0', 'calendar', 'green')}${statCard('Pending documents', pendingDocsTotal.toLocaleString(), pendingDocsTotal > 0 ? pendingDocsTotal + ' need review' : 'All clear', 'file', 'amber')}${statCard('Verified records', verifiedCount.toLocaleString(), totalStudents > 0 ? Math.round(verifiedCount / totalStudents * 100) + '%' : '0%', 'check', 'violet')}</div>
  <div class="dashboard-grid dashboard-grid--primary"><section class="card chart-card"><header class="card__header"><div><h2 class="card__title">Admissions overview</h2><p class="card__caption">Student admissions over the last seven months</p></div><button class="button button--sm" data-report-export>${icon('download')}Export</button></header><div class="chart-card__body">${admissionsChart()}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Quick actions</h2><p class="card__caption">Common tasks, kept close</p></div></header><div class="card__body"><div class="quick-actions"><a class="quick-action" href="${pagePath('add-student')}"><span class="quick-action__icon">${icon('plus')}</span>Add student</a><a class="quick-action" href="${pagePath('ocr-upload')}"><span class="quick-action__icon">${icon('scan')}</span>Scan document</a><a class="quick-action" href="${pagePath('reports')}"><span class="quick-action__icon">${icon('chart')}</span>View reports</a><a class="quick-action" href="${pagePath('documents')}"><span class="quick-action__icon">${icon('file')}</span>Review files</a></div></div></section></div>
  <div class="dashboard-grid dashboard-grid--lower"><section class="card"><header class="card__header"><div><h2 class="card__title">Recent admissions</h2><p class="card__caption">Latest records added to your workspace</p></div><a class="button button--sm" href="${pagePath('students')}">View all ${icon('arrowRight')}</a></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Class</th><th class="hide-tablet">Admission date</th><th>Status</th></tr></thead><tbody>${recentAdmissionsHTML}</tbody></table></div></section><div class="dashboard-grid"><section class="card"><header class="card__header"><div><h2 class="card__title">Recent activity</h2></div><button class="icon-button icon-button--small" type="button" data-activity>${icon('more')}</button></header><div class="card__body">${activityHTML}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Pending documents</h2><p class="card__caption">Needs a quick review</p></div><span class="badge badge--warning">${pendingDocsTotal > 0 ? pendingDocsTotal + ' pending' : 'None'}</span></header><div class="card__body">${pendingDocsHTML}</div></section></div></div>`);
}

export function loginPage() {
  return `<main class="login-page"><section class="login-panel"><div class="login-panel__brand" aria-label="Sample home"><span class="brand-mark">${icon('users')}</span><b>sample</b></div><div class="card login-card"><h1>Workspace access</h1>
  
  <div style="background:rgba(37,99,235,0.1); color:var(--color-primary); padding:10px 14px; border-radius:8px; font-size:12px; margin-bottom:18px; border:1px solid rgba(37,99,235,0.15); line-height:1.4">
    🔑 <b>Demo Admin Credentials:</b> Use ID <code>admin-ngo</code>
  </div>

  <form data-login-form>
    <label class="field">
      <span class="field__label">Admin User ID *</span>
      <input class="input" type="text" data-admin-id-input placeholder="e.g. admin-ngo" required autocomplete="off">
    </label>
    <button class="button button--primary" type="submit" style="width:100%; margin-top:6px; min-height:44px; font-size:14px">Sign in with Admin ID ${icon('arrowRight')}</button>
  </form>

  <div style="display:flex; align-items:center; gap:10px; margin:20px 0; color:var(--color-text-muted); font-size:11px">
    <div style="flex:1; height:1px; background:var(--color-border)"></div>
    OR
    <div style="flex:1; height:1px; background:var(--color-border)"></div>
  </div>

  <button class="button tooltip" data-tooltip="Sign in with pre-authorized Google Account" data-google-login type="button" style="width:100%; min-height:44px; display:flex; align-items:center; justify-content:center; gap:10px; font-weight:600; font-size:14px">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.56 2.69-3.86 2.69-6.62Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18Z" fill="#34A853"/><path d="M3.97 10.76a5.4 5.4 0 0 1 0-3.52V4.91H.95a9 9 0 0 0 0 8.18l3.02-2.33Z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A9 9 0 0 0 .95 4.91l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z" fill="#EA4335"/></svg>
    Continue with Google
  </button>

  <p class="login-card__foot">Protected by role-based permissions and secure audit logs.</p></div></section></main>`;
}

export function studentsPage() {
  const students = getStudents();
  const totalItems = students.length;
  const itemsPerPage = 5;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginated = students.slice(0, itemsPerPage);

  return shell('students', `${heading('Students', 'Search, verify, and manage every student record in one place.', `<button class="button" type="button" data-bulk-export>${icon('export')}Export</button><a class="button button--primary" href="${pagePath('add-student')}">${icon('plus')}Add student</a>`)}
  <section class="card"><div class="table-toolbar"><label class="input-group table-toolbar__search">${icon('search')}<input class="input" id="student-search" type="search" placeholder="Search name, parent, phone, ID…" aria-label="Search students"></label><div class="table-toolbar__actions"><button class="button button--sm" type="button" data-filter-toggle>${icon('filter')}Filters</button><button class="icon-button tooltip" data-tooltip="Column visibility" type="button" aria-label="Change visible columns">${icon('settings')}</button></div></div><div class="filter-row" hidden data-filter-row><label class="field"><span class="field__label">Status</span><select class="select" data-filter-status><option value="">All statuses</option><option>Active</option><option>Pending</option><option>Verified</option></select></label><label class="field"><span class="field__label">Grade</span><select class="select" data-filter-grade><option value="">All grades</option><option>Grade 6</option><option>Grade 7</option><option>Grade 8</option><option>Grade 9</option></select></label><label class="field"><span class="field__label">Blood group</span><select class="select" data-filter-blood><option value="">All groups</option><option>A+</option><option>B+</option><option>O+</option><option>AB+</option></select></label><button class="button button--ghost button--sm" type="button" data-clear-filters>Clear filters</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th><label class="checkbox"><input id="select-all" type="checkbox" aria-label="Select all students"><span class="sr-only">Select all</span></label></th><th data-resizable><button class="sort-button" type="button" data-sort="name">Student ${icon('chevronDown')}</button></th><th data-resizable><button class="sort-button" type="button" data-sort="class">Class ${icon('chevronDown')}</button></th><th class="hide-tablet">Gender</th><th class="hide-tablet">Blood group</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody id="student-table-body">${studentRows(paginated)}</tbody></table></div><footer class="pagination"><span id="student-count">${totalItems} students (Page 1 of ${totalPages})</span><div class="pagination__buttons"><button class="button button--sm" id="btn-prev" disabled>${icon('chevronLeft')}Previous</button><button class="button button--sm" id="btn-next" ${totalPages <= 1 ? 'disabled' : ''}>Next${icon('chevronRight')}</button></div></footer></section>`);
}

export function profilePage() {
  const id = new URLSearchParams(window.location.search).get('id');
  const student = getStudent(id);
  if (!student) {
    return shell('student-profile', '<div class="card"><div class="card__body">Student record not found.</div></div>');
  }

  return shell('student-profile', `${heading('Student profile', 'A complete, well-organized record for this student.', `<button class="button" type="button" data-profile-print>${icon('printer')}Print</button><button class="button button--primary" type="button" data-edit="${student.id}">${icon('pencil')}Edit profile</button>`)}
  <section class="card"><div class="profile-header"><span class="profile-header__avatar">${initials(student.name)}</span><div class="profile-header__copy"><h1>${student.name}</h1><p>${student.id} · ${student.class}</p><div class="profile-header__meta">${statusBadge(student.status)}<span class="badge badge--neutral">${student.gender || 'Not specified'}</span><span class="badge badge--blue">Blood group ${student.blood || 'Unknown'}</span></div></div><div class="profile-header__actions"><button class="icon-button tooltip" type="button" data-tooltip="More actions" aria-label="More actions">${icon('more')}</button></div></div><div class="profile-tabs"><div class="tabs" role="tablist"><button class="tab tab--active" role="tab" aria-selected="true">Overview</button><button class="tab" role="tab">Parents</button><button class="tab" role="tab">Medical</button><button class="tab" role="tab">Education</button><button class="tab" role="tab">Documents</button><button class="tab" role="tab">Timeline</button><button class="tab" role="tab">Notes</button></div></div></section>
  <div class="profile-layout"><div class="dashboard-grid"><section class="card"><header class="card__header"><div><h2 class="card__title">Personal information</h2><p class="card__caption">Core details, last updated today</p></div><button class="icon-button icon-button--small" type="button" data-edit="${student.id}" aria-label="Edit personal information">${icon('pencil')}</button></header><div class="card__body"><div class="detail-list"><div class="detail-row"><span>Full name</span><b>${student.name}</b></div><div class="detail-row"><span>Admission number</span><b>${student.id}</b></div><div class="detail-row"><span>Date of birth</span><b>${student.dob || 'Not specified'}</b></div><div class="detail-row"><span>Gender</span><b>${student.gender || 'Not specified'}</b></div><div class="detail-row"><span>Blood group</span><b>${student.blood || 'Not specified'}</b></div><div class="detail-row"><span>Phone</span><b>${student.phone || 'Not specified'}</b></div><div class="detail-row"><span>Email</span><b>${student.email || 'Not specified'}</b></div><div class="detail-row"><span>Admission date</span><b>${student.admission ? formatDate(student.admission) : 'Not specified'}</b></div></div></div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Education</h2><p class="card__caption">Current enrollment details</p></div></header><div class="card__body"><div class="detail-list"><div class="detail-row"><span>Current class</span><b>${student.class}</b></div><div class="detail-row"><span>Academic year</span><b>2026–27</b></div><div class="detail-row"><span>Roll number</span><b>24</b></div><div class="detail-row"><span>House</span><b>Blue house</b></div></div></div></section></div><div class="dashboard-grid"><section class="card"><header class="card__header"><div><h2 class="card__title">Record timeline</h2><p class="card__caption">Recent changes and events</p></div></header><div class="card__body"><div class="timeline"><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Profile verified</b><p>Medical information and address confirmed.</p><time>Today, 10:32 AM</time></div></div><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Document added</b><p>Verification document uploaded by administrator.</p><time>12 Jul 2026</time></div></div><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Student admitted</b><p>Record created for the 2026–27 academic year.</p><time>${student.admission ? formatDate(student.admission) : 'Recently'}</time></div></div></div></div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Parent contact</h2></div></header><div class="card__body"><div class="detail-list detail-list--single"><div class="detail-row"><span>Father / guardian</span><b>${student.father || 'Not specified'}</b></div><div class="detail-row"><span>Mother name</span><b>${student.mother || 'Not specified'}</b></div><div class="detail-row"><span>Phone</span><b>${student.phone || 'Not specified'}</b></div><div class="detail-row"><span>Relationship</span><b>Primary contact</b></div></div></div></section></div></div>`);
}

function steps(active, upload = false) {
  const items = upload ? ['Upload', 'Processing', 'Review & verify', 'Additional details', 'Save student'] : ['Choose method', 'Student details', 'Parent details', 'Review & save'];
  return `<aside class="card form-aside"><div class="stepper">${items.map((item, index) => `<div class="stepper__item ${index < active ? 'stepper__item--complete' : ''} ${index === active ? 'stepper__item--active' : ''}"><span class="stepper__dot">${index < active ? icon('check') : index + 1}</span><span class="stepper__label">${item}</span></div>`).join('')}</div></aside>`;
}

const field = (label, name, placeholder, type = 'text', hint = '', value = '') => `<label class="field"><span class="field__label">${label}</span><input class="input" name="${name}" type="${type}" placeholder="${placeholder}" value="${escapeHTML(value)}">${hint ? `<span class="field__hint">${hint}</span>` : ''}</label>`;

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const matchDMY = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (matchDMY) {
    const [_, d, m, y] = matchDMY;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch (e) {}
  return '';
}

export function addStudentPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const method = searchParams.get('method');
  const editId = searchParams.get('edit');
  const student = editId ? getStudent(editId) : null;

  if (method !== 'manual' && !editId) {
    return shell('add-student', `${heading('Add a student', 'Choose the quickest, most reliable way to start a new student record.')}<section class="card"><div class="card__body"><div class="method-grid"><article class="method-card card card--interactive"><span class="method-card__icon">${icon('pencil')}</span><div><h2 class="card__title">Enter details manually</h2><p>Start with a clean, guided form. Best when the information is already at hand.</p></div><a class="button" href="${pagePath('add-student')}?method=manual">Start manual entry ${icon('arrowRight')}</a></article><article class="method-card card card--interactive"><span class="method-card__icon">${icon('scan')}</span><div><h2 class="card__title">Smart document upload</h2><p>Extract information from a document, then personally verify every field before saving.</p></div><a class="button button--primary" href="${pagePath('ocr-upload')}">Upload a document ${icon('arrowRight')}</a></article></div></div></section><section class="card section-gap"><div class="card__body"><div class="accordion"><div class="accordion__item is-open"><button class="accordion__trigger" type="button">Why keep manual entry and Smart Upload separate? ${icon('chevronDown')}</button><div class="accordion__content">Documents can speed up entry, but extracted values are never saved automatically. You stay in control of the final student record.</div></div></div></div></section>`);
  }

  // Determine split names for fields
  let firstName = '';
  let lastName = '';
  let email = '';
  let father = '';
  let phone = '';
  let blood = '';
  if (student) {
    const parts = student.name.split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
    email = (student.email === 'No email added') ? '' : student.email || '';
    father = (student.father === 'Not added') ? '' : student.father || '';
    phone = (student.phone === 'Not added') ? '' : student.phone || '';
    blood = (student.blood === 'Not added') ? '' : student.blood || '';
  }

  const title = student ? 'Edit student profile' : 'Add student';
  const desc = student ? 'Modify the student record. Required fields are marked with an asterisk.' : 'Create a reliable student record. Required fields are marked with an asterisk.';
  const submitText = student ? 'Save changes' : 'Save student';

  return shell('add-student', `${heading(title, desc, `<a class="button button--ghost" href="${student ? `${pagePath('student-profile')}?id=${student.id}` : pagePath('students')}">Cancel</a><button class="button button--primary" form="student-form" type="submit">${submitText}</button>`)}<div class="form-layout"><form class="card" id="student-form">${student ? `<input type="hidden" name="id" value="${student.id}">` : ''}<section class="form-section"><div class="form-section__heading"><h2 class="card__title">Student information</h2><p>Use the student’s legal name as it appears on official documents.</p></div><div class="form-grid--two">${field('First name *', 'firstName', 'e.g. Aarav', 'text', '', firstName)}${field('Last name *', 'lastName', 'e.g. Sharma', 'text', '', lastName)}${field('Date of birth *', 'birthDate', '', 'date', '', student ? formatDateForInput(student.dob) : '')}${field('Gender *', 'gender', 'e.g. Male', 'text', '', student ? student.gender : '')}<label class="field"><span class="field__label">Grade *</span><select class="select" name="grade"><option ${student && student.class.includes('Grade 6') ? 'selected' : ''}>Grade 6</option><option ${student && student.class.includes('Grade 7') ? 'selected' : ''}>Grade 7</option><option ${!student || student.class.includes('Grade 8') ? 'selected' : ''}>Grade 8</option><option ${student && student.class.includes('Grade 9') ? 'selected' : ''}>Grade 9</option></select></label><label class="field"><span class="field__label">Section *</span><select class="select" name="section"><option ${student && student.class.includes('A') ? 'selected' : ''}>A</option><option ${student && student.class.includes('B') ? 'selected' : ''}>B</option><option ${student && student.class.includes('C') ? 'selected' : ''}>C</option></select></label>${field('Blood group', 'blood', 'e.g. O+', 'text', '', blood)}${field('Email address', 'email', 'student@example.com', 'email', '', email)}</div></section><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Parent or guardian</h2><p>This contact will receive important school communications.</p></div><div class="form-grid--two">${field('Parent / guardian name *', 'father', 'e.g. Rohan Sharma', 'text', '', father)}${field('Phone number *', 'phone', '+91 00000 00000', 'tel', '', phone)}${field('Email address', 'guardianEmail', 'parent@example.com', 'email', '', email)}${field('Relationship', 'relationship', 'e.g. Father', 'text', '', student ? 'Father' : '')}</div></section><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Address & notes</h2></div><div class="form-grid--two"><label class="field form-span-all"><span class="field__label">Home address</span><textarea class="textarea" name="address" placeholder="Street address, city, state, postcode">${student ? escapeHTML(student.address) : ''}</textarea></label><label class="field form-span-all"><span class="field__label">Internal notes</span><textarea class="textarea" name="notes" placeholder="Optional notes visible to school staff only.">${student ? escapeHTML(student.notes) : ''}</textarea></label></div></section></form>${steps(1)}</div>`);
}

export function ocrUploadPage() {
  return shell('ocr-upload', `${heading('Smart document upload', 'Upload a clear student document. Nothing will be saved until you review every extracted field.', `<a class="button button--ghost" href="${pagePath('add-student')}">Cancel</a>`)}<div class="form-layout"><section class="card"><div class="card__body"><div class="upload-zone" data-upload-zone><span class="upload-zone__icon">${icon('upload')}</span><h2 class="card__title">Drop a document here</h2><p>Or choose a file from your device. We’ll extract only the details needed for the student record.</p><button class="button button--primary" type="button" data-start-ocr>${icon('file')}Choose document</button><input class="sr-only" type="file" accept=".jpg,.jpeg,.png" data-upload-input><span class="upload-zone__formats">JPG or PNG · Up to 15 MB</span></div></div><div class="form-section"><div class="accordion"><div class="accordion__item is-open"><button class="accordion__trigger" type="button">How Smart Upload protects your data ${icon('chevronDown')}</button><div class="accordion__content">A document is processed only to populate a draft. You review the values, add any missing details, and choose when to create the record.</div></div></div></div></section>${steps(0, true)}</div>`);
}

export function ocrProcessingPage() {
  return shell('ocr-processing', `${heading('Processing document', 'We’re creating a draft from your upload. This never creates or updates a student record automatically.')}<section class="card"><div class="ocr-processing"><span class="ocr-processing__sample">${icon('scan')}</span><h2>Extracting information</h2><p>Reading document structure, identifying student details, and preparing them for your review.</p><div class="ocr-processing__progress"><div class="ocr-processing__progress-header"><span>Processing document</span><span class="ocr-progress-pct">0%</span></div><div class="progress"><div class="progress__bar ocr-progress-bar" style="width: 0%"></div></div></div></div></section>`);
}

export function ocrReviewPage() {
  const ocrData = JSON.parse(localStorage.getItem('ocr-parsed-data') || '{}');
  const firstName = ocrData.firstName || '';
  const lastName = ocrData.lastName || '';
  const dob = ocrData.dob || '';
  const blood = ocrData.blood || '';
  const father = ocrData.father || '';
  const mother = ocrData.mother || '';
  const phone = ocrData.phone || '';
  const idNumber = ocrData.idNumber || '';
  const gender = ocrData.gender || '';

  const uploadedFile = localStorage.getItem('ocr-upload-file');
  let previewHTML = '';
  if (uploadedFile) {
    previewHTML = `<div class="document-preview-img-wrap" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; background:#f3f4f6; position:relative; min-height:360px;">
      <img class="document-preview-img" src="${uploadedFile}" alt="Uploaded document" style="max-width:100%; max-height:100%; object-fit:contain; transition:transform 0.2s ease;" data-rotation="0">
    </div>`;
  } else {
    // Fallback template
    previewHTML = `<div class="document-sheet"><div class="document-sheet__brand">AN ORGANISATION</div><div class="document-sheet__title">STUDENT ADMISSION FORM</div><div class="document-sheet__line document-sheet__line--wide"></div><div class="document-sheet__line document-sheet__line--half"></div><div class="document-sheet__table"><div class="document-sheet__cell"><b>STUDENT NAME</b><span>${firstName} ${lastName}</span></div><div class="document-sheet__cell"><b>DATE OF BIRTH</b><span>${dob}</span></div><div class="document-sheet__cell"><b>FATHER'S NAME</b><span>${father}</span></div><div class="document-sheet__cell"><b>BLOOD GROUP</b><span>${blood}</span></div><div class="document-sheet__cell"><b>CLASS</b><span>VIII A</span></div><div class="document-sheet__cell"><b>PHONE</b><span>${phone}</span></div></div></div>`;
  }

  return shell('ocr-review', `${heading('Review extracted information', 'Check the values below against the original document before continuing.', `<button class="button" type="button" data-ocr-back>Back</button><button class="button button--primary" type="button" data-ocr-continue>Continue to details ${icon('arrowRight')}</button>`)}<div class="form-layout"><div class="review-layout"><section class="card document-preview"><div class="document-toolbar"><span class="badge badge--blue">Uploaded document</span><div class="document-toolbar__controls"><button class="icon-button icon-button--small tooltip" data-tooltip="Rotate" type="button" data-ocr-rotate>${icon('rotate')}</button><button class="icon-button icon-button--small tooltip" data-tooltip="Fullscreen" type="button" data-ocr-fullscreen>${icon('maximize')}</button></div></div>${previewHTML}</section><form class="card"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Extracted fields</h2><p>Fields marked for review are lower-confidence values. Nothing proceeds without your confirmation.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">First name</span><input class="input" value="${firstName}" name="firstName"></label><label class="field"><span class="field__label">Last name</span><input class="input" value="${lastName}" name="lastName"></label><label class="field"><span class="field__label">Date of birth</span><input class="input" value="${dob}" name="date"></label><label class="field"><span class="field__label">Gender</span><input class="input" value="${gender}" name="gender"></label><label class="field"><span class="field__label">Blood group</span><input class="input" value="${blood}" name="blood"></label><label class="field"><span class="field__label">ID number</span><input class="input" value="${idNumber}" name="idNumber"></label><label class="field form-span-all"><span class="field__label">Father / guardian</span><input class="input" value="${father}" name="father"></label><label class="field form-span-all"><span class="field__label">Mother name</span><input class="input" value="${mother}" name="mother"></label></div></section><section class="form-section"><label class="checkbox"><input type="checkbox" data-ocr-confirm required><span>I’ve checked the extracted details against the original document.</span></label></section></form></div>${steps(2, true)}</div>`);
}

export function ocrDetailsPage() {
  const ocrData = JSON.parse(localStorage.getItem('ocr-parsed-data') || '{}');
  const firstName = ocrData.firstName || '';
  const lastName = ocrData.lastName || '';
  const father = ocrData.father || '';
  const mother = ocrData.mother || '';
  const gender = ocrData.gender || '';
  const blood = ocrData.blood || '';
  const phone = ocrData.phone || '';
  const idNumber = ocrData.idNumber || '';

  return shell('ocr-details', `${heading('Additional details', 'Complete the remaining information before you save this verified student record.', `<a class="button" href="${pagePath('ocr-review')}">Back</a><button class="button button--primary" type="submit" form="ocr-additional-form">Save student</button>`)}<div class="form-layout"><form class="card" id="ocr-additional-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Admission & contact</h2><p>These details were not present in the uploaded document.</p></div><div class="form-grid--two">${field('Admission date *', 'admissionDate', '', 'date', '', new Date().toISOString().slice(0, 10))}${field('Mother name', 'mother', 'e.g. Priya Sharma', 'text', '', mother)}${field('Mobile number *', 'phone', 'e.g. +91 98221 40393', 'tel', '', phone)}${field('Email address', 'email', 'parent@example.com', 'email')}<label class="field"><span class="field__label">Class / grade *</span><select class="select" name="grade"><option>Grade 6</option><option>Grade 7</option><option selected>Grade 8</option><option>Grade 9</option></select></label><label class="field"><span class="field__label">Section *</span><select class="select" name="section"><option selected>A</option><option>B</option><option>C</option></select></label><label class="field form-span-all"><span class="field__label">Address</span><textarea class="textarea" name="address" placeholder="Street address, city, state, postcode"></textarea></label></div></section><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Final verification</h2><p>You’re about to create the student record. It can be updated later by authorized staff.</p></div><label class="checkbox"><input type="checkbox" required><span>I confirm the information is accurate and complete.</span></label></section><input type="hidden" name="firstName" value="${firstName}"><input type="hidden" name="lastName" value="${lastName}"><input type="hidden" name="father" value="${father}"><input type="hidden" name="gender" value="${gender}"><input type="hidden" name="blood" value="${blood}"><input type="hidden" name="idNumber" value="${idNumber}"><input type="hidden" name="dob" value="${ocrData.dob || ''}"></form>${steps(3, true)}</div>`);
}

export function documentsPage() {
  const docs = getUploadedDocs();
  let contentHTML = '';
  
  if (docs.length === 0) {
    contentHTML = `<div class="empty-state" style="padding:48px 24px">
      <span class="empty-state__icon">${icon('file')}</span>
      <h3>No documents submitted yet</h3>
      <p>Use Smart Upload to extract details and verify document records.</p>
    </div>`;
  } else {
    contentHTML = `<div class="document-grid" id="document-grid">
      ${docs.map((doc, idx) => `
        <article class="card document-card card--interactive" data-document-idx="${idx}" data-document="${doc.name.toLowerCase()} ${doc.student.toLowerCase()}">
          <div class="document-card__preview" style="position:relative; width:100%; height:120px; overflow:hidden; background:var(--color-bg-alt); display:flex; align-items:center; justify-content:center; border-radius:6px;">
            ${doc.image ? `<img src="${doc.image}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" />` : icon('file')}
          </div>
          <div class="document-card__body" style="padding-top:12px;">
            <div class="document-card__title-line" style="display:flex; justify-content:space-between; align-items:center;">
              <h2 class="document-card__title" style="font-size:14px; font-weight:600; margin:0;">${doc.name}</h2>
              ${statusBadge(doc.status)}
            </div>
            <div class="document-card__meta" style="margin-top:6px; font-size:12px; color:var(--color-text-muted); display:flex; justify-content:space-between;">
              <span>${doc.student}</span>
              <span>${doc.meta}</span>
            </div>
          </div>
        </article>
      `).join('')}
    </div>`;
  }

  return shell('documents', `${heading('Documents', 'A focused workspace for reviewing, validating, and organizing student files.', `<a class="button" href="${pagePath('ocr-upload')}">${icon('scan')}Smart upload</a>`)}<section class="card"><div class="table-toolbar"><label class="input-group table-toolbar__search">${icon('search')}<input class="input" type="search" placeholder="Search documents or students" data-document-search></label><div class="table-toolbar__actions"><button class="button button--sm" type="button" data-filter-docs>${icon('filter')}Status: All</button></div></div><div class="card__body">${contentHTML}</div></section>`);
}

export function reportsPage() {
  return shell('reports', `${heading('Reports', 'A clear view of admissions, record health, and student demographics.', `<button class="button" type="button" data-report-email>${icon('mail')}Email report</button><button class="button" type="button" data-report-print>${icon('printer')}Print</button><button class="button button--primary" type="button" data-report-export>${icon('download')}Export</button>`)}<section class="card"><div class="filter-row"><label class="field"><span class="field__label">Report period</span><select class="select"><option>Last 6 months</option><option>Last 12 months</option><option>Academic year</option></select></label><label class="field"><span class="field__label">Grade</span><select class="select"><option>All grades</option><option>Grade 6</option><option>Grade 7</option><option>Grade 8</option></select></label><label class="field"><span class="field__label">Status</span><select class="select"><option>All statuses</option><option>Active</option><option>Pending</option></select></label><button class="button button--sm" type="button" data-apply-report>Apply filters</button></div></section><div class="report-grid section-gap"><article class="card report-card"><span class="eyebrow">Admissions</span><div class="report-card__value">248</div><p class="report-card__caption"><span class="trend--up">↑ 12.4%</span> compared to prior period</p></article><article class="card report-card"><span class="eyebrow">Active records</span><div class="report-card__value">1,190</div><p class="report-card__caption">92.7% of all student records</p></article><article class="card report-card"><span class="eyebrow">Document completion</span><div class="report-card__value">96.8%</div><p class="report-card__caption">18 records need attention</p></article></div><div class="dashboard-grid dashboard-grid--lower"><section class="card chart-card"><header class="card__header"><div><h2 class="card__title">Admissions trend</h2><p class="card__caption">New student records created each month</p></div></header><div class="chart-card__body">${admissionsChart()}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Gender distribution</h2><p class="card__caption">Across active student records</p></div></header><div class="card__body"><div class="distribution"><div class="distribution__row"><span class="distribution__label">Female</span><div class="progress"><div class="progress__bar progress__bar--49"></div></div><span class="distribution__value">49%</span></div><div class="distribution__row"><span class="distribution__label">Male</span><div class="progress"><div class="progress__bar progress__bar--48"></div></div><span class="distribution__value">48%</span></div><div class="distribution__row"><span class="distribution__label">Other</span><div class="progress"><div class="progress__bar progress__bar--3"></div></div><span class="distribution__value">3%</span></div></div></div></section></div><div class="dashboard-grid dashboard-grid--lower"><section class="card"><header class="card__header"><div><h2 class="card__title">Blood group distribution</h2><p class="card__caption">Useful for medical readiness</p></div></header><div class="card__body"><div class="distribution">${[['O+', 36], ['B+', 29], ['A+', 22], ['AB+', 13]].map(([group, value]) => `<div class="distribution__row"><span class="distribution__label">${group}</span><div class="progress"><div class="progress__bar progress__bar--${value}"></div></div><span class="distribution__value">${value}%</span></div>`).join('')}</div></div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Record health</h2><p class="card__caption">Completeness and verification state</p></div></header><div class="card__body"><div class="distribution"><div class="distribution__row"><span class="distribution__label">Verified</span><div class="progress"><div class="progress__bar progress__bar--93"></div></div><span class="distribution__value">93%</span></div><div class="distribution__row"><span class="distribution__label">In review</span><div class="progress"><div class="progress__bar progress__bar--5"></div></div><span class="distribution__value">5%</span></div><div class="distribution__row"><span class="distribution__label">Missing</span><div class="progress"><div class="progress__bar progress__bar--2"></div></div><span class="distribution__value">2%</span></div></div></div></section></div>`);
}

export function exportPage() {
  const students = getStudents();
  const totalStudents = students.length;
  const pendingCount = students.filter(s => s.status === 'Pending').length;

  return shell('export', `${heading('Export centre', 'Create an export that is scoped to exactly the records you need.', `<a class="button button--ghost" href="${pagePath('students')}">Back to students</a>`)}<div class="form-layout"><section class="card"><div class="form-section"><div class="form-section__heading"><h2 class="card__title">Configure your export</h2><p>Select the data, format, and delivery for a secure, reusable export.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">Records</span><select class="select"><option>All active students (${totalStudents})</option><option>Students with pending documents (${pendingCount})</option><option>Selected student records</option></select></label><label class="field"><span class="field__label">Format</span><select class="select"><option>Excel workbook (.xlsx)</option><option>CSV file (.csv)</option><option>PDF summary (.pdf)</option></select></label><label class="field"><span class="field__label">Include fields</span><select class="select"><option>Core record details</option><option>Complete record details</option><option>Medical information only</option></select></label><label class="field"><span class="field__label">Delivery</span><select class="select"><option>Download now</option><option>Email a secure link</option></select></label></div></div><div class="form-section"><div class="form-section__heading"><h2 class="card__title">Privacy controls</h2><p>Limit sensitive data to the people who need it.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span>Mask contact phone numbers</label><label class="switch"><input type="checkbox"><span class="switch__track"></span>Include medical information</label></div><div class="form-section"><button class="button button--primary" type="button" data-create-export>${icon('download')}Create export</button></div></section><aside class="card form-aside"><div class="card__header"><div><h2 class="card__title">Export summary</h2></div></div><div class="card__body"><div class="detail-list detail-list--single"><div class="detail-row"><span>Estimated records</span><b>${totalStudents} students</b></div><div class="detail-row"><span>Estimated size</span><b>~ 2.4 MB</b></div><div class="detail-row"><span>Data access</span><b>Administrators only</b></div></div><div class="card__caption card__caption--spaced">Exports are logged in your activity history for auditability.</div></div></aside></div>`);
}

export function settingsPage() {
  const orgName = localStorage.getItem('sample-org-name') || 'An Organisation';
  const orgCode = localStorage.getItem('sample-org-code') || 'ORG-IND-01';
  const orgEmail = localStorage.getItem('sample-org-email') || 'admin@organisation.org';
  const orgTimezone = localStorage.getItem('sample-org-timezone') || 'Asia / Kolkata';

  return shell('settings', `${heading('Settings', 'Keep your workspace secure, consistent, and ready for your organisation.', `<button class="button button--primary" type="button" data-save-settings>Save changes</button>`)}<div class="settings-layout"><nav class="card settings-nav" aria-label="Settings sections"><button type="button" class="active">Workspace</button><button type="button">Profile & team</button><button type="button">Student fields</button><button type="button">Notifications</button><button type="button">Security</button></nav><section class="card settings-panel"><h2>Workspace</h2><p class="muted">Manage the details that appear across your workspace.</p><div class="form-grid--two form-gap">${field('Organisation name', 'schoolName', 'An Organisation', 'text', '', orgName)}${field('Organisation code', 'schoolCode', 'ORG-IND-01', 'text', '', orgCode)}${field('Primary contact email', 'contact', 'admin@organisation.org', 'email', '', orgEmail)}${field('Timezone', 'timezone', 'Asia / Kolkata', 'text', '', orgTimezone)}</div><div class="settings-row"><div><b>Admission notifications</b><p>Notify administrators when a new record is added.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span><span class="sr-only">Admission notifications</span></label></div><div class="settings-row"><div><b>Document review reminders</b><p>Send a weekly reminder for records awaiting verification.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span><span class="sr-only">Document review reminders</span></label></div><div class="settings-row"><div><b>Two-factor authentication</b><p>Require administrators to use an additional security step at sign in.</p></div><button class="button button--sm" type="button" data-2fa>Configure</button></div></section></div>`);
}

export function renderPage(page) {
  const pages = { login: loginPage, dashboard: dashboardPage, students: studentsPage, 'student-profile': profilePage, 'add-student': addStudentPage, 'ocr-upload': ocrUploadPage, 'ocr-processing': ocrProcessingPage, 'ocr-review': ocrReviewPage, 'ocr-details': ocrDetailsPage, documents: documentsPage, reports: reportsPage, export: exportPage, settings: settingsPage };
  return (pages[page] || dashboardPage)();
}
