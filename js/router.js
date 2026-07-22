import { icon, initials, pagePath, statusBadge, escapeHTML, formatDate, healthDot } from './utils.js';
import { getChildren, getChild, getActivities, getPendingDocs, timeAgo, activityIcon, activityLabel, getUploadedDocs, getAppointments, getMedicines, getExpenses, getEmergencyContacts, getSponsors, getGrowthRecords, getMeals, getAllMeals, getHealthRecords, getAlerts, healthStatus, calculateAge, ageGroup } from './storage.js';
import { childRows } from './table.js';
import { registrationChart } from './chart.js';

/* ═══════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════ */

const nav = [
  { section: 'Overview', items: [['dashboard', 'Dashboard', 'grid']] },
  { section: 'Children', items: [['children', 'Children', 'users'], ['growth', 'Growth', 'ruler'], ['nutrition', 'Nutrition', 'apple']] },
  { section: 'Health', items: [['medicines', 'Medicines', 'pill'], ['appointments', 'Appointments', 'calendar'], ['documents', 'Documents', 'file']] },
  { section: 'Management', items: [['expenses', 'Expenses', 'wallet'], ['emergency', 'Emergency', 'phone']] },
  { section: 'Workspace', items: [['reports', 'Reports', 'chart'], ['export', 'Export', 'export']] }
];

const pageTitles = {
  dashboard: 'Dashboard',
  children: 'Children',
  'child-profile': 'Child profile',
  'register-child': 'Register child',
  'ocr-upload': 'Medical document upload',
  'ocr-review': 'Review extracted information',
  'ocr-details': 'Additional details',
  'ocr-processing': 'Processing document',
  documents: 'Health records',
  reports: 'Health reports',
  export: 'Export centre',
  settings: 'Settings',
  growth: 'Growth tracking',
  nutrition: 'Nutrition tracker',
  medicines: 'Medicine management',
  appointments: 'Appointments',
  emergency: 'Emergency contacts',
  expenses: 'Expense management'
};

function navItem(item, active) {
  const [page, label, glyph] = item;
  return `<a class="nav-item ${page === active ? 'nav-item--active' : ''}" href="${pagePath(page)}" ${page === active ? 'aria-current="page"' : ''}>${icon(glyph)}<span class="nav-item__text">${label}</span></a>`;
}

/* ═══════════════════════════════════════════════════════
   APP SHELL
   ═══════════════════════════════════════════════════════ */

export function shell(page, content) {
  const orgName = localStorage.getItem('sample-org-name') || 'An Organisation';
  const orgInitials = orgName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'AO';
  const navHTML = nav.map(group => `<div class="sidebar__label">${group.section}</div>${group.items.map(item => navItem(item, page)).join('')}`).join('');

  return `<div class="app-shell">
    <aside class="sidebar" aria-label="Primary navigation">
      <div class="sidebar__header"><a class="sidebar__brand" href="${pagePath('dashboard')}" aria-label="Home"><span class="brand-mark">${icon('heartPulse')}</span><span class="brand-name">ChildCare</span></a><button class="sidebar__toggle" type="button" data-collapse-sidebar aria-label="Collapse sidebar">${icon('menu')}</button></div>
      <nav class="sidebar__nav">${navHTML}<div class="sidebar__label">System</div><a class="nav-item ${page === 'settings' ? 'nav-item--active' : ''}" href="${pagePath('settings')}">${icon('settings')}<span class="nav-item__text">Settings</span></a></nav>
      <div class="sidebar__foot"><div class="workspace-user"><span class="workspace-user__avatar">${orgInitials}</span><span class="workspace-user__copy"><span class="workspace-user__name">${orgName}</span><span class="workspace-user__role">Admin</span></span></div></div>
    </aside><div class="mobile-backdrop" hidden data-close-sidebar></div>
    <main class="app-main" id="app-main"><header class="topbar">${page === 'dashboard' ? '' : `<button class="icon-button" data-topbar-back aria-label="Go back">${icon('chevronLeft')}</button>`}<div class="topbar__crumbs"><span>ChildCare</span><span aria-hidden="true"> / </span><b>${pageTitles[page] || 'Workspace'}</b></div><label class="topbar-search"><span class="sr-only">Search child records</span>${icon('search')}<input type="search" placeholder="Search children, health records…" data-global-search><kbd>⌘ K</kbd></label><div class="topbar__actions"><button class="icon-button tooltip" data-tooltip="Toggle theme" data-theme-toggle type="button" aria-label="Toggle color theme">${icon('sun')}</button><button class="icon-button tooltip" data-tooltip="Notifications" type="button" aria-label="Notifications" data-notifications>${icon('bell')}</button><div class="topbar-profile"><button class="topbar-profile__trigger" data-profile-menu type="button" aria-haspopup="true" aria-expanded="false"><span class="avatar">AD</span><span class="topbar-profile__name">Admin</span>${icon('chevronDown')}</button><div class="dropdown" hidden data-profile-dropdown><a class="dropdown__item" href="${pagePath('settings')}">${icon('settings')}Account settings</a><div class="divider"></div><button class="dropdown__item" type="button" data-sign-out>${icon('lock')}Sign out</button></div></div></div></header><section class="content page-enter">${content}</section></main></div>`;
}

const heading = (title, description, actions) => `<div class="page-heading"><div class="page-heading__copy"><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="page-heading__actions">${actions}</div>` : ''}</div>`;

function getDynamicGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, Admin';
  if (hour < 17) return 'Good afternoon, Admin';
  return 'Good evening, Admin';
}

const statCard = (label, value, trend, glyph, color) => `<article class="card stat-card card--interactive"><div class="stat-card__top"><span class="stat-card__label">${label}</span><span class="stat-card__icon stat-card__icon--${color}">${icon(glyph)}</span></div><div class="stat-card__number">${value}</div><div class="stat-card__footer"><span class="trend--up">${icon('arrowUp')} ${trend}</span><span>from last month</span></div></article>`;

const field = (label, name, placeholder, type = 'text', hint = '', value = '') => `<label class="field"><span class="field__label">${label}</span><input class="input" name="${name}" type="${type}" placeholder="${placeholder}" value="${escapeHTML(value)}">${hint ? `<span class="field__hint">${hint}</span>` : ''}</label>`;

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const matchDMY = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (matchDMY) {
    const [_, d, m, y] = matchDMY;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  try { const d = new Date(dateStr); if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10); } catch (e) {}
  return '';
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD — Health Monitoring
   ═══════════════════════════════════════════════════════ */

export function dashboardPage() {
  const children = getChildren();
  const totalChildren = children.length;
  const pendingDocsTotal = getPendingDocs().length;

  // Health alerts — children with flags
  const flaggedChildren = children.filter(c => healthStatus(c).level !== 'good');
  const alertCount = flaggedChildren.length;

  // Upcoming appointments (next 7 days)
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingAppts = getAppointments().filter(a => {
    const d = new Date(a.date);
    return a.status !== 'Completed' && d >= now && d <= weekAhead;
  }).length;

  // Active medications
  const activeMeds = getMedicines().filter(m => m.status === 'Active').length;

  // Verified records
  const verifiedCount = children.filter(c => c.status === 'Verified' || c.status === 'Active').length;

  // Recent activity
  const activities = getActivities().slice(0, 5);
  let activityHTML = '';
  if (activities.length === 0) {
    activityHTML = `<div class="empty-state" style="padding:24px 12px"><span class="empty-state__icon">${icon('clock')}</span><h3 style="font-size:13px">No activity yet</h3><p>Actions like registering children or uploading documents will appear here.</p></div>`;
  } else {
    activityHTML = `<div class="activity-list">${activities.map(a => `<div class="activity-item"><span class="activity-icon">${icon(activityIcon(a.type))}</span><div class="activity-copy"><b>${activityLabel(a.type)}</b> for ${a.subject}<time>${timeAgo(a.timestamp)}</time></div></div>`).join('')}</div>`;
  }

  // Children needing attention
  let attentionHTML = '';
  if (flaggedChildren.length === 0) {
    attentionHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon('check')}</span><h3 style="font-size:13px">All children healthy</h3><p>No health alerts at this time.</p></div></td></tr>`;
  } else {
    attentionHTML = flaggedChildren.slice(0, 4).map(child => {
      const hs = healthStatus(child);
      return `<tr><td><a class="table-person" href="${pagePath('child-profile')}?id=${child.id}"><span class="table-avatar">${initials(child.name)}</span><span class="table-person__info"><b class="table-person__name">${child.name}</b><span class="table-person__id">${child.id}</span></span></a></td><td>${calculateAge(child.dob) || '—'}</td><td class="hide-tablet">${hs.flags.join(', ')}</td><td>${healthDot(hs.level)} ${statusBadge(hs.level === 'critical' ? 'Critical' : 'Pending')}</td></tr>`;
    }).join('');
  }

  // Pending documents
  const pendingDocs = getPendingDocs().slice(0, 5);
  let pendingDocsHTML = '';
  if (pendingDocs.length === 0) {
    pendingDocsHTML = `<div class="empty-state" style="padding:24px 12px"><span class="empty-state__icon">${icon('file')}</span><h3 style="font-size:13px">No pending documents</h3><p>Documents pending review will appear here.</p></div>`;
  } else {
    pendingDocsHTML = pendingDocs.map((doc, index) => `<div class="list-row"><span class="list-row__avatar">${index + 1}</span><span class="list-row__copy"><b>${doc.docName}</b><span>${doc.childName}</span></span><span class="list-row__meta">Awaiting<br>review</span></div>`).join('');
  }

  // Active Health & System Alerts
  const alertsList = getAlerts().filter(a => !a.dismissed).slice(0, 5);
  let alertsHTML = '';
  if (alertsList.length === 0) {
    alertsHTML = `<div class="empty-state" style="padding:24px 12px"><span class="empty-state__icon">${icon('check')}</span><h3 style="font-size:13px">All alerts resolved</h3><p>No active health alerts or warnings.</p></div>`;
  } else {
    alertsHTML = alertsList.map(a => `
      <div class="list-row" style="border-left: 3px solid ${a.type === 'critical' ? 'var(--color-danger)' : a.type === 'warning' ? 'var(--color-warning)' : 'var(--color-primary)'}; padding-left: 10px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span class="list-row__copy" style="margin-left: 4px;">
          <b style="color: ${a.type === 'critical' ? 'var(--color-danger)' : a.type === 'warning' ? 'var(--color-warning)' : 'inherit'}; font-size: 13px;">${a.message}</b>
          <span style="font-size: 11px;">${a.childName}</span>
        </span>
        <button class="icon-button icon-button--small tooltip" data-tooltip="Dismiss" type="button" data-dismiss-alert="${a.id}" aria-label="Dismiss alert" style="margin-left: auto;">${icon('x')}</button>
      </div>
    `).join('');
  }

  return shell('dashboard', `${heading(getDynamicGreeting(), 'Here\u2019s an overview of your children\u2019s health workspace today.', `<a class="button" href="${pagePath('ocr-upload')}">${icon('scan')}Upload document</a><a class="button button--primary" href="${pagePath('register-child')}">${icon('plus')}Register child</a>`)}
  <div class="stat-grid">${statCard('Total children', totalChildren.toLocaleString(), verifiedCount > 0 ? Math.round(verifiedCount / Math.max(totalChildren, 1) * 100) + '%' : '0%', 'users', 'blue')}${statCard('Health alerts', alertCount.toLocaleString(), alertCount > 0 ? alertCount + ' need attention' : 'All clear', 'alertCircle', alertCount > 0 ? 'amber' : 'green')}${statCard('Upcoming appointments', upcomingAppts.toLocaleString(), upcomingAppts > 0 ? 'Next 7 days' : 'None scheduled', 'calendar', 'violet')}${statCard('Active medications', activeMeds.toLocaleString(), activeMeds > 0 ? activeMeds + ' prescriptions' : 'None active', 'pill', 'green')}</div>
  <div class="dashboard-grid dashboard-grid--primary">
    <section class="card">
      <header class="card__header">
        <div>
          <h2 class="card__title">Active alerts</h2>
          <p class="card__caption">Critical warnings and updates needing caregiver attention</p>
        </div>
        <span class="badge badge--danger">${alertsList.length > 0 ? alertsList.length + ' active' : 'None'}</span>
      </header>
      <div class="card__body" style="padding-top: 10px;">
        ${alertsHTML}
      </div>
    </section>
    <section class="card">
      <header class="card__header">
        <div>
          <h2 class="card__title">Quick actions</h2>
          <p class="card__caption">Common tasks, kept close</p>
        </div>
      </header>
      <div class="card__body">
        <div class="quick-actions">
          <a class="quick-action" href="${pagePath('growth')}"><span class="quick-action__icon">${icon('ruler')}</span>Log growth</a>
          <a class="quick-action" href="${pagePath('nutrition')}"><span class="quick-action__icon">${icon('apple')}</span>Log meal</a>
          <a class="quick-action" href="${pagePath('appointments')}"><span class="quick-action__icon">${icon('calendar')}</span>Appointments</a>
          <a class="quick-action" href="${pagePath('medicines')}"><span class="quick-action__icon">${icon('pill')}</span>Medicines</a>
        </div>
      </div>
    </section>
  </div>
  <div style="margin-top: 24px;">
    <section class="card">
      <header class="card__header">
        <div>
          <h2 class="card__title">Children needing attention</h2>
          <p class="card__caption">Health alerts and flagged records</p>
        </div>
        <a class="button button--sm" href="${pagePath('children')}">View all ${icon('arrowRight')}</a>
      </header>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Child</th>
              <th>Age</th>
              <th class="hide-tablet">Health flags</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${attentionHTML}
          </tbody>
        </table>
      </div>
    </section>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   LOGIN
   ═══════════════════════════════════════════════════════ */

export function loginPage() {
  return `<main class="login-page"><section class="login-panel"><div class="login-panel__brand" aria-label="ChildCare home"><span class="brand-mark">${icon('heartPulse')}</span><b>ChildCare</b></div><div class="card login-card"><h1>Workspace access</h1>
  <div style="background:rgba(37,99,235,0.1); color:var(--color-primary); padding:10px 14px; border-radius:8px; font-size:12px; margin-bottom:18px; border:1px solid rgba(37,99,235,0.15); line-height:1.4">
    🔑 <b>Demo Admin Credentials:</b> Use ID <code>admin-ngo</code>
  </div>
  <form data-login-form>
    <label class="field"><span class="field__label">Admin User ID *</span><input class="input" type="text" data-admin-id-input placeholder="e.g. admin-ngo" required autocomplete="off"></label>
    <button class="button button--primary" type="submit" style="width:100%; margin-top:6px; min-height:44px; font-size:14px">Sign in with Admin ID ${icon('arrowRight')}</button>
  </form>
  <div style="display:flex; align-items:center; gap:10px; margin:20px 0; color:var(--color-text-muted); font-size:11px"><div style="flex:1; height:1px; background:var(--color-border)"></div>OR<div style="flex:1; height:1px; background:var(--color-border)"></div></div>
  <button class="button tooltip" data-tooltip="Sign in with pre-authorized Google Account" data-google-login type="button" style="width:100%; min-height:44px; display:flex; align-items:center; justify-content:center; gap:10px; font-weight:600; font-size:14px">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.56 2.69-3.86 2.69-6.62Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18Z" fill="#34A853"/><path d="M3.97 10.76a5.4 5.4 0 0 1 0-3.52V4.91H.95a9 9 0 0 0 0 8.18l3.02-2.33Z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A9 9 0 0 0 .95 4.91l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z" fill="#EA4335"/></svg>
    Continue with Google
  </button>
  <p class="login-card__foot">Protected by role-based permissions and secure audit logs.</p></div></section></main>`;
}

/* ═══════════════════════════════════════════════════════
   CHILDREN LIST
   ═══════════════════════════════════════════════════════ */

export function childrenPage() {
  const children = getChildren();
  const totalItems = children.length;
  const itemsPerPage = 5;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginated = children.slice(0, itemsPerPage);

  return shell('children', `${heading('Children', 'Search, monitor, and manage every child record in one place.', `<button class="button" type="button" data-bulk-export>${icon('export')}Export</button><a class="button button--primary" href="${pagePath('register-child')}">${icon('plus')}Register child</a>`)}
  <section class="card"><div class="table-toolbar"><label class="input-group table-toolbar__search">${icon('search')}<input class="input" id="child-search" type="search" placeholder="Search name, guardian, phone, ID…" aria-label="Search children"></label><div class="table-toolbar__actions"><button class="button button--sm" type="button" data-filter-toggle>${icon('filter')}Filters</button><button class="icon-button tooltip" data-tooltip="Column visibility" type="button" aria-label="Change visible columns" data-column-visibility-toggle>${icon('settings')}</button></div></div><div class="filter-row" hidden data-filter-row><label class="field"><span class="field__label">Status</span><select class="select" data-filter-status><option value="">All statuses</option><option>Active</option><option>Pending</option><option>Verified</option></select></label><label class="field"><span class="field__label">Blood group</span><select class="select" data-filter-blood><option value="">All groups</option><option>A+</option><option>B+</option><option>O+</option><option>AB+</option><option>A-</option><option>B-</option><option>O-</option><option>AB-</option></select></label><button class="button button--ghost button--sm" type="button" data-clear-filters>Clear filters</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th><label class="checkbox"><input id="select-all" type="checkbox" aria-label="Select all children"><span class="sr-only">Select all</span></label></th><th data-resizable><button class="sort-button" type="button" data-sort="name">Child ${icon('chevronDown')}</button></th><th data-resizable data-column="age">Age</th><th class="hide-tablet" data-column="gender">Gender</th><th class="hide-tablet" data-column="blood">Blood group</th><th data-column="status">Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody id="child-table-body">${childRows(paginated)}</tbody></table></div><footer class="pagination"><span id="child-count">${totalItems} children (Page 1 of ${totalPages})</span><div class="pagination__buttons"><button class="button button--sm" id="btn-prev" disabled>${icon('chevronLeft')}Previous</button><button class="button button--sm" id="btn-next" ${totalPages <= 1 ? 'disabled' : ''}>Next${icon('chevronRight')}</button></div></footer></section>`);
}

/* ═══════════════════════════════════════════════════════
   CHILD PROFILE
   ═══════════════════════════════════════════════════════ */

export function childProfilePage() {
  const id = new URLSearchParams(window.location.search).get('id');
  const child = getChild(id);
  if (!child) return shell('child-profile', '<div class="card"><div class="card__body">Child record not found.</div></div>');

  const hs = healthStatus(child);
  const age = calculateAge(child.dob);
  const growth = getGrowthRecords(child.id);
  const latestGrowth = growth[0];
  const appts = getAppointments(child.id);
  const meds = getMedicines(child.id).filter(m => m.status === 'Active');
  const docs = getUploadedDocs().filter(d => (d.childName && d.childName.toLowerCase() === child.name.toLowerCase()) || d.childId === child.id);
  const healthRecs = getHealthRecords(child.id);
  const meals = getMeals(child.id);
  const activities = getActivities().filter(a => (a.childName && a.childName.toLowerCase() === child.name.toLowerCase()) || (a.detail && a.detail.includes(child.name)));

  // Docs HTML for Documents tab
  let docsHTML = '';
  if (docs.length === 0) {
    docsHTML = `<div class="empty-state" style="padding: 36px 24px;"><span class="empty-state__icon">${icon('file')}</span><h3>No documents uploaded</h3><p>Medical records and certificates uploaded for ${child.name} will appear here.</p></div>`;
  } else {
    docsHTML = `<div class="document-grid">${docs.map(d => `<article class="card document-card"><div class="document-card__body" style="padding:16px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;"><h3 style="font-size:14px; font-weight:600; margin:0;">${d.title || d.fileName || 'Medical Document'}</h3><span class="badge badge--success">${d.status || 'Verified'}</span></div><div class="detail-list detail-list--single" style="font-size:13px;"><div class="detail-row"><span>Category</span><b>${d.category || 'Medical Report'}</b></div><div class="detail-row"><span>Uploaded</span><b>${d.uploadDate || formatDate(d.timestamp) || 'Recently'}</b></div></div>${d.fileData ? `<div style="margin-top:12px;"><a class="button button--sm" href="${d.fileData}" target="_blank" download="${d.title || 'document'}.png">${icon('download')} View / Download</a></div>` : ''}</div></article>`).join('')}</div>`;
  }

  // Health records HTML
  let healthRecsHTML = '';
  if (healthRecs.length === 0 && meds.length === 0) {
    healthRecsHTML = `<div class="empty-state" style="padding: 36px 24px;"><span class="empty-state__icon">${icon('heartPulse')}</span><h3>No lab reports logged</h3><p>Blood test results and clinical lab reports will appear here.</p></div>`;
  } else {
    healthRecsHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        ${healthRecs.length > 0 ? `
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Date</th><th>Test Type</th><th>Hemoglobin</th><th>WBC</th><th>RBC</th><th>Platelets</th></tr>
              </thead>
              <tbody>
                ${healthRecs.map(r => `<tr><td>${r.date || 'Today'}</td><td><span class="badge badge--blue">${(r.type || 'CBC').toUpperCase()}</span></td><td><b>${r.hemoglobin ? r.hemoglobin + ' g/dL' : '—'}</b></td><td>${r.wbc || '—'}</td><td>${r.rbc || '—'}</td><td>${r.platelets || '—'}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>` : ''}
        <div class="detail-list">
          <div class="detail-row"><span>Known Medical Conditions</span><b>${child.medicalConditions || 'None reported'}</b></div>
          <div class="detail-row"><span>Allergies</span><b>${child.allergies || 'None reported'}</b></div>
          <div class="detail-row"><span>Active Prescriptions</span><b>${meds.length > 0 ? meds.map(m => `${m.medicineName} (${m.dosage})`).join(', ') : 'None active'}</b></div>
        </div>
      </div>`;
  }

  // Growth & Nutrition HTML
  let growthHTML = '';
  if (growth.length === 0 && meals.length === 0) {
    growthHTML = `<div class="empty-state" style="padding: 36px 24px;"><span class="empty-state__icon">${icon('ruler')}</span><h3>No growth records</h3><p>Height, weight, and meal logs will appear here.</p></div>`;
  } else {
    growthHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        ${growth.length > 0 ? `
          <h3 style="font-size:14px; font-weight:600;">Growth Measurements History</h3>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Height</th><th>Weight</th><th>BMI</th></tr></thead>
              <tbody>
                ${growth.map(g => `<tr><td>${formatDate(g.date || g.timestamp)}</td><td><b>${g.height} cm</b></td><td><b>${g.weight} kg</b></td><td><span class="badge badge--neutral">${g.bmi || '—'}</span></td></tr>`).join('')}
              </tbody>
            </table>
          </div>` : ''}
        ${meals.length > 0 ? `
          <h3 style="font-size:14px; font-weight:600; margin-top: 10px;">Logged Meals & Nutrition</h3>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead><tr><th>Date / Time</th><th>Meal Type</th><th>Description</th></tr></thead>
              <tbody>
                ${meals.map(m => `<tr><td>${formatDate(m.timestamp)}</td><td><span class="badge badge--success">${m.mealType}</span></td><td>${m.description}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>` : ''}
      </div>`;
  }

  // Timeline HTML
  let timelineHTML = '';
  if (activities.length === 0) {
    timelineHTML = `<div class="timeline"><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Child registered</b><p>Record created in the health management workspace.</p><time>${child.registeredDate ? formatDate(child.registeredDate) : 'Recently'}</time></div></div></div>`;
  } else {
    timelineHTML = `<div class="timeline">${activities.map(a => `<div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>${a.action ? a.action.replace(/_/g, ' ').toUpperCase() : 'ACTIVITY'}</b><p>${a.detail || a.childName}</p><time>${timeAgo(a.timestamp)}</time></div></div>`).join('')}</div>`;
  }

  return shell('child-profile', `${heading('Child profile', 'A complete, well-organized health record for this child.', `<button class="button" type="button" data-profile-print>${icon('printer')}Print</button><button class="button button--primary" type="button" data-edit="${child.id}">${icon('pencil')}Edit profile</button>`)}
  <section class="card">
    <div class="profile-header">
      <span class="profile-header__avatar">${initials(child.name)}</span>
      <div class="profile-header__copy">
        <h1>${child.name}</h1>
        <p>${child.id} · ${age ? age + ' old' : 'Age unknown'}</p>
        <div class="profile-header__meta">
          ${healthDot(hs.level)} ${statusBadge(child.status)}
          <span class="badge badge--neutral">${child.gender || 'Not specified'}</span>
          <span class="badge badge--blue">Blood: ${child.blood || 'Unknown'}</span>
          ${hs.flags.length ? `<span class="badge badge--warning">${hs.flags.join(', ')}</span>` : ''}
        </div>
      </div>
      <div class="profile-header__actions">
        <button class="icon-button tooltip" type="button" data-tooltip="More actions" aria-label="More actions">${icon('more')}</button>
      </div>
    </div>
    <div class="profile-tabs">
      <div class="tabs" role="tablist">
        <button class="tab tab--active" type="button" data-profile-tab="overview">Overview</button>
        <button class="tab" type="button" data-profile-tab="guardian">Guardian & Emergency</button>
        <button class="tab" type="button" data-profile-tab="health">Health Records</button>
        <button class="tab" type="button" data-profile-tab="growth">Growth & Nutrition</button>
        <button class="tab" type="button" data-profile-tab="documents">Documents (${docs.length})</button>
        <button class="tab" type="button" data-profile-tab="timeline">Timeline</button>
        <button class="tab" type="button" data-profile-tab="notes">Notes</button>
      </div>
    </div>
  </section>

  <div class="profile-tab-content-container">
    <!-- OVERVIEW TAB -->
    <div data-tab-panel="overview">
      <div class="profile-layout">
        <div class="dashboard-grid">
          <section class="card">
            <header class="card__header">
              <div><h2 class="card__title">Personal information</h2><p class="card__caption">Core details</p></div>
              <button class="icon-button icon-button--small" type="button" data-edit="${child.id}">${icon('pencil')}</button>
            </header>
            <div class="card__body">
              <div class="detail-list">
                <div class="detail-row"><span>Full name</span><b>${child.name}</b></div>
                <div class="detail-row"><span>Date of birth</span><b>${child.dob ? formatDate(child.dob) : 'Not specified'}</b></div>
                <div class="detail-row"><span>Age</span><b>${age || 'Not specified'}</b></div>
                <div class="detail-row"><span>Gender</span><b>${child.gender || 'Not specified'}</b></div>
                <div class="detail-row"><span>Blood group</span><b>${child.blood || 'Not specified'}</b></div>
                <div class="detail-row"><span>ID number</span><b>${child.idNumber || 'Not specified'}</b></div>
                <div class="detail-row"><span>Phone</span><b>${child.phone || 'Not specified'}</b></div>
                <div class="detail-row"><span>Registration date</span><b>${child.registeredDate ? formatDate(child.registeredDate) : 'Not specified'}</b></div>
              </div>
            </div>
          </section>
          <section class="card">
            <header class="card__header">
              <div><h2 class="card__title">Health summary</h2><p class="card__caption">Latest vitals and health status</p></div>
            </header>
            <div class="card__body">
              <div class="detail-list">
                <div class="detail-row"><span>Health status</span><b>${healthDot(hs.level)} ${hs.label}</b></div>
                <div class="detail-row"><span>Height</span><b>${latestGrowth ? latestGrowth.height + ' cm' : child.height ? child.height + ' cm' : '—'}</b></div>
                <div class="detail-row"><span>Weight</span><b>${latestGrowth ? latestGrowth.weight + ' kg' : child.weight ? child.weight + ' kg' : '—'}</b></div>
                <div class="detail-row"><span>BMI</span><b>${latestGrowth && latestGrowth.bmi ? latestGrowth.bmi : '—'}</b></div>
                <div class="detail-row"><span>Medical conditions</span><b>${child.medicalConditions || 'None reported'}</b></div>
                <div class="detail-row"><span>Allergies</span><b>${child.allergies || 'None reported'}</b></div>
                <div class="detail-row"><span>Active medications</span><b>${meds.length > 0 ? meds.map(m => m.medicineName).join(', ') : 'None'}</b></div>
                <div class="detail-row"><span>Upcoming appointments</span><b>${appts.filter(a => a.status !== 'Completed' && new Date(a.date) >= new Date()).length || 'None'}</b></div>
              </div>
            </div>
          </section>
        </div>
        <div class="dashboard-grid">
          <section class="card">
            <header class="card__header">
              <div><h2 class="card__title">Record timeline</h2><p class="card__caption">Recent changes and events</p></div>
            </header>
            <div class="card__body">
              ${timelineHTML}
            </div>
          </section>
          <section class="card">
            <header class="card__header">
              <div><h2 class="card__title">Guardian & Emergency</h2></div>
            </header>
            <div class="card__body">
              <div class="detail-list detail-list--single">
                <div class="detail-row"><span>Father / guardian</span><b>${child.father || 'Not specified'}</b></div>
                <div class="detail-row"><span>Mother</span><b>${child.mother || 'Not specified'}</b></div>
                <div class="detail-row"><span>Phone</span><b>${child.phone || 'Not specified'}</b></div>
                <div class="detail-row"><span>Emergency contact</span><b>${child.emergencyContact || 'Not specified'}</b></div>
                <div class="detail-row"><span>Emergency phone</span><b>${child.emergencyPhone || 'Not specified'}</b></div>
                <div class="detail-row"><span>Hospital</span><b>${child.hospitalName || 'Not specified'}</b></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- GUARDIAN & EMERGENCY TAB -->
    <div data-tab-panel="guardian" style="display: none;">
      <section class="card">
        <header class="card__header">
          <div><h2 class="card__title">Guardian & Emergency Details</h2><p class="card__caption">Primary contact numbers and emergency preferences</p></div>
        </header>
        <div class="card__body">
          <div class="detail-list detail-list--single">
            <div class="detail-row"><span>Father / Primary Guardian</span><b>${child.father || 'Not specified'}</b></div>
            <div class="detail-row"><span>Mother Name</span><b>${child.mother || 'Not specified'}</b></div>
            <div class="detail-row"><span>Contact Phone</span><b>${child.phone ? `<a href="tel:${child.phone}">${child.phone}</a>` : 'Not specified'}</b></div>
            <div class="detail-row"><span>Guardian Email</span><b>${child.email ? `<a href="mailto:${child.email}">${child.email}</a>` : 'Not specified'}</b></div>
            <div class="detail-row"><span>Emergency Contact Person</span><b>${child.emergencyContact || 'Not specified'}</b></div>
            <div class="detail-row"><span>Emergency Phone</span><b>${child.emergencyPhone ? `<a href="tel:${child.emergencyPhone}">${child.emergencyPhone}</a>` : 'Not specified'}</b></div>
            <div class="detail-row"><span>Preferred Hospital / Clinic</span><b>${child.hospitalName || 'Not specified'}</b></div>
            <div class="detail-row"><span>Residential Address</span><b>${child.address || 'Not specified'}</b></div>
          </div>
        </div>
      </section>
    </div>

    <!-- HEALTH RECORDS TAB -->
    <div data-tab-panel="health" style="display: none;">
      <section class="card">
        <header class="card__header">
          <div><h2 class="card__title">Clinical & Medical Health Records</h2><p class="card__caption">Lab test reports, CBC panels, and clinical flags</p></div>
        </header>
        <div class="card__body">
          ${healthRecsHTML}
        </div>
      </section>
    </div>

    <!-- GROWTH & NUTRITION TAB -->
    <div data-tab-panel="growth" style="display: none;">
      <section class="card">
        <header class="card__header">
          <div><h2 class="card__title">Growth Tracking & Meals Log</h2><p class="card__caption">Height, weight, BMI progression and daily meal nutrition</p></div>
        </header>
        <div class="card__body">
          ${growthHTML}
        </div>
      </section>
    </div>

    <!-- DOCUMENTS TAB -->
    <div data-tab-panel="documents" style="display: none;">
      <section class="card">
        <header class="card__header">
          <div><h2 class="card__title">Uploaded Medical Records & Documents</h2><p class="card__caption">Aadhaar scans, birth certificates, and medical reports</p></div>
        </header>
        <div class="card__body">
          ${docsHTML}
        </div>
      </section>
    </div>

    <!-- TIMELINE TAB -->
    <div data-tab-panel="timeline" style="display: none;">
      <section class="card">
        <header class="card__header">
          <div><h2 class="card__title">Full Activity Timeline</h2><p class="card__caption">Complete audit history for ${child.name}</p></div>
        </header>
        <div class="card__body">
          ${timelineHTML}
        </div>
      </section>
    </div>

    <!-- NOTES TAB -->
    <div data-tab-panel="notes" style="display: none;">
      <section class="card">
        <header class="card__header">
          <div><h2 class="card__title">Caregiver & Pediatrician Notes</h2><p class="card__caption">Special observations and clinical history notes</p></div>
        </header>
        <div class="card__body">
          <div style="font-size:14px; line-height:1.6; padding: 16px; background: var(--color-hover); border-radius: 6px; margin-bottom: 20px;">
            ${child.notes ? child.notes : 'No specific caregiver notes added yet.'}
          </div>
        </div>
      </section>
    </div>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   REGISTER CHILD (was Add Student)
   ═══════════════════════════════════════════════════════ */

function steps(active, upload = false) {
  const items = upload ? ['Upload', 'Processing', 'Review & verify', 'Additional details', 'Save record'] : ['Choose method', 'Child details', 'Health & guardian', 'Review & save'];
  return `<aside class="card form-aside"><div class="stepper">${items.map((item, index) => `<div class="stepper__item ${index < active ? 'stepper__item--complete' : ''} ${index === active ? 'stepper__item--active' : ''}"><span class="stepper__dot">${index < active ? icon('check') : index + 1}</span><span class="stepper__label">${item}</span></div>`).join('')}</div></aside>`;
}

export function registerChildPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const method = searchParams.get('method');
  const editId = searchParams.get('edit');
  const child = editId ? getChild(editId) : null;

  if (method !== 'manual' && !editId) {
    return shell('register-child', `${heading('Register a child', 'Choose the quickest, most reliable way to start a new child record.')}<section class="card"><div class="card__body"><div class="method-grid"><article class="method-card card card--interactive"><span class="method-card__icon">${icon('pencil')}</span><div><h2 class="card__title">Enter details manually</h2><p>Start with a clean, guided form. Best when the information is already at hand.</p></div><a class="button" href="${pagePath('register-child')}?method=manual">Start manual entry ${icon('arrowRight')}</a></article><article class="method-card card card--interactive"><span class="method-card__icon">${icon('scan')}</span><div><h2 class="card__title">Smart document upload</h2><p>Extract information from a medical document, then personally verify every field before saving.</p></div><a class="button button--primary" href="${pagePath('ocr-upload')}">Upload a document ${icon('arrowRight')}</a></article></div></div></section><section class="card section-gap"><div class="card__body"><div class="accordion"><div class="accordion__item is-open"><button class="accordion__trigger" type="button">Why keep manual entry and Smart Upload separate? ${icon('chevronDown')}</button><div class="accordion__content">Documents can speed up entry, but extracted values are never saved automatically. You stay in control of the final child record.</div></div></div></div></section>`);
  }

  let firstName = '', lastName = '', email = '', father = '', phone = '', blood = '';
  if (child) {
    const parts = child.name.split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
    email = child.email || '';
    father = child.father || '';
    phone = child.phone || '';
    blood = child.blood || '';
  }

  const title = child ? 'Edit child profile' : 'Register child';
  const desc = child ? 'Modify the child record. Required fields are marked with an asterisk.' : 'Create a reliable child health record. Required fields are marked with an asterisk.';
  const submitText = child ? 'Save changes' : 'Save child record';

  return shell('register-child', `${heading(title, desc, `<a class="button button--ghost" href="${child ? `${pagePath('child-profile')}?id=${child.id}` : pagePath('children')}">Cancel</a><button class="button button--primary" form="child-form" type="submit">${submitText}</button>`)}<div class="form-layout"><form class="card" id="child-form">${child ? `<input type="hidden" name="id" value="${child.id}">` : ''}
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Child information</h2><p>Use the child's legal name as it appears on official documents.</p></div><div class="form-grid--two">${field('First name *', 'firstName', 'e.g. Naveen', 'text', '', firstName)}${field('Last name *', 'lastName', 'e.g. Roy', 'text', '', lastName)}${field('Date of birth *', 'birthDate', '', 'date', '', child ? formatDateForInput(child.dob) : '')}${field('Gender *', 'gender', 'e.g. Male', 'text', '', child ? child.gender : '')}${field('Blood group', 'blood', 'e.g. O+', 'text', '', blood)}${field('ID number (Aadhaar)', 'idNumber', '0000 0000 0000', 'text', '', child ? child.idNumber : '')}</div></section>
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Health baseline</h2><p>Initial health measurements and known conditions.</p></div><div class="form-grid--two">${field('Height (cm)', 'height', 'e.g. 140', 'number', '', child ? child.height : '')}${field('Weight (kg)', 'weight', 'e.g. 35', 'number', '', child ? child.weight : '')}<label class="field form-span-all"><span class="field__label">Known medical conditions</span><textarea class="textarea" name="medicalConditions" placeholder="e.g. Asthma, Diabetes, Epilepsy">${child ? escapeHTML(child.medicalConditions) : ''}</textarea></label><label class="field form-span-all"><span class="field__label">Allergies</span><textarea class="textarea" name="allergies" placeholder="e.g. Peanuts, Penicillin, Dust">${child ? escapeHTML(child.allergies) : ''}</textarea></label>${field('Current medications', 'medications', 'e.g. Inhaler, Vitamin D', 'text', '', child ? child.medications : '')}</div></section>
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Guardian & emergency contact</h2><p>This contact will receive health updates and emergency notifications.</p></div><div class="form-grid--two">${field('Parent / guardian name *', 'father', 'e.g. A.N. Roy', 'text', '', father)}${field('Mother name', 'mother', 'e.g. Priya Roy', 'text', '', child ? child.mother : '')}${field('Phone number *', 'phone', '+91 00000 00000', 'tel', '', phone)}${field('Email address', 'email', 'guardian@example.com', 'email', '', email)}${field('Emergency contact name', 'emergencyContact', 'e.g. Dr. Sharma', 'text', '', child ? child.emergencyContact : '')}${field('Emergency phone', 'emergencyPhone', '+91 00000 00000', 'tel', '', child ? child.emergencyPhone : '')}${field('Nearest hospital', 'hospitalName', 'e.g. Apollo Hospital', 'text', '', child ? child.hospitalName : '')}</div></section>
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Address & notes</h2></div><div class="form-grid--two"><label class="field form-span-all"><span class="field__label">Home address</span><textarea class="textarea" name="address" placeholder="Street address, city, state, postcode">${child ? escapeHTML(child.address) : ''}</textarea></label><label class="field form-span-all"><span class="field__label">Internal notes</span><textarea class="textarea" name="notes" placeholder="Optional notes visible to staff only.">${child ? escapeHTML(child.notes) : ''}</textarea></label></div></section></form>${steps(1)}</div>`);
}

/* ═══════════════════════════════════════════════════════
   OCR PAGES
   ═══════════════════════════════════════════════════════ */

export function ocrUploadPage() {
  return shell('ocr-upload', `${heading('Medical document upload', 'Upload a clear medical document (Aadhaar, birth certificate, lab report). Nothing will be saved until you review every extracted field.', `<a class="button button--ghost" href="${pagePath('register-child')}">Cancel</a>`)}<div class="form-layout"><section class="card"><div class="card__body"><div class="upload-zone" data-upload-zone><span class="upload-zone__icon">${icon('upload')}</span><h2 class="card__title">Drop a document here</h2><p>Or choose a file from your device. We'll extract only the details needed for the child record.</p><button class="button button--primary" type="button" data-start-ocr>${icon('file')}Choose document</button><input class="sr-only" type="file" accept=".jpg,.jpeg,.png" data-upload-input><span class="upload-zone__formats">JPG or PNG · Up to 15 MB</span></div></div><div class="form-section"><div class="accordion"><div class="accordion__item is-open"><button class="accordion__trigger" type="button">How Smart Upload protects your data ${icon('chevronDown')}</button><div class="accordion__content">A document is processed only to populate a draft. You review the values, add any missing details, and choose when to create the record.</div></div></div></div></section>${steps(0, true)}</div>`);
}

export function ocrProcessingPage() {
  return shell('ocr-processing', `${heading('Processing document', 'We\u2019re creating a draft from your upload. This never creates or updates a child record automatically.')}<section class="card"><div class="ocr-processing"><div class="ocr-processing__orbit" style="box-shadow: 0 0 25px rgba(59, 130, 246, 0.35);">${icon('scan')}</div><h2>Extracting information</h2><p>Reading document structure, identifying details, and preparing them for your review.</p><div class="ocr-processing__progress"><div class="ocr-processing__progress-header"><span class="ocr-progress-status" style="font-weight: 600; color: var(--color-primary);">Preprocessing image & normalizing contrast...</span><span class="ocr-progress-pct" style="font-weight: 700;">0%</span></div><div class="progress" style="height: 10px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);"><div class="progress__bar ocr-progress-bar" style="width: 0%; transition: width 0.25s ease-out;"></div></div></div></div></section>`);
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
    previewHTML = `<div class="document-sheet"><div class="document-sheet__brand">MEDICAL RECORD</div><div class="document-sheet__title">CHILD HEALTH RECORD FORM</div><div class="document-sheet__line document-sheet__line--wide"></div><div class="document-sheet__line document-sheet__line--half"></div><div class="document-sheet__table"><div class="document-sheet__cell"><b>CHILD NAME</b><span>${firstName} ${lastName}</span></div><div class="document-sheet__cell"><b>DATE OF BIRTH</b><span>${dob}</span></div><div class="document-sheet__cell"><b>FATHER'S NAME</b><span>${father}</span></div><div class="document-sheet__cell"><b>BLOOD GROUP</b><span>${blood}</span></div><div class="document-sheet__cell"><b>PHONE</b><span>${phone}</span></div><div class="document-sheet__cell"><b>ID NUMBER</b><span>${idNumber}</span></div></div></div>`;
  }

  return shell('ocr-review', `${heading('Review extracted information', 'Check the values below against the original document before continuing.', `<button class="button" type="button" data-ocr-back>Back</button><button class="button button--primary" type="button" data-ocr-continue>Continue to details ${icon('arrowRight')}</button>`)}<div class="form-layout"><div class="review-layout"><section class="card document-preview"><div class="document-toolbar"><span class="badge badge--blue">Uploaded document</span><div class="document-toolbar__controls"><button class="icon-button icon-button--small tooltip" data-tooltip="Rotate" type="button" data-ocr-rotate>${icon('rotate')}</button><button class="icon-button icon-button--small tooltip" data-tooltip="Fullscreen" type="button" data-ocr-fullscreen>${icon('maximize')}</button></div></div>${previewHTML}</section><form class="card"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Extracted fields</h2><p>Fields marked for review are lower-confidence values. Nothing proceeds without your confirmation.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">First name</span><input class="input" value="${firstName}" name="firstName"></label><label class="field"><span class="field__label">Last name</span><input class="input" value="${lastName}" name="lastName"></label><label class="field"><span class="field__label">Date of birth</span><input class="input" value="${dob}" name="date"></label><label class="field"><span class="field__label">Gender</span><input class="input" value="${gender}" name="gender"></label><label class="field"><span class="field__label">Blood group</span><input class="input" value="${blood}" name="blood"></label><label class="field"><span class="field__label">ID number</span><input class="input" value="${idNumber}" name="idNumber"></label><label class="field form-span-all"><span class="field__label">Father / guardian</span><input class="input" value="${father}" name="father"></label><label class="field form-span-all"><span class="field__label">Mother name</span><input class="input" value="${mother}" name="mother"></label></div></section><section class="form-section"><label class="checkbox"><input type="checkbox" data-ocr-confirm required><span>I've checked the extracted details against the original document.</span></label></section></form></div>${steps(2, true)}</div>`);
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

  return shell('ocr-details', `${heading('Additional details', 'Complete the remaining information before you save this verified child record.', `<a class="button" href="${pagePath('ocr-review')}">Back</a><button class="button button--primary" type="submit" form="ocr-additional-form">Save child record</button>`)}<div class="form-layout"><form class="card" id="ocr-additional-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Registration & contact</h2><p>These details were not present in the uploaded document.</p></div><div class="form-grid--two">${field('Mother name', 'mother', 'e.g. Priya Roy', 'text', '', mother)}${field('Mobile number *', 'phone', 'e.g. +91 98221 40393', 'tel', '', phone)}${field('Email address', 'email', 'guardian@example.com', 'email')}${field('Height (cm)', 'height', 'e.g. 140', 'number')}${field('Weight (kg)', 'weight', 'e.g. 35', 'number')}<label class="field form-span-all"><span class="field__label">Known medical conditions</span><textarea class="textarea" name="medicalConditions" placeholder="e.g. Asthma, Diabetes"></textarea></label><label class="field form-span-all"><span class="field__label">Allergies</span><textarea class="textarea" name="allergies" placeholder="e.g. Peanuts, Penicillin"></textarea></label><label class="field form-span-all"><span class="field__label">Address</span><textarea class="textarea" name="address" placeholder="Street address, city, state, postcode"></textarea></label></div></section><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Final verification</h2><p>You're about to create the child record. It can be updated later by authorized staff.</p></div><label class="checkbox"><input type="checkbox" required><span>I confirm the information is accurate and complete.</span></label></section><input type="hidden" name="firstName" value="${firstName}"><input type="hidden" name="lastName" value="${lastName}"><input type="hidden" name="father" value="${father}"><input type="hidden" name="gender" value="${gender}"><input type="hidden" name="blood" value="${blood}"><input type="hidden" name="idNumber" value="${idNumber}"><input type="hidden" name="dob" value="${ocrData.dob || ''}"></form>${steps(3, true)}</div>`);
}

/* ═══════════════════════════════════════════════════════
   GROWTH TRACKING
   ═══════════════════════════════════════════════════════ */

export function growthPage() {
  const children = getChildren();
  const allGrowth = getGrowthRecords();
  const recentGrowth = allGrowth.slice(0, 10);

  let tableHTML = '';
  if (recentGrowth.length === 0) {
    tableHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon('ruler')}</span><h3 style="font-size:13px">No growth records yet</h3><p>Add a growth measurement using the form above.</p></div></td></tr>`;
  } else {
    tableHTML = recentGrowth.map(r => `<tr><td><b>${r.childName || '—'}</b></td><td>${r.date || '—'}</td><td>${r.height} cm</td><td>${r.weight} kg</td><td>${r.bmi || '—'}</td><td>${r.bmi ? (r.bmi < 16 ? '<span class="badge badge--danger">Underweight</span>' : r.bmi > 25 ? '<span class="badge badge--warning">Overweight</span>' : '<span class="badge badge--success">Normal</span>') : '—'}</td></tr>`).join('');
  }

  const childOptions = children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  return shell('growth', `${heading('Growth tracking', 'Track height, weight, and BMI for every child. Identify growth problems early.', `<button class="button button--primary" type="button" data-add-measurement>${icon('plus')}Add measurement</button>`)}
  <div class="form-layout">
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div id="growth-forms-container" style="display: flex; flex-direction: column; gap: 24px;">
        <form class="card growth-form-instance" id="growth-form">
          <section class="form-section">
            <div class="form-section__heading"><h2 class="card__title">New measurement</h2><p>Record height and weight for a child. BMI will be auto-calculated.</p></div>
            <div class="form-grid--two">
              <label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required><option value="">Select child</option>${childOptions}</select></label>
              ${field('Date *', 'date', '', 'date', '', new Date().toISOString().slice(0, 10))}
              ${field('Height (cm) *', 'height', 'e.g. 140', 'number')}
              ${field('Weight (kg) *', 'weight', 'e.g. 35', 'number')}
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:20px;">
              <button class="button button--primary" type="submit">${icon('check')} Save measurement</button>
            </div>
          </section>
        </form>
      </div>
      <section class="card"><header class="card__header"><div><h2 class="card__title">Recent measurements</h2><p class="card__caption">All growth records across children</p></div></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Child</th><th>Date</th><th>Height</th><th>Weight</th><th>BMI</th><th>Status</th></tr></thead><tbody>${tableHTML}</tbody></table></div></section>
    </div>
    <aside class="card form-aside">
      <header class="card__header">
        <div>
          <h2 class="card__title">BMI Reference</h2>
          <p class="card__caption">WHO growth standards</p>
        </div>
      </header>
      <div class="card__body">
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border);">
            <span style="color: var(--color-text-muted); font-weight: 500;">&lt; 16.0</span>
            <span class="badge badge--danger" style="margin-left: auto;">Severely Underweight</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border);">
            <span style="color: var(--color-text-muted); font-weight: 500;">16.0 – 18.5</span>
            <span class="badge badge--warning" style="margin-left: auto;">Underweight</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border);">
            <span style="color: var(--color-text-muted); font-weight: 500;">18.5 – 25.0</span>
            <span class="badge badge--success" style="margin-left: auto;">Normal</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border);">
            <span style="color: var(--color-text-muted); font-weight: 500;">&gt; 25.0</span>
            <span class="badge badge--warning" style="margin-left: auto;">Overweight</span>
          </div>
        </div>
        <div style="margin-top: 18px; font-size: 12px; color: var(--color-text-muted); line-height: 1.5;">
          BMI is calculated automatically from height and weight inputs. Regular assessments help identify signs of undernourishment or growth problems early.
        </div>
      </div>
    </aside>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   NUTRITION TRACKER
   ═══════════════════════════════════════════════════════ */

export function nutritionPage() {
  const children = getChildren();
  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = getAllMeals().filter(m => m.date === today);
  const allMeals = getAllMeals().slice(0, 15);

  let mealsHTML = '';
  if (allMeals.length === 0) {
    mealsHTML = `<div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon('apple')}</span><h3 style="font-size:13px">No meals logged yet</h3><p>Use the form above to log a child's meal.</p></div>`;
  } else {
    mealsHTML = `<div class="document-grid">${allMeals.map(m => `<article class="card document-card card--interactive"><div class="document-card__body" style="padding:14px"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px"><h3 style="font-size:14px; font-weight:600; margin:0">${m.childName || '—'}</h3><span class="badge badge--neutral">${m.mealType}</span></div><p style="font-size:13px; color:var(--color-text-muted); margin:0 0 6px">${m.description}</p><div style="font-size:11px; color:var(--color-text-muted); display:flex; justify-content:space-between"><span>${m.date}</span>${m.calories ? `<span>${m.calories} kcal</span>` : ''}</div></div></article>`).join('')}</div>`;
  }

  const childOptions = children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  return shell('nutrition', `${heading('Nutrition tracker', 'Document daily meals and help improve diets based on health reports.', `<button class="button button--primary" type="submit" form="meal-form">${icon('plus')}Log meal</button>`)}
  <div class="form-layout">
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <form class="card" id="meal-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Log a meal</h2><p>Record what a child ate today.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required><option value="">Select child</option>${childOptions}</select></label><label class="field"><span class="field__label">Meal type *</span><select class="select" name="mealType" required><option>Breakfast</option><option>Lunch</option><option>Snack</option><option>Dinner</option></select></label>${field('Date *', 'date', '', 'date', '', today)}${field('Calories (optional)', 'calories', 'e.g. 350', 'number')}<label class="field form-span-all"><span class="field__label">Description *</span><textarea class="textarea" name="description" placeholder="e.g. Rice, dal, vegetables, curd" required></textarea></label></div></section></form>
      <section class="card"><header class="card__header"><div><h2 class="card__title">Meal log</h2><p class="card__caption">Today: ${todayMeals.length} meals logged</p></div></header><div class="card__body">${mealsHTML}</div></section>
    </div>
    <aside class="card form-aside">
      <header class="card__header">
        <div>
          <h2 class="card__title">Dietary Guidelines</h2>
          <p class="card__caption">NGO health standard</p>
        </div>
      </header>
      <div class="card__body">
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px; line-height: 1.5;">
          <div style="border-left: 3px solid var(--color-danger); padding-left: 8px;">
            <b style="color: var(--color-danger); display: block;">Anemia Diet</b>
            Include iron-rich foods: spinach, beetroots, pomegranate, lentils, eggs, and fortified grains.
          </div>
          <div style="border-left: 3px solid var(--color-warning); padding-left: 8px;">
            <b style="color: var(--color-warning); display: block;">Undernourished Diet</b>
            Provide protein and calorie-dense meals: dal, milk, curd, nuts, paneer, and bananas.
          </div>
          <div style="border-left: 3px solid var(--color-success); padding-left: 8px;">
            <b style="color: var(--color-success); display: block;">General Wellness</b>
            Ensure a balanced intake of green vegetables, whole grains, and clean drinking water daily.
          </div>
        </div>
      </div>
    </aside>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   MEDICINE MANAGEMENT
   ═══════════════════════════════════════════════════════ */

export function medicinesPage() {
  const children = getChildren();
  const allMeds = getMedicines();
  const activeMeds = allMeds.filter(m => m.status === 'Active');
  const completedMeds = allMeds.filter(m => m.status === 'Completed');

  let medsHTML = '';
  if (allMeds.length === 0) {
    medsHTML = `<div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon('pill')}</span><h3 style="font-size:13px">No prescriptions tracked</h3><p>Add a prescription using the form above.</p></div>`;
  } else {
    medsHTML = `<div class="document-grid">${allMeds.slice(0, 12).map(m => {
      const startDate = new Date(m.startDate);
      const endDate = new Date(m.endDate);
      const now = new Date();
      const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
      const elapsed = Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
      const pct = Math.min(100, Math.round((elapsed / totalDays) * 100));
      return `<article class="card document-card card--interactive"><div class="document-card__body" style="padding:14px"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px"><h3 style="font-size:14px; font-weight:600; margin:0">${m.medicineName}</h3>${statusBadge(m.status)}</div><p style="font-size:13px; color:var(--color-text-muted); margin:0 0 4px">${m.childName || '—'} · ${m.dosage}</p><p style="font-size:12px; color:var(--color-text-muted); margin:0 0 8px">${m.frequency} · ${m.startDate} → ${m.endDate}</p><div class="progress" style="height:6px"><div class="progress__bar" style="width:${pct}%; background:${m.status === 'Completed' ? 'var(--color-success)' : 'var(--color-primary)'}"></div></div><span style="font-size:11px; color:var(--color-text-muted)">${pct}% complete</span></div></article>`;
    }).join('')}</div>`;
  }

  const childOptions = children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  return shell('medicines', `${heading('Medicine management', 'Track all medicines given to children including prescriptions, dosage, and treatment completion.', `<button class="button button--primary" type="submit" form="medicine-form">${icon('plus')}Add prescription</button>`)}
  <div class="stat-grid" style="margin-bottom:24px">${statCard('Active prescriptions', activeMeds.length.toLocaleString(), activeMeds.length > 0 ? 'Ongoing' : 'None', 'pill', 'blue')}${statCard('Completed', completedMeds.length.toLocaleString(), completedMeds.length > 0 ? 'Finished' : 'None', 'check', 'green')}</div>
  <div class="form-layout">
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <form class="card" id="medicine-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">New prescription</h2></div><div class="form-grid--two"><label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required><option value="">Select child</option>${childOptions}</select></label>${field('Medicine name *', 'medicineName', 'e.g. Amoxicillin', 'text')}${field('Dosage *', 'dosage', 'e.g. 250mg twice daily', 'text')}${field('Frequency', 'frequency', 'e.g. Every 8 hours', 'text')}${field('Start date *', 'startDate', '', 'date', '', new Date().toISOString().slice(0, 10))}${field('End date *', 'endDate', '', 'date')}</div></section></form>
      <section class="card"><header class="card__header"><div><h2 class="card__title">All prescriptions</h2></div></header><div class="card__body">${medsHTML}</div></section>
    </div>
    <aside class="card form-aside">
      <header class="card__header">
        <div>
          <h2 class="card__title">Safety Guidelines</h2>
          <p class="card__caption">NGO health standard</p>
        </div>
      </header>
      <div class="card__body">
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px; line-height: 1.5;">
          <div style="border-left: 3px solid var(--color-primary); padding-left: 8px;">
            <b style="color: var(--color-primary); display: block;">Double Check</b>
            Verify child name, medicine name, and exact dosage before administering.
          </div>
          <div style="border-left: 3px solid var(--color-warning); padding-left: 8px;">
            <b style="color: var(--color-warning); display: block;">Storage Safety</b>
            Keep all medicines in a cool, dry, locked cabinet, out of reach of children.
          </div>
          <div style="border-left: 3px solid var(--color-success); padding-left: 8px;">
            <b style="color: var(--color-success); display: block;">Adherence</b>
            Always complete the full course of treatment even if the child recovers early.
          </div>
        </div>
      </div>
    </aside>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   APPOINTMENTS
   ═══════════════════════════════════════════════════════ */

export function appointmentsPage() {
  const children = getChildren();
  const allAppts = getAppointments();
  const now = new Date();
  const upcoming = allAppts.filter(a => a.status !== 'Completed' && new Date(a.date) >= now);
  const overdue = allAppts.filter(a => a.status !== 'Completed' && new Date(a.date) < now);
  const completed = allAppts.filter(a => a.status === 'Completed');

  let apptsHTML = '';
  if (allAppts.length === 0) {
    apptsHTML = `<div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon('calendar')}</span><h3 style="font-size:13px">No appointments scheduled</h3><p>Schedule an appointment using the form above.</p></div>`;
  } else {
    apptsHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Child</th><th>Type</th><th>Date</th><th>Doctor / Hospital</th><th>Status</th></tr></thead><tbody>${allAppts.slice(0, 15).map(a => {
      const isOverdue = a.status !== 'Completed' && new Date(a.date) < now;
      return `<tr ${isOverdue ? 'style="background:rgba(220,38,38,0.04)"' : ''}><td><b>${a.childName || '—'}</b></td><td><span class="badge badge--neutral">${a.type}</span></td><td>${a.date}${a.time ? ' ' + a.time : ''}</td><td>${a.doctor || '—'}</td><td>${isOverdue ? '<span class="badge badge--danger"><i class="badge__dot"></i>Overdue</span>' : statusBadge(a.status || 'Upcoming')}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  const childOptions = children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  return shell('appointments', `${heading('Appointments & reminders', 'Schedule and track medical appointments, immunizations, deworming, and dental checkups.', `<button class="button button--primary" type="submit" form="appointment-form">${icon('plus')}Add appointment</button>`)}
  <div class="stat-grid" style="margin-bottom:24px">${statCard('Upcoming', upcoming.length.toLocaleString(), upcoming.length > 0 ? 'Scheduled' : 'None', 'calendar', 'blue')}${statCard('Overdue', overdue.length.toLocaleString(), overdue.length > 0 ? 'Need attention' : 'All clear', 'alertCircle', overdue.length > 0 ? 'amber' : 'green')}${statCard('Completed', completed.length.toLocaleString(), completed.length > 0 ? 'Done' : 'None', 'check', 'green')}</div>
  <div class="form-layout">
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <form class="card" id="appointment-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Schedule appointment</h2></div><div class="form-grid--two"><label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required><option value="">Select child</option>${childOptions}</select></label><label class="field"><span class="field__label">Type *</span><select class="select" name="type" required><option>Doctor visit</option><option>Immunization</option><option>Deworming</option><option>Dental checkup</option><option>Lab test</option><option>Follow-up</option></select></label>${field('Date *', 'date', '', 'date')}${field('Time', 'time', '', 'time')}${field('Doctor / Hospital', 'doctor', 'e.g. Dr. Kumar, Apollo', 'text')}${field('Notes', 'notes', 'e.g. Bring previous reports', 'text')}</div></section></form>
      <section class="card"><header class="card__header"><div><h2 class="card__title">All appointments</h2></div></header>${apptsHTML}</section>
    </div>
    <aside class="card form-aside">
      <header class="card__header">
        <div>
          <h2 class="card__title">Appointment Guide</h2>
          <p class="card__caption">Checkup classifications</p>
        </div>
      </header>
      <div class="card__body">
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px; line-height: 1.5;">
          <div style="border-left: 3px solid var(--color-primary); padding-left: 8px;">
            <b style="color: var(--color-primary); display: block;">Doctor visit</b>
            Standard pediatric consults or follow-ups for flagged health alerts.
          </div>
          <div style="border-left: 3px solid var(--color-warning); padding-left: 8px;">
            <b style="color: var(--color-warning); display: block;">Deworming</b>
            Routine preventative doses, scheduled twice annually.
          </div>
          <div style="border-left: 3px solid var(--color-success); padding-left: 8px;">
            <b style="color: var(--color-success); display: block;">Dental & Vaccine</b>
            Regular bi-annual oral checkups and mandatory immunizations.
          </div>
        </div>
      </div>
    </aside>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   EMERGENCY CONTACTS
   ═══════════════════════════════════════════════════════ */

export function emergencyPage() {
  const contacts = getEmergencyContacts();

  let contactsHTML = '';
  if (contacts.length === 0) {
    contactsHTML = `<div class="empty-state" style="padding:48px 24px"><span class="empty-state__icon">${icon('phone')}</span><h3>No emergency contacts yet</h3><p>Add hospitals, doctors, and caregiver contacts for quick access during emergencies.</p></div>`;
  } else {
    contactsHTML = `<div class="document-grid">${contacts.map(c => `<article class="card document-card card--interactive" style="position:relative"><div class="document-card__body" style="padding:16px"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px"><h3 style="font-size:14px; font-weight:600; margin:0">${c.name}</h3><span class="badge badge--neutral">${c.type}</span></div><div class="detail-list detail-list--single" style="font-size:13px"><div class="detail-row"><span>Phone</span><b><a href="tel:${c.phone}" style="color:var(--color-primary)">${c.phone}</a></b></div>${c.specialty ? `<div class="detail-row"><span>Specialty</span><b>${c.specialty}</b></div>` : ''}${c.address ? `<div class="detail-row"><span>Address</span><b>${c.address}</b></div>` : ''}</div><button class="icon-button icon-button--small" style="position:absolute; top:8px; right:8px" type="button" data-delete-contact="${c.id}" aria-label="Delete">${icon('trash')}</button></div></article>`).join('')}</div>`;
  }

  return shell('emergency', `${heading('Emergency contacts', 'Quick-access directory for hospitals, doctors, guardians, and caregivers.', `<button class="button button--primary" type="submit" form="emergency-form">${icon('plus')}Add contact</button>`)}
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <form class="card" id="emergency-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Add emergency contact</h2></div><div class="form-grid--two">${field('Name *', 'name', 'e.g. Apollo Hospital', 'text')}<label class="field"><span class="field__label">Type *</span><select class="select" name="type" required><option>Hospital</option><option>Doctor</option><option>Guardian</option><option>Caregiver</option><option>Staff</option></select></label>${field('Phone *', 'phone', '+91 00000 00000', 'tel')}${field('Specialty', 'specialty', 'e.g. Pediatrics', 'text')}<label class="field form-span-all"><span class="field__label">Address</span><textarea class="textarea" name="address" placeholder="Full address"></textarea></label></div></section></form>
    <section class="card"><header class="card__header"><div><h2 class="card__title">All contacts</h2></div></header><div class="card__body">${contactsHTML}</div></section>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   EXPENSES
   ═══════════════════════════════════════════════════════ */

export function expensesPage() {
  const allExpenses = getExpenses();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthExpenses = allExpenses.filter(e => e.date && e.date.startsWith(currentMonth));
  const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // Category breakdown
  const catTotals = {};
  thisMonthExpenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + (parseFloat(e.amount) || 0);
  });

  let expenseRows = '';
  if (allExpenses.length === 0) {
    expenseRows = `<tr><td colspan="5"><div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon('wallet')}</span><h3 style="font-size:13px">No expenses logged</h3><p>Record expenses using the form above.</p></div></td></tr>`;
  } else {
    expenseRows = allExpenses.slice(0, 15).map(e => `<tr><td>${e.date}</td><td><span class="badge badge--neutral">${e.category}</span></td><td>${e.description}</td><td><b>₹${parseFloat(e.amount).toLocaleString()}</b></td><td>${e.childName || 'General'}</td></tr>`).join('');
  }

  const children = getChildren();
  const childOptions = children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  return shell('expenses', `${heading('Expense management', 'Manage expenses for food, medical, education, and daily needs with monthly reports.', `<button class="button button--primary" type="submit" form="expense-form">${icon('plus')}Log expense</button>`)}
  <div class="stat-grid" style="margin-bottom:24px">${statCard('This month', '₹' + totalThisMonth.toLocaleString(), Object.keys(catTotals).length + ' categories', 'wallet', 'blue')}${statCard('Food', '₹' + (catTotals['Food'] || 0).toLocaleString(), catTotals['Food'] ? 'Spent' : 'None', 'apple', 'green')}${statCard('Medical', '₹' + (catTotals['Medical'] || 0).toLocaleString(), catTotals['Medical'] ? 'Spent' : 'None', 'heartPulse', 'amber')}${statCard('Education', '₹' + (catTotals['Education'] || 0).toLocaleString(), catTotals['Education'] ? 'Spent' : 'None', 'clipboard', 'violet')}</div>
  <div class="form-layout">
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <form class="card" id="expense-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Log expense</h2></div><div class="form-grid--two">${field('Date *', 'date', '', 'date', '', new Date().toISOString().slice(0, 10))}<label class="field"><span class="field__label">Category *</span><select class="select" name="category" required><option>Food</option><option>Medical</option><option>Education</option><option>Daily needs</option><option>Other</option></select></label>${field('Amount (₹) *', 'amount', 'e.g. 500', 'number')}${field('Description *', 'description', 'e.g. Monthly groceries', 'text')}<label class="field"><span class="field__label">Child (optional)</span><select class="select" name="childId"><option value="">General expense</option>${childOptions}</select></label></div></section></form>
      <section class="card"><header class="card__header"><div><h2 class="card__title">Expense log</h2></div></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Child</th></tr></thead><tbody>${expenseRows}</tbody></table></div></section>
    </div>
    <aside class="card form-aside">
      <header class="card__header">
        <div>
          <h2 class="card__title">Expense Guidelines</h2>
          <p class="card__caption">Budget classifications</p>
        </div>
      </header>
      <div class="card__body">
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px; line-height: 1.5;">
          <div style="border-left: 3px solid var(--color-primary); padding-left: 8px;">
            <b style="color: var(--color-primary); display: block;">Food & Kitchen</b>
            Groceries, milk, vegetables, and kitchen supplies for communal meals.
          </div>
          <div style="border-left: 3px solid var(--color-warning); padding-left: 8px;">
            <b style="color: var(--color-warning); display: block;">Medical & Care</b>
            Clinical checkups, prescription medicines, diagnostic reports, and medical camps.
          </div>
          <div style="border-left: 3px solid var(--color-success); padding-left: 8px;">
            <b style="color: var(--color-success); display: block;">Education & School</b>
            School fees, books, bags, school uniforms, and stationeries.
          </div>
        </div>
      </div>
    </aside>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   DOCUMENTS
   ═══════════════════════════════════════════════════════ */

export function documentsPage() {
  const docs = getUploadedDocs();
  let contentHTML = '';
  
  if (docs.length === 0) {
    contentHTML = `<div class="empty-state" style="padding:48px 24px">
      <span class="empty-state__icon">${icon('file')}</span>
      <h3>No documents uploaded yet</h3>
      <p>Use Smart Upload to extract details from medical documents.</p>
    </div>`;
  } else {
    contentHTML = `<div class="document-grid" id="document-grid">
      ${docs.map((doc, idx) => `
        <article class="card document-card card--interactive" data-document-idx="${idx}" data-document="${(doc.name || '').toLowerCase()} ${(doc.child || doc.student || '').toLowerCase()}">
          <div class="document-card__preview" style="position:relative; width:100%; height:120px; overflow:hidden; background:var(--color-bg-alt); display:flex; align-items:center; justify-content:center; border-radius:6px;">
            ${doc.image ? `<img src="${doc.image}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" />` : icon('file')}
          </div>
          <div class="document-card__body" style="padding-top:12px;">
            <div class="document-card__title-line" style="display:flex; justify-content:space-between; align-items:center;">
              <h2 class="document-card__title" style="font-size:14px; font-weight:600; margin:0;">${doc.name}</h2>
              ${statusBadge(doc.status)}
            </div>
            <div class="document-card__meta" style="margin-top:6px; font-size:12px; color:var(--color-text-muted); display:flex; justify-content:space-between;">
              <span>${doc.child || doc.student || '—'}</span>
              <span>${doc.meta}</span>
            </div>
          </div>
        </article>
      `).join('')}
    </div>`;
  }

  return shell('documents', `${heading('Health records & documents', 'Upload, organise, and review medical reports, Aadhaar, school documents, and prescriptions.', `<a class="button" href="${pagePath('ocr-upload')}">${icon('scan')}Smart upload</a>`)}<section class="card"><div class="table-toolbar"><label class="input-group table-toolbar__search">${icon('search')}<input class="input" type="search" placeholder="Search documents or children" data-document-search></label><div class="table-toolbar__actions"><button class="button button--sm" type="button" data-filter-docs>${icon('filter')}Status: All</button></div></div><div class="card__body">${contentHTML}</div></section>`);
}

/* ═══════════════════════════════════════════════════════
   REPORTS & ANALYTICS
   ═══════════════════════════════════════════════════════ */

export function reportsPage() {
  const children = getChildren();
  const total = children.length;
  const activeCount = children.filter(c => c.status === 'Active' || c.status === 'Verified').length;
  const pendingCount = children.filter(c => c.status === 'Pending').length;
  const verifiedCount = children.filter(c => c.status === 'Verified').length;
  const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

  // Health flags distribution
  const flaggedCount = children.filter(c => healthStatus(c).level !== 'good').length;
  const healthyPct = total > 0 ? Math.round(((total - flaggedCount) / total) * 100) : 0;
  const flaggedPct = total > 0 ? Math.round((flaggedCount / total) * 100) : 0;

  // Gender distribution
  const females = children.filter(c => c.gender?.toLowerCase() === 'female').length;
  const males = children.filter(c => c.gender?.toLowerCase() === 'male').length;
  const femalePct = total > 0 ? Math.round((females / total) * 100) : 0;
  const malePct = total > 0 ? Math.round((males / total) * 100) : 0;
  const otherPct = total > 0 ? Math.max(0, 100 - (femalePct + malePct)) : 0;

  // Blood group distribution
  const bloodCounts = {};
  children.forEach(c => {
    const b = (c.blood || '').trim();
    if (b) bloodCounts[b] = (bloodCounts[b] || 0) + 1;
  });
  const sortedBlood = Object.entries(bloodCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const finalBlood = sortedBlood.map(([group, count]) => [group, total > 0 ? Math.round((count / total) * 100) : 0]);
  while (finalBlood.length < 4) {
    const defaults = [['O+', 0], ['B+', 0], ['A+', 0], ['AB+', 0]];
    finalBlood.push(defaults[finalBlood.length]);
  }

  // Expense summary
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = getExpenses(currentMonth);
  const totalExpense = monthExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  return shell('reports', `${heading('Health reports & analytics', 'Monthly summary of children\u2019s health status, nutrition, and expenditures.', `<button class="button" type="button" data-report-email>${icon('mail')}Email report</button><button class="button" type="button" data-report-print>${icon('printer')}Print</button><button class="button button--primary" type="button" data-report-export>${icon('download')}Export</button>`)}
  <section class="card"><div class="filter-row"><label class="field"><span class="field__label">Report period</span><select class="select"><option>Last 6 months</option><option>Last 12 months</option><option>This year</option></select></label><label class="field"><span class="field__label">Status</span><select class="select"><option>All statuses</option><option>Active</option><option>Pending</option></select></label><button class="button button--sm" type="button" data-apply-report>Apply filters</button></div></section>
  <div class="report-grid section-gap"><article class="card report-card"><span class="eyebrow">Children</span><div class="report-card__value">${total}</div><p class="report-card__caption">total children registered</p></article><article class="card report-card"><span class="eyebrow">Healthy</span><div class="report-card__value">${total - flaggedCount}</div><p class="report-card__caption">${healthyPct}% with no health flags</p></article><article class="card report-card"><span class="eyebrow">This month's expenses</span><div class="report-card__value">₹${totalExpense.toLocaleString()}</div><p class="report-card__caption">${monthExpenses.length} transactions</p></article></div>
  
  <section class="card section-gap" style="margin-top: 24px;">
    <header class="card__header">
      <div>
        <h2 class="card__title">NGO & Donor Monthly Executive Summary</h2>
        <p class="card__caption">Audited health status, nutrition coverage, and expense allocations for this month</p>
      </div>
      <span class="badge badge--success">${icon('check')} Audited & Verified</span>
    </header>
    <div class="card__body" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 20px 0;">
      <div style="border-right: 1px solid var(--color-border); padding-right: 16px;">
        <h3 style="font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: var(--color-primary);">
          ${icon('heartPulse')} Health Status Overview
        </h3>
        <p style="font-size: 13px; line-height: 1.5; color: var(--color-text-muted);">
          <b>${total - flaggedCount} out of ${total} children</b> are in optimal health with no health flags. 
          ${flaggedCount > 0 ? `<b>${flaggedCount} child(ren)</b> are currently under medical observation or therapy for flagged conditions (e.g. low hemoglobin, nutritional support).` : 'All children are currently healthy.'}
        </p>
      </div>
      <div style="border-right: 1px solid var(--color-border); padding: 0 16px;">
        <h3 style="font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: var(--color-success);">
          ${icon('apple')} Nutrition Program Performance
        </h3>
        <p style="font-size: 13px; line-height: 1.5; color: var(--color-text-muted);">
          Meals are fully balanced with local nutrients. This month, a total of <b>${getAllMeals().length} meals</b> were logged. 
          Undernourished children (e.g., Aisha Khan) have been placed on tailored nutrition plans containing high-protein oats, eggs, and milk.
        </p>
      </div>
      <div style="padding-left: 16px;">
        <h3 style="font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: var(--color-warning);">
          ${icon('wallet')} Expenditure Allocation
        </h3>
        <p style="font-size: 13px; line-height: 1.5; color: var(--color-text-muted);">
          A total of <b>₹${totalExpense.toLocaleString()}</b> was spent on programs this month. 
          This is distributed across child food support, pediatrician consultant fees, medical testing, and school daily necessities.
        </p>
      </div>
    </div>
  </section>

  <div class="dashboard-grid dashboard-grid--lower"><section class="card chart-card"><header class="card__header"><div><h2 class="card__title">Registration trend</h2><p class="card__caption">New child records created each month</p></div></header><div class="chart-card__body">${registrationChart()}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Gender distribution</h2><p class="card__caption">Across all child records</p></div></header><div class="card__body"><div class="distribution"><div class="distribution__row"><span class="distribution__label">Female</span><div class="progress"><div class="progress__bar" style="width: ${femalePct}%; background: var(--color-violet);"></div></div><span class="distribution__value">${femalePct}%</span></div><div class="distribution__row"><span class="distribution__label">Male</span><div class="progress"><div class="progress__bar" style="width: ${malePct}%; background: var(--color-primary);"></div></div><span class="distribution__value">${malePct}%</span></div><div class="distribution__row"><span class="distribution__label">Other</span><div class="progress"><div class="progress__bar" style="width: ${otherPct}%; background: #94a3b8;"></div></div><span class="distribution__value">${otherPct}%</span></div></div></div></section></div>
  <div class="dashboard-grid dashboard-grid--lower"><section class="card"><header class="card__header"><div><h2 class="card__title">Blood group distribution</h2><p class="card__caption">Useful for medical readiness</p></div></header><div class="card__body"><div class="distribution">${finalBlood.map(([group, value]) => `<div class="distribution__row"><span class="distribution__label">${group}</span><div class="progress"><div class="progress__bar" style="width: ${value}%;"></div></div><span class="distribution__value">${value}%</span></div>`).join('')}</div></div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Health status overview</h2><p class="card__caption">Children flagged for health concerns</p></div></header><div class="card__body"><div class="distribution"><div class="distribution__row"><span class="distribution__label">Healthy</span><div class="progress"><div class="progress__bar" style="width: ${healthyPct}%; background: var(--color-success);"></div></div><span class="distribution__value">${healthyPct}%</span></div><div class="distribution__row"><span class="distribution__label">Needs attention</span><div class="progress"><div class="progress__bar" style="width: ${flaggedPct}%; background: var(--color-warning);"></div></div><span class="distribution__value">${flaggedPct}%</span></div></div></div></section></div>`);
}

/* ═══════════════════════════════════════════════════════
   EXPORT
   ═══════════════════════════════════════════════════════ */

export function exportPage() {
  const children = getChildren();
  const totalChildren = children.length;
  const pendingCount = children.filter(c => c.status === 'Pending').length;

  return shell('export', `${heading('Export centre', 'Create an export scoped to exactly the records you need.', `<a class="button button--ghost" href="${pagePath('children')}">Back to children</a>`)}<div class="form-layout"><section class="card"><div class="form-section"><div class="form-section__heading"><h2 class="card__title">Configure your export</h2><p>Select the data, format, and delivery for a secure, reusable export.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">Records</span><select class="select"><option>All registered children (${totalChildren})</option><option>Children with pending documents (${pendingCount})</option><option>Children with health alerts</option><option>Selected child records</option></select></label><label class="field"><span class="field__label">Format</span><select class="select"><option>Excel workbook (.xlsx)</option><option>CSV file (.csv)</option><option>PDF summary (.pdf)</option></select></label><label class="field"><span class="field__label">Include fields</span><select class="select"><option>Core record details</option><option>Complete health records</option><option>Medical information only</option><option>Growth data only</option></select></label><label class="field"><span class="field__label">Delivery</span><select class="select"><option>Download now</option><option>Email a secure link</option></select></label></div></div><div class="form-section"><div class="form-section__heading"><h2 class="card__title">Privacy controls</h2><p>Limit sensitive data to the people who need it.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span>Mask contact phone numbers</label><label class="switch"><input type="checkbox"><span class="switch__track"></span>Include medical information</label></div><div class="form-section"><button class="button button--primary" type="button" data-create-export>${icon('download')}Create export</button></div></section><aside class="card form-aside"><div class="card__header"><div><h2 class="card__title">Export summary</h2></div></div><div class="card__body"><div class="detail-list detail-list--single"><div class="detail-row"><span>Estimated records</span><b>${totalChildren} children</b></div><div class="detail-row"><span>Estimated size</span><b>~ 2.4 MB</b></div><div class="detail-row"><span>Data access</span><b>Administrators only</b></div></div><div class="card__caption card__caption--spaced">Exports are logged in your activity history for auditability.</div></div></aside></div>`);
}

/* ═══════════════════════════════════════════════════════
   SETTINGS
   ═══════════════════════════════════════════════════════ */

export function settingsPage() {
  const orgName = localStorage.getItem('sample-org-name') || 'An Organisation';
  const orgCode = localStorage.getItem('sample-org-code') || 'ORG-IND-01';
  const orgEmail = localStorage.getItem('sample-org-email') || 'admin@organisation.org';
  const orgTimezone = localStorage.getItem('sample-org-timezone') || 'Asia / Kolkata';

  return shell('settings', `${heading('Settings', 'Keep your workspace secure, consistent, and ready for your organisation.', `<button class="button button--primary" type="button" data-save-settings>Save changes</button>`)}<div class="settings-layout"><nav class="card settings-nav" aria-label="Settings sections"><button type="button" class="active">Workspace</button><button type="button">Profile & team</button><button type="button">Child health fields</button><button type="button">Notifications</button><button type="button">Security</button></nav><section class="card settings-panel"><h2>Workspace</h2><p class="muted">Manage the details that appear across your workspace.</p><div class="form-grid--two form-gap">${field('Organisation name', 'schoolName', 'An Organisation', 'text', '', orgName)}${field('Organisation code', 'schoolCode', 'ORG-IND-01', 'text', '', orgCode)}${field('Primary contact email', 'contact', 'admin@organisation.org', 'email', '', orgEmail)}${field('Timezone', 'timezone', 'Asia / Kolkata', 'text', '', orgTimezone)}</div><div class="settings-row"><div><b>Registration notifications</b><p>Notify administrators when a new child record is added.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span><span class="sr-only">Registration notifications</span></label></div><div class="settings-row"><div><b>Document review reminders</b><p>Send a weekly reminder for records awaiting verification.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span><span class="sr-only">Document review reminders</span></label></div><div class="settings-row"><div><b>Health alert notifications</b><p>Notify when a child's health status changes to critical.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span><span class="sr-only">Health alert notifications</span></label></div><div class="settings-row"><div><b>Two-factor authentication</b><p>Require administrators to use an additional security step at sign in.</p></div><button class="button button--sm" type="button" data-2fa>Configure</button></div></section></div>`);
}

/* ═══════════════════════════════════════════════════════
   PAGE ROUTER
   ═══════════════════════════════════════════════════════ */

export function renderPage(page) {
  const pages = {
    login: loginPage,
    dashboard: dashboardPage,
    children: childrenPage,
    'child-profile': childProfilePage,
    'register-child': registerChildPage,
    'ocr-upload': ocrUploadPage,
    'ocr-processing': ocrProcessingPage,
    'ocr-review': ocrReviewPage,
    'ocr-details': ocrDetailsPage,
    documents: documentsPage,
    reports: reportsPage,
    export: exportPage,
    settings: settingsPage,
    growth: growthPage,
    nutrition: nutritionPage,
    medicines: medicinesPage,
    appointments: appointmentsPage,
    emergency: emergencyPage,
    expenses: expensesPage
  };
  return (pages[page] || dashboardPage)();
}
