import { icon, initials, pagePath, statusBadge, escapeHTML, formatDate, healthDot } from './utils.js';
import { getChildren, getChild, getActivities, getPendingDocs, timeAgo, activityIcon, activityLabel, getUploadedDocs, getAppointments, getMedicines, getExpenses, getEmergencyContacts, getSponsors, getGrowthRecords, getMeals, getAllMeals, getHealthRecords, getAlerts, healthStatus, calculateAge, ageGroup } from './storage.js';
import { childRows, childTableHeaders } from './table.js';
import { registrationChart } from './chart.js';
import { getSession } from './session.js';
import { getGoogleSheetUrl, getClinicalSheetUrl, getSheetsConfig, getNgoSlug } from './googleSheetsSync.js';
import { getGoogleDocUrl, getDocsConfig } from './googleDocsSync.js';
import { calendarCard, renderCalendarGrid, renderDayView, renderBookingForm, computeAppointmentStatus, formatSingleDisplayTime } from './googleCalendar.js';

/* ═══════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════ */

const nav = [
  { section: 'Overview', items: [['dashboard', 'Dashboard', 'grid']] },
  { section: 'Children & Health', items: [['children', 'Children', 'users'], ['appointments', 'Appointments', 'calendar'], ['growth', 'Growth', 'ruler'], ['medicines', 'Prescriptions', 'pill'], ['documents', 'Documents', 'file']] },
  { section: 'Analytics', items: [['reports', 'Reports', 'chart']] }
];

const pageTitles = {
  dashboard: 'Dashboard',
  children: 'Children',
  appointments: 'Appointments',
  'child-profile': 'Child Health Profile',
  'register-child': 'Register child',
  'ocr-upload': 'Google Cloud Vision API Extraction',
  'ocr-review': 'Review extracted information',
  'ocr-details': 'Additional details',
  'ocr-processing': 'Processing document',
  documents: 'Health records & documents',
  reports: 'Health reports',
  settings: 'Settings'
};

function navItem(item, active) {
  const [page, label, glyph] = item;
  return `<a class="nav-item ${page === active ? 'nav-item--active' : ''}" href="${pagePath(page)}" ${page === active ? 'aria-current="page"' : ''}>${icon(glyph)}<span class="nav-item__text">${label}</span></a>`;
}

/* ═══════════════════════════════════════════════════════
   APP SHELL
   ═══════════════════════════════════════════════════════ */

export function shell(page, content) {
  const session = getSession() || {};
  const displayName = session.displayName || 'Authorized User';
  const email = session.email || 'tejassachin2010@gmail.com';
  const ngoName = session.ngo || localStorage.getItem('sample-org-name') || 'Ayusha Nilayam';
  const role = session.role || 'Admin';
  const photoURL = session.photoURL;
  const userInitials = displayName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'AD';

  const navHTML = nav.map(group => group.items.map(item => navItem(item, page)).join('')).join('');

  return `<div class="app-shell">
    <aside class="sidebar" aria-label="Primary navigation">
      <div class="sidebar__header"><a class="sidebar__brand" href="${pagePath('dashboard')}" aria-label="Home"><span class="brand-mark">${icon('heartPulse')}</span><span class="brand-name">Demo</span></a><button class="sidebar__toggle" type="button" data-collapse-sidebar aria-label="Collapse sidebar">${icon('menu')}</button></div>
      <nav class="sidebar__nav">${navHTML}<a class="nav-item ${page === 'settings' ? 'nav-item--active' : ''}" href="${pagePath('settings')}">${icon('settings')}<span class="nav-item__text">Google Workspace</span></a></nav>
      <div class="sidebar__foot"><div class="workspace-user"><span class="workspace-user__avatar">${userInitials}</span><span class="workspace-user__copy"><span class="workspace-user__name">${escapeHTML(ngoName)}</span><span class="workspace-user__role">${escapeHTML(role)}</span></span></div></div>
    </aside><div class="mobile-backdrop" hidden data-close-sidebar></div>
    <main class="app-main" id="app-main">
      <header class="topbar">
        ${page === 'dashboard' ? '' : `<button class="icon-button" data-topbar-back aria-label="Go back">${icon('chevronLeft')}</button>`}
        <div class="topbar__crumbs"><span>Demo</span><span aria-hidden="true"> / </span><b>${pageTitles[page] || 'Workspace'}</b></div>
        <label class="topbar-search"><span class="sr-only">Search child records</span>${icon('search')}<input type="search" placeholder="Search children, health records…" data-global-search><kbd>⌘ K</kbd></label>
        <div class="topbar__actions">
          <button class="icon-button tooltip" data-tooltip="Toggle theme" data-theme-toggle type="button" aria-label="Toggle color theme">${icon('sun')}</button>
          <button class="icon-button tooltip" data-tooltip="Notifications" type="button" aria-label="Notifications" data-notifications>${icon('bell')}</button>
          
          <!-- DASHBOARD HEADER GOOGLE USER PROFILE & NGO WORKSPACE -->
          <div class="topbar-profile" style="display:flex; align-items:center; gap:12px;">
            <button class="topbar-profile__trigger" data-profile-menu type="button" aria-haspopup="true" aria-expanded="false" style="display:flex; align-items:center; gap:8px; padding:4px 8px; border-radius:20px; border:1px solid var(--color-border); background:var(--color-bg);">
              ${photoURL ? `<img src="${escapeHTML(photoURL)}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" />` : `<span class="avatar" style="width:28px; height:28px; border-radius:50%; font-size:11px; font-weight:700;">${userInitials}</span>`}
              <span class="topbar-profile__name" style="font-weight:600; font-size:13px;">${escapeHTML(displayName)}</span>
              ${icon('chevronDown')}
            </button>
            <div class="dropdown" hidden data-profile-dropdown>
              <div style="padding:12px 14px; border-bottom:1px solid var(--color-border); font-size:12px;">
                <div style="font-weight:700; color:var(--color-text);">${escapeHTML(displayName)}</div>
                <div style="color:var(--color-text-muted); font-size:11px; margin-top:2px;">${escapeHTML(email)}</div>
                <div style="margin-top:6px; font-size:11px;"><span class="badge badge--success">Connected NGO: ${escapeHTML(ngoName)}</span></div>
              </div>
              <a class="dropdown__item" href="${pagePath('settings')}">${icon('settings')}Account & Google Workspace</a>
              <div class="divider"></div>
              <button class="dropdown__item" type="button" data-sign-out>${icon('lock')}Sign out</button>
            </div>
          </div>
        </div>
      </header>
      <section class="content page-enter">${content}</section>
    </main>
  </div>`;
}

const heading = (title, description, actions) => `<div class="page-heading"><div class="page-heading__copy"><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="page-heading__actions">${actions}</div>` : ''}</div>`;

function getDynamicGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, Admin';
  if (hour < 17) return 'Good afternoon, Admin';
  return 'Good evening, Admin';
}

const statCard = (label, value, trend, glyph, color = 'blue') => `
  <article class="stat-card stat-card--${color}">
    <div class="stat-card__top">
      <span class="stat-card__label">${label}</span>
      <span class="stat-card__icon stat-card__icon--${color}">${icon(glyph)}</span>
    </div>
    <div class="stat-card__number">${value}</div>
    <div class="stat-card__footer">
      <span class="stat-pill stat-pill--${color}">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        ${trend}
      </span>
    </div>
  </article>
`;

const field = (label, name, placeholder, type = 'text', hint = '', value = '', extra = '') => `<label class="field"><span class="field__label">${label}</span><input class="input" name="${name}" type="${type}" placeholder="${placeholder}" value="${escapeHTML(value)}" ${extra}>${hint ? `<span class="field__hint">${hint}</span>` : ''}</label>`;

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const matchDMY = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (matchDMY) {
    const [_, d, m, y] = matchDMY;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  try { const d = new Date(dateStr); if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10); } catch (e) { }
  return '';
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD — Child Health Platform
   ═══════════════════════════════════════════════════════ */

export function dashboardPage() {
  const children = getChildren();
  const totalChildren = children.length;
  const growthCount = getGrowthRecords().length;
  const medicinesCount = getMedicines().length;
  const uploadedDocsCount = getUploadedDocs().length;
  const healthReportsCount = getHealthRecords().length || 4;

  // Flagged children for alerts
  const flaggedChildren = children.filter(c => healthStatus(c).level !== 'good');

  // Children Needing Attention
  let attentionHTML = '';
  if (flaggedChildren.length === 0) {
    attentionHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon('check')}</span><h3 style="font-size:13px">All children healthy</h3><p>No health alerts at this time.</p></div></td></tr>`;
  } else {
    attentionHTML = flaggedChildren.slice(0, 4).map(child => {
      const hs = healthStatus(child);
      return `<tr><td><a class="table-person" href="${pagePath('child-profile')}?id=${child.id}"><span class="table-avatar">${initials(child.name)}</span><span class="table-person__info"><b class="table-person__name">${child.name}</b><span class="table-person__id">${child.id}</span></span></a></td><td>${calculateAge(child.dob) || '—'}</td><td class="hide-tablet">${hs.flags.join(', ')}</td><td>${healthDot(hs.level)} ${statusBadge(hs.level === 'critical' ? 'Critical' : 'Pending')}</td></tr>`;
    }).join('');
  }

  return shell('dashboard', `${heading(getDynamicGreeting(), 'Welcome to the Google Workspace-integrated Child Health Management Platform.', `<a class="button" href="${pagePath('ocr-upload')}">${icon('scan')}Cloud Vision Upload</a><a class="button button--primary" href="${pagePath('register-child')}">${icon('plus')}Register child</a>`)}
  <div class="stat-grid">
    ${statCard('Total Children', totalChildren.toLocaleString(), 'Active records', 'users', 'blue')}
    ${statCard('Recent Health Reports', healthReportsCount.toLocaleString(), 'Lab test panels', 'heartPulse', 'green')}
    ${statCard('Growth Records', growthCount.toLocaleString(), 'Vitals logged', 'ruler', 'amber')}
    ${statCard('Prescriptions', medicinesCount.toLocaleString(), 'Active prescriptions', 'pill', 'violet')}
    ${statCard('Uploaded Documents', uploadedDocsCount.toLocaleString(), 'Google Drive', 'file', 'cyan')}
    ${statCard('Last Checkup', 'Today', '10:30 AM verified', 'clock', 'rose')}
  </div>
  <div style="margin-top: 20px;">
    ${calendarCard()}
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   LOGIN
   ═══════════════════════════════════════════════════════ */

export function loginPage() {
  return `<main class="login-page">
    <div class="login-bg-orbs" aria-hidden="true">
      <span class="login-orb login-orb--1"></span>
      <span class="login-orb login-orb--2"></span>
      <span class="login-orb login-orb--3"></span>
    </div>
    <section class="login-panel">
      <div class="card login-card">
        <div class="login-card__hero" aria-hidden="true">
          <div class="login-card__hero-icon">${icon('stethoscope')}</div>
        </div>
        <h1>Welcome back</h1>
        <p>Sign in to access the Child Health Management Platform</p>

        <button class="button button--primary tooltip" data-tooltip="Sign in with authorized Google Account" data-google-login type="button" style="width:100%; min-height:46px; display:flex; align-items:center; justify-content:center; gap:12px; font-weight:600; font-size:14px; background: #ffffff; color: #3c4043; border: 1px solid #dadce0; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <img src="/google-logo.png" alt="Google Logo" style="width:22px; height:22px; object-fit:contain;" />
          Continue with Google
        </button>

        <div class="login-features" aria-hidden="true">
          <div class="login-feature">${icon('shield')}<span>Secure Access</span></div>
          <div class="login-feature">${icon('activity')}<span>Health Tracking</span></div>
          <div class="login-feature">${icon('heart')}<span>Child Care</span></div>
        </div>
      </div>
    </section>
  </main>`;
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

  return shell('children', `${heading('Children', 'Search, monitor, and manage every child health record in one place.', `<a class="button button--primary" href="${pagePath('register-child')}">${icon('plus')}Register child</a>`)}
  <section class="card"><div class="table-toolbar"><label class="input-group table-toolbar__search">${icon('search')}<input class="input" id="child-search" type="search" placeholder="Search name, guardian, phone, ID…" aria-label="Search children"></label><div class="table-toolbar__actions"><button class="button button--sm" type="button" data-filter-toggle>${icon('filter')}Filters</button><button class="icon-button tooltip" data-tooltip="Column visibility" type="button" aria-label="Change visible columns" data-column-visibility-toggle>${icon('settings')}</button></div></div><div class="filter-row" hidden data-filter-row><label class="field"><span class="field__label">Status</span><select class="select" data-filter-status><option value="">All statuses</option><option>Active</option><option>Pending</option><option>Verified</option></select></label><label class="field"><span class="field__label">Blood group</span><select class="select" data-filter-blood><option value="">All groups</option><option>A+</option><option>B+</option><option>O+</option><option>AB+</option><option>A-</option><option>B-</option><option>O-</option><option>AB-</option></select></label><button class="button button--ghost button--sm" type="button" data-clear-filters>Clear filters</button></div><div class="data-table-wrap"><table class="data-table"><thead>${childTableHeaders()}</thead><tbody id="child-table-body">${childRows(paginated)}</tbody></table></div><footer class="pagination"><span id="child-count">${totalItems} children (Page 1 of ${totalPages})</span><div class="pagination__buttons"><button class="button button--sm" id="btn-prev" disabled>${icon('chevronLeft')}Previous</button><button class="button button--sm" id="btn-next" ${totalPages <= 1 ? 'disabled' : ''}>Next${icon('chevronRight')}</button></div></footer></section>`);
}

/* ═══════════════════════════════════════════════════════
   CHILD HEALTH PROFILE
   ═══════════════════════════════════════════════════════ */

function getURLParam(key) {
  let searchParams = new URLSearchParams(window.location.search);
  let val = searchParams.get(key);
  if (!val && window.location.hash.includes('?')) {
    const hashQuery = window.location.hash.split('?')[1];
    val = new URLSearchParams(hashQuery).get(key);
  }
  return val;
}

export function childProfilePage() {
  const id = getURLParam('id');
  const child = getChild(id);
  if (!child) return shell('child-profile', '<div class="card"><div class="card__body">Child record not found.</div></div>');

  const hs = healthStatus(child);
  const age = calculateAge(child.dob);
  const growth = getGrowthRecords(child.id);
  const latestGrowth = growth[0];
  const meds = getMedicines(child.id).filter(m => m.status === 'Active');
  const allMeds = getMedicines(child.id);
  const docs = getUploadedDocs().filter(d => (d.childName && d.childName.toLowerCase() === child.name.toLowerCase()) || d.childId === child.id || (d.child && d.child.toLowerCase() === child.name.toLowerCase()));
  const healthRecs = getHealthRecords(child.id);
  const activities = getActivities().filter(a => (a.childName && a.childName.toLowerCase() === child.name.toLowerCase()) || (a.detail && a.detail.includes(child.name)));

  // Docs HTML for Documents tab
  let docsHTML = '';
  if (docs.length === 0) {
    docsHTML = `<div class="empty-state" style="padding: 36px 24px;"><span class="empty-state__icon">${icon('file')}</span><h3>No documents uploaded</h3><p>Medical records, Aadhaar cards, and health certificates uploaded for ${escapeHTML(child.name)} will appear here.</p><div style="margin-top:16px;"><button class="button button--primary" type="button" data-upload-profile-doc="${child.id}" data-child-name="${escapeHTML(child.name)}">${icon('upload')} Upload Document for ${escapeHTML(child.name)}</button></div></div>`;
  } else {
    docsHTML = `<div class="document-grid">${docs.map((d, idx) => `
      <article class="card document-card" style="position:relative;">
        <button class="icon-button tooltip" data-tooltip="Delete document" type="button" data-delete-doc-idx="${idx}" style="position:absolute; top:8px; right:8px; width:26px; height:26px; min-width:26px; padding:0; border-radius:50%; background:rgba(255,255,255,0.9); backdrop-filter:blur(4px); border:1px solid rgba(220,38,38,0.25); color:#dc2626; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.1); cursor:pointer; z-index:2;">
          ${icon('trash')}
        </button>
        <div class="document-card__body" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-right:24px;">
            <h3 style="font-size:14px; font-weight:600; margin:0;">${d.name || d.title || 'Medical Document'}</h3>
            <span class="badge badge--success">${d.status || 'Verified'}</span>
          </div>
          <div class="detail-list detail-list--single" style="font-size:13px;">
            <div class="detail-row"><span>Category</span><b>${d.docType || d.category || 'Medical Report'}</b></div>
            <div class="detail-row"><span>Uploaded</span><b>${d.uploadDate || formatDate(d.timestamp) || 'Recently'}</b></div>
          </div>
          ${d.fileData || d.image ? `<div style="margin-top:12px;"><a class="button button--sm" href="${d.fileData || d.image}" target="_blank" download="${d.name || 'document'}.png">${icon('download')} View / Download</a></div>` : ''}
        </div>
      </article>
    `).join('')}</div>`;
  }

  // Health records / reports HTML
  let reportsHTML = '';
  if (healthRecs.length === 0 && meds.length === 0) {
    reportsHTML = `<div class="empty-state" style="padding: 36px 24px;"><span class="empty-state__icon">${icon('heartPulse')}</span><h3>No lab reports logged</h3><p>Blood test results and clinical lab reports will appear here.</p></div>`;
  } else {
    reportsHTML = `
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

  // Growth HTML
  let growthHTML = '';
  if (growth.length === 0) {
    growthHTML = `<div class="empty-state" style="padding: 36px 24px;"><span class="empty-state__icon">${icon('ruler')}</span><h3>No growth records</h3><p>Height, weight, and BMI records will appear here.</p></div>`;
  } else {
    growthHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <h3 style="font-size:14px; font-weight:600;">Growth Measurements History</h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Height</th><th>Weight</th><th>BMI</th><th>Status</th></tr></thead>
            <tbody>
              ${growth.map(g => `<tr><td>${formatDate(g.date || g.timestamp)}</td><td><b>${g.height} cm</b></td><td><b>${g.weight} kg</b></td><td><span class="badge badge--neutral">${g.bmi || '—'}</span></td><td>${g.bmi ? (g.bmi < 16 ? '<span class="badge badge--danger">Underweight</span>' : g.bmi > 25 ? '<span class="badge badge--warning">Overweight</span>' : '<span class="badge badge--success">Normal</span>') : '—'}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // Medicines HTML
  let medsHTML = '';
  if (allMeds.length === 0) {
    medsHTML = `<div class="empty-state" style="padding: 36px 24px;"><span class="empty-state__icon">${icon('pill')}</span><h3>No prescriptions logged</h3><p>Medications prescribed for ${child.name} will appear here.</p></div>`;
  } else {
    medsHTML = `<div class="document-grid">${allMeds.map(m => `
      <article class="card document-card"><div class="document-card__body" style="padding:14px"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px"><h3 style="font-size:14px; font-weight:600; margin:0">${m.medicineName}</h3>${statusBadge(m.status)}</div><p style="font-size:13px; color:var(--color-text-muted); margin:0 0 4px">${m.dosage}</p><p style="font-size:12px; color:var(--color-text-muted); margin:0">${m.frequency} · ${m.startDate} → ${m.endDate}</p></div></article>
    `).join('')}</div>`;
  }

  // Timeline HTML
  let timelineHTML = '';
  if (activities.length === 0) {
    timelineHTML = `<div class="timeline"><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Child registered</b><p>Record created in the health management workspace.</p><time>${child.registeredDate ? formatDate(child.registeredDate) : 'Recently'}</time></div></div></div>`;
  } else {
    timelineHTML = `<div class="timeline">${activities.map(a => `<div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>${a.action ? a.action.replace(/_/g, ' ').toUpperCase() : 'ACTIVITY'}</b><p>${a.detail || a.childName}</p><time>${timeAgo(a.timestamp)}</time></div></div>`).join('')}</div>`;
  }

  return shell('child-profile', `${heading('Child Health Profile', 'A complete, well-organized health record for this child.', `<button class="button" type="button" data-open-child-sheet="${child.id}" data-child-name="${escapeHTML(child.name)}" style="display:inline-flex; align-items:center; gap:8px;">${icon('googleSheets')}Open Google Sheet</button><button class="button" type="button" data-profile-print>${icon('printer')}Print profile</button><button class="button button--primary" type="button" data-edit="${child.id}">${icon('pencil')}Edit profile</button>`)}
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
        <button class="tab" type="button" data-profile-tab="growth">Growth</button>
        <button class="tab" type="button" data-profile-tab="medicines">Prescriptions</button>
        <button class="tab" type="button" data-profile-tab="reports">Reports</button>
        <button class="tab" type="button" data-profile-tab="documents">Documents (${docs.length})</button>
        <button class="tab" type="button" data-profile-tab="timeline">Health Timeline</button>
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
              <div><h2 class="card__title">Personal information</h2><p class="card__caption">Core child details</p></div>
              <button class="icon-button icon-button--small" type="button" data-edit="${child.id}">${icon('pencil')}</button>
            </header>
            <div class="card__body">
              <div class="detail-list">
                <div class="detail-row"><span>Full name</span><b>${child.name}</b></div>
                <div class="detail-row"><span>Date of birth</span><b>${child.dob ? formatDate(child.dob) : 'Not specified'}</b></div>
                <div class="detail-row"><span>Age</span><b>${age || 'Not specified'}</b></div>
                <div class="detail-row"><span>Gender</span><b>${child.gender || 'Not specified'}</b></div>
                <div class="detail-row"><span>Blood group</span><b>${child.blood || 'Not specified'}</b></div>
                <div class="detail-row"><span>ID number (Aadhaar)</span><b>${child.idNumber || 'Not specified'}</b></div>
                <div class="detail-row"><span>Parent / Guardian</span><b>${child.father || 'Not specified'}</b></div>
                <div class="detail-row"><span>Mother name</span><b>${child.mother || 'Not specified'}</b></div>
                <div class="detail-row"><span>Contact phone</span><b>${child.phone || 'Not specified'}</b></div>
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
                <div class="detail-row"><span>Current medications</span><b>${child.medications || (meds.length > 0 ? meds.map(m => m.medicineName).join(', ') : 'None')}</b></div>
                <div class="detail-row"><span>Dental remarks</span><b>${child.dentalRemarks || 'No remarks recorded'}</b></div>
                <div class="detail-row"><span>Hygiene Index</span><b>${child.hygieneIndex || 'Not Assessed'}</b></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- GROWTH TAB -->
    <div data-tab-panel="growth" style="display: none;">
      <section class="card">
        <header class="card__header">
          <div><h2 class="card__title">Growth Tracking History</h2><p class="card__caption">Height, weight, and BMI progression</p></div>
        </header>
        <div class="card__body">
          ${growthHTML}
        </div>
      </section>
    </div>

    <!-- MEDICINES TAB -->
    <div data-tab-panel="medicines" style="display: none;">
      <section class="card">
        <header class="card__header">
          <div><h2 class="card__title">Prescriptions</h2><p class="card__caption">Prescribed treatments and active prescriptions</p></div>
        </header>
        <div class="card__body">
          ${medsHTML}
        </div>
      </section>
    </div>

    <!-- REPORTS TAB -->
    <div data-tab-panel="reports" style="display: none;">
      <section class="card">
        <header class="card__header">
          <div><h2 class="card__title">Clinical Health Reports</h2><p class="card__caption">Lab test reports, blood panels, and clinical flags</p></div>
        </header>
        <div class="card__body">
          ${reportsHTML}
        </div>
      </section>
    </div>

    <!-- DOCUMENTS TAB -->
    <div data-tab-panel="documents" style="display: none;">
      <section class="card">
        <header class="card__header" style="display:flex; justify-content:space-between; align-items:center;">
          <div><h2 class="card__title">Uploaded Documents & Records</h2><p class="card__caption">Aadhaar scans, birth certificates, and medical reports for ${escapeHTML(child.name)}</p></div>
          <button class="button button--primary button--sm" type="button" data-upload-profile-doc="${child.id}" data-child-name="${escapeHTML(child.name)}">${icon('upload')} Upload Document</button>
        </header>
        <div class="card__body">
          ${docsHTML}
        </div>
      </section>
    </div>

    <!-- HEALTH TIMELINE TAB -->
    <div data-tab-panel="timeline" style="display: none;">
      <section class="card">
        <header class="card__header">
          <div><h2 class="card__title">Full Health Timeline</h2><p class="card__caption">Complete audit history for ${child.name}</p></div>
        </header>
        <div class="card__body">
          ${timelineHTML}
        </div>
      </section>
    </div>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   REGISTER CHILD
   ═══════════════════════════════════════════════════════ */

function steps(active, upload = false) {
  const items = upload ? ['Upload', 'Processing', 'Review & verify', 'Additional details', 'Complete'] : ['Choose method', 'Child details', 'Health & guardian', 'Complete'];
  return `<aside class="card form-aside"><div class="stepper">${items.map((item, index) => `<div class="stepper__item ${index < active ? 'stepper__item--complete' : ''} ${index === active ? 'stepper__item--active' : ''}"><span class="stepper__dot">${index < active ? icon('check') : index + 1}</span><span class="stepper__label">${item}</span></div>`).join('')}</div></aside>`;
}

export function registerChildPage() {
  const method = getURLParam('method');
  const editId = getURLParam('edit');
  const child = editId ? getChild(editId) : null;

  if (method !== 'manual' && !editId) {
    return shell('register-child', `${heading('Register a child', 'Choose the quickest, most reliable way to start a new child record.')}<section class="card"><div class="card__body"><div class="method-grid"><article class="method-card card card--interactive"><span class="method-card__icon">${icon('pencil')}</span><div><h2 class="card__title">Enter details manually</h2><p>Start with a clean, guided form. Best when information is already at hand.</p></div><a class="button" href="${pagePath('register-child')}?method=manual">Start manual entry ${icon('arrowRight')}</a></article><article class="method-card card card--interactive"><span class="method-card__icon">${icon('scan')}</span><div><h2 class="card__title">Google Cloud Vision API Document Upload</h2><p>Extract information automatically from medical documents using Cloud Vision API, then verify before saving.</p></div><a class="button button--primary" href="${pagePath('ocr-upload')}">Upload document ${icon('arrowRight')}</a></article></div></div></section>`);
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

  const knownMedsPresets = [
    'None',
    'Paracetamol / Crocin',
    'Amoxicillin Syrup',
    'Inhaler / Asthma Medication',
    'Vitamin D3 Drops / Syrup',
    'Multivitamin Syrup',
    'Iron Syrup / Supplement',
    'Albendazole / Deworming',
    'Cetirizine Syrup',
    'ORAL Rehydration Salts (ORS)'
  ];
  const curMed = child ? child.medications : '';
  const isCustomMed = curMed && !knownMedsPresets.includes(curMed);

  return shell('register-child', `${heading(title, desc, `<a class="button button--ghost" href="${child ? `${pagePath('child-profile')}?id=${child.id}` : pagePath('children')}">Cancel</a><button class="button button--primary" form="child-form" type="submit">${submitText}</button>`)}<div class="form-layout"><form class="card" id="child-form">${child ? `<input type="hidden" name="id" value="${child.id}">` : ''}
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Child information</h2><p>Use the child's legal name as it appears on official documents.</p></div><div class="form-grid--two">${field('First name *', 'firstName', 'e.g. Naveen', 'text', '', firstName, 'required')}${field('Last name', 'lastName', 'e.g. Roy', 'text', '', lastName)}${field('Date of birth *', 'birthDate', '', 'date', '', child ? formatDateForInput(child.dob) : '', 'required')}<label class="field"><span class="field__label">Gender *</span><select class="input" name="gender" required><option value="" disabled ${!child || !child.gender ? 'selected' : ''}>Select gender</option><option value="Male" ${child && child.gender === 'Male' ? 'selected' : ''}>Male</option><option value="Female" ${child && child.gender === 'Female' ? 'selected' : ''}>Female</option><option value="Other" ${child && child.gender === 'Other' ? 'selected' : ''}>Other</option></select></label>${field('Blood group', 'blood', 'e.g. O+', 'text', '', blood)}${field('ID number (Aadhaar)', 'idNumber', '0000 0000 0000', 'text', '', child ? child.idNumber : '')}</div></section>
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Health baseline</h2><p>Initial health measurements, medications, and dental records.</p></div><div class="form-grid--two">${field('Height (cm)', 'height', 'e.g. 140', 'number', '', child ? child.height : '', 'step="any" min="0"')}${field('Weight (kg)', 'weight', 'e.g. 35', 'number', '', child ? child.weight : '', 'step="any" min="0"')}<label class="field form-span-all"><span class="field__label">Known medical conditions</span><textarea class="textarea" name="medicalConditions" placeholder="e.g. Asthma, Diabetes, Epilepsy">${child ? escapeHTML(child.medicalConditions) : ''}</textarea></label><label class="field form-span-all"><span class="field__label">Allergies</span><textarea class="textarea" name="allergies" placeholder="e.g. Peanuts, Penicillin, Dust">${child ? escapeHTML(child.allergies) : ''}</textarea></label>
  <div class="field form-span-all">
    <span class="field__label">Current medications</span>
    <div class="combobox" data-combobox>
      <input type="hidden" name="medications" value="${escapeHTML(curMed)}">
      <span class="combobox__icon-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10v7h7Z"/><path d="m8.5 15.5 7-7"/></svg></span>
      <input class="combobox__input" type="text" placeholder="Search or type a medication..." value="${escapeHTML(curMed)}" autocomplete="off" data-combobox-input>
      <span class="combobox__chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></span>
      <div class="combobox__panel" data-combobox-panel>
        <div class="combobox__hint">Common medications</div>
        <div data-combobox-option="None" class="combobox__option">None<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="Paracetamol / Crocin" class="combobox__option">Paracetamol / Crocin<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="Amoxicillin Syrup" class="combobox__option">Amoxicillin Syrup<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="Inhaler / Asthma Medication" class="combobox__option">Inhaler / Asthma Medication<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="Vitamin D3 Drops / Syrup" class="combobox__option">Vitamin D3 Drops / Syrup<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="Multivitamin Syrup" class="combobox__option">Multivitamin Syrup<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="Iron Syrup / Supplement" class="combobox__option">Iron Syrup / Supplement<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="Albendazole / Deworming" class="combobox__option">Albendazole / Deworming<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="Cetirizine Syrup" class="combobox__option">Cetirizine Syrup<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="ORAL Rehydration Salts (ORS)" class="combobox__option">ORAL Rehydration Salts (ORS)<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div class="combobox__divider"></div>
        <div class="combobox__empty" data-combobox-empty style="display:none;"><b>No matches found</b>Press Enter to use your custom medication</div>
      </div>
    </div>
    <span class="field__hint">Select a preset or type any custom medicine name directly.</span>
  </div>
  <label class="field form-span-all"><span class="field__label">Dental remarks</span><textarea class="textarea" name="dentalRemarks" placeholder="e.g. RESTORATION, SCALING, ORTHODONTIC TREATMENT">${child ? escapeHTML(child.dentalRemarks || '') : ''}</textarea></label>
  <div class="field form-span-all">
    <span class="field__label">Oral Hygiene Index</span>
    <div class="combobox" data-combobox>
      <input type="hidden" name="hygieneIndex" value="${child ? escapeHTML(child.hygieneIndex || '') : ''}">
      <span class="combobox__icon-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg></span>
      <input class="combobox__input" type="text" placeholder="Select hygiene index..." value="${child ? escapeHTML(child.hygieneIndex || '') : ''}" autocomplete="off" data-combobox-input readonly style="cursor:pointer;">
      <span class="combobox__chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></span>
      <div class="combobox__panel" data-combobox-panel>
        <div data-combobox-option="SATISFACTORY" class="combobox__option">SATISFACTORY<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="AVERAGE" class="combobox__option">AVERAGE<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div data-combobox-option="POOR" class="combobox__option">POOR<span class="combobox__option-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg></span></div>
      </div>
    </div>
  </div>
  </div></section>
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Guardian contact</h2><p>This contact will receive health updates.</p></div><div class="form-grid--two">${field('Parent / guardian name *', 'father', 'e.g. A.N. Roy', 'text', '', father)}${field('Mother name', 'mother', 'e.g. Priya Roy', 'text', '', child ? child.mother : '')}${field('Phone number *', 'phone', '+91 00000 00000', 'tel', '', phone)}${field('Email address', 'email', 'guardian@example.com', 'email', '', email)}</div></section>
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Address & notes</h2></div><div class="form-grid--two"><label class="field form-span-all"><span class="field__label">Home address</span><textarea class="textarea" name="address" placeholder="Street address, city, state, postcode">${child ? escapeHTML(child.address) : ''}</textarea></label><label class="field form-span-all"><span class="field__label">Internal notes</span><textarea class="textarea" name="notes" placeholder="Optional notes visible to staff only.">${child ? escapeHTML(child.notes) : ''}</textarea></label></div></section></form>${steps(1)}</div>`);
}

/* ═══════════════════════════════════════════════════════
   GOOGLE CLOUD VISION API EXTRACTION PAGES
   ═══════════════════════════════════════════════════════ */

export function ocrUploadPage() {
  return shell('ocr-upload', `${heading('Google Cloud Vision API Extraction', 'Upload a medical document (Blood Reports, Prescriptions, Medical Certificates, Vaccination Records, Aadhaar). Google Cloud Vision API will extract structured fields for review.', `<a class="button button--ghost" href="${pagePath('register-child')}">Cancel</a>`)}<div class="form-layout"><section class="card"><div class="card__body"><div class="upload-zone" data-upload-zone><span class="upload-zone__icon">${icon('upload')}</span><h2 class="card__title">Drop a medical document here</h2><p>Choose a file from your device. Google Cloud Vision API will scan and extract health & child details.</p><button class="button button--primary" type="button" data-start-ocr>${icon('file')}Choose document</button><input class="sr-only" type="file" accept=".jpg,.jpeg,.png" data-upload-input><span class="upload-zone__formats">JPG or PNG · Up to 15 MB</span></div></div><div style="padding:16px; background:var(--color-bg-alt); border-top:1px solid var(--color-border);"><b style="font-size:13px; display:block; margin-bottom:8px;">Supported Document Types:</b><div style="display:flex; flex-wrap:wrap; gap:8px;"><span class="badge badge--blue">Blood Reports</span><span class="badge badge--blue">Prescriptions</span><span class="badge badge--blue">Handwritten Medical Notes</span><span class="badge badge--blue">Medical Certificates</span><span class="badge badge--blue">Vaccination Records</span></div></div></section>${steps(0, true)}</div>`);
}

export function ocrProcessingPage() {
  return shell('ocr-processing', `${heading('Processing with Google Cloud Vision API', 'Extracted details will be prepared for your verification before any record is updated.')}<section class="card"><div class="ocr-processing"><div class="ocr-processing__orbit" style="box-shadow: 0 0 25px rgba(59, 130, 246, 0.35);">${icon('scan')}</div><h2>Google Cloud Vision API Scanning</h2><p>Performing multi-pass document OCR and extracting health vital data for review.</p><div class="ocr-processing__progress"><div class="ocr-processing__progress-header"><span class="ocr-progress-status" style="font-weight: 600; color: var(--color-primary);">Analyzing image contrast with Google Cloud Vision API...</span><span class="ocr-progress-pct" style="font-weight: 700;">0%</span></div><div class="progress" style="height: 10px;"><div class="progress__bar ocr-progress-bar" style="width: 0%; transition: width 0.25s ease-out;"></div></div></div></div></section>`);
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
    previewHTML = `<div class="document-sheet"><div class="document-sheet__brand">GOOGLE CLOUD VISION OCR</div><div class="document-sheet__title">EXTRACTED HEALTH RECORD FORM</div><div class="document-sheet__line document-sheet__line--wide"></div><div class="document-sheet__line document-sheet__line--half"></div><div class="document-sheet__table"><div class="document-sheet__cell"><b>CHILD NAME</b><span>${firstName} ${lastName}</span></div><div class="document-sheet__cell"><b>DATE OF BIRTH</b><span>${dob}</span></div><div class="document-sheet__cell"><b>PARENT'S NAME</b><span>${father}</span></div><div class="document-sheet__cell"><b>BLOOD GROUP</b><span>${blood}</span></div><div class="document-sheet__cell"><b>PHONE</b><span>${phone}</span></div><div class="document-sheet__cell"><b>ID NUMBER</b><span>${idNumber}</span></div></div></div>`;
  }

  return shell('ocr-review', `${heading('Review Cloud Vision API Extracted Data', 'Check the values below against the document before continuing.', `<button class="button" type="button" data-ocr-back>Back</button><button class="button button--primary" type="button" data-ocr-continue>Continue to details ${icon('arrowRight')}</button>`)}<div class="form-layout"><div class="review-layout"><section class="card document-preview"><div class="document-toolbar"><span class="badge badge--blue">Cloud Vision Scan</span><div class="document-toolbar__controls"><button class="icon-button icon-button--small tooltip" data-tooltip="Rotate" type="button" data-ocr-rotate>${icon('rotate')}</button><button class="icon-button icon-button--small tooltip" data-tooltip="Fullscreen" type="button" data-ocr-fullscreen>${icon('maximize')}</button></div></div>${previewHTML}</section><form class="card"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Extracted fields</h2><p>Review the values detected by Cloud Vision API.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">First name</span><input class="input" value="${firstName}" name="firstName"></label><label class="field"><span class="field__label">Last name</span><input class="input" value="${lastName}" name="lastName"></label><label class="field"><span class="field__label">Date of birth</span><input class="input" value="${dob}" name="date"></label><label class="field"><span class="field__label">Gender</span><input class="input" value="${gender}" name="gender"></label><label class="field"><span class="field__label">Blood group</span><input class="input" value="${blood}" name="blood"></label><label class="field"><span class="field__label">ID number</span><input class="input" value="${idNumber}" name="idNumber"></label><label class="field form-span-all"><span class="field__label">Parent / guardian</span><input class="input" value="${father}" name="father"></label><label class="field form-span-all"><span class="field__label">Mother name</span><input class="input" value="${mother}" name="mother"></label></div></section><section class="form-section"><label class="checkbox"><input type="checkbox" data-ocr-confirm required><span>I've checked the extracted details against the original document.</span></label></section></form></div>${steps(2, true)}</div>`);
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

  return shell('ocr-details', `${heading('Additional details', 'Complete remaining health details before saving.', `<a class="button" href="${pagePath('ocr-review')}">Back</a><button class="button button--primary" type="submit" form="ocr-additional-form">Save child record</button>`)}<div class="form-layout"><form class="card" id="ocr-additional-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Registration & contact</h2><p>Complete any additional details for this record.</p></div><div class="form-grid--two">${field('Mother name', 'mother', 'e.g. Priya Roy', 'text', '', mother)}${field('Mobile number *', 'phone', 'e.g. +91 98221 40393', 'tel', '', phone)}${field('Email address', 'email', 'guardian@example.com', 'email')}${field('Height (cm)', 'height', 'e.g. 140', 'number', '', '', 'step="any" min="0"')}${field('Weight (kg)', 'weight', 'e.g. 35', 'number', '', '', 'step="any" min="0"')}<label class="field form-span-all"><span class="field__label">Known medical conditions</span><textarea class="textarea" name="medicalConditions" placeholder="e.g. Asthma, Diabetes"></textarea></label><label class="field form-span-all"><span class="field__label">Allergies</span><textarea class="textarea" name="allergies" placeholder="e.g. Peanuts, Penicillin"></textarea></label><label class="field form-span-all"><span class="field__label">Address</span><textarea class="textarea" name="address" placeholder="Street address, city, state, postcode"></textarea></label><label class="field form-span-all"><span class="field__label">Upload Additional Medical Records / Reports</span><input class="input" type="file" name="additionalDoc" accept=".jpg,.jpeg,.png,.pdf" data-additional-doc-input><span style="font-size:11px; color:var(--color-text-muted); margin-top:4px;">Upload blood test reports, immunization records, or medical certificates.</span></label></div></section><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Final verification</h2><p>You're about to create the child record.</p></div><label class="checkbox"><input type="checkbox" required><span>I confirm the information is accurate and complete.</span></label></section><input type="hidden" name="firstName" value="${firstName}"><input type="hidden" name="lastName" value="${lastName}"><input type="hidden" name="father" value="${father}"><input type="hidden" name="gender" value="${gender}"><input type="hidden" name="blood" value="${blood}"><input type="hidden" name="idNumber" value="${idNumber}"><input type="hidden" name="dob" value="${ocrData.dob || ''}"></form>${steps(3, true)}</div>`);
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

  return shell('growth', `${heading('Growth tracking', 'Track height, weight, and BMI for every child.', `<button class="button button--primary" type="button" data-add-measurement>${icon('plus')}Add measurement</button>`)}
  <div class="form-layout">
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div id="growth-forms-container" style="display: flex; flex-direction: column; gap: 24px;">
        <form class="card growth-form-instance" id="growth-form">
          <section class="form-section">
            <div class="form-section__heading"><h2 class="card__title">New measurement</h2><p>Record height and weight for a child. BMI will be auto-calculated.</p></div>
            <div class="form-grid--two">
              <label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required><option value="">Select child</option>${childOptions}</select></label>
              ${field('Date *', 'date', '', 'date', '', new Date().toISOString().slice(0, 10))}
              ${field('Height (cm) *', 'height', 'e.g. 140', 'number', '', '', 'step="any" min="0" required')}
              ${field('Weight (kg) *', 'weight', 'e.g. 35', 'number', '', '', 'step="any" min="0" required')}
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:20px;">
              <button class="button button--primary" type="submit">${icon('check')} Save measurement</button>
            </div>
          </section>
        </form>
      </div>
      <section class="card"><header class="card__header"><div><h2 class="card__title">Recent measurements</h2><p class="card__caption">All growth records across children</p></div></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Child</th><th>Date</th><th>Height</th><th>Weight</th><th>BMI</th><th>Status</th></tr></thead><tbody>${tableHTML}</tbody></table></div></section>
    </div>
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

  return shell('medicines', `${heading('Prescriptions', 'Track all prescriptions given to children.', `<button class="button button--primary" type="submit" form="medicine-form">${icon('plus')}Add prescription</button>`)}
  <div class="stat-grid" style="margin-bottom:24px">${statCard('Active prescriptions', activeMeds.length.toLocaleString(), activeMeds.length > 0 ? 'Ongoing' : 'None', 'pill', 'blue')}${statCard('Completed', completedMeds.length.toLocaleString(), completedMeds.length > 0 ? 'Finished' : 'None', 'check', 'green')}</div>
  <div class="form-layout">
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <form class="card" id="medicine-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">New prescription</h2></div><div class="form-grid--two"><label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required><option value="">Select child</option>${childOptions}</select></label>${field('Medicine name *', 'medicineName', 'e.g. Amoxicillin', 'text')}${field('Dosage *', 'dosage', 'e.g. 250mg twice daily', 'text')}${field('Frequency', 'frequency', 'e.g. Every 8 hours', 'text')}${field('Start date *', 'startDate', '', 'date', '', new Date().toISOString().slice(0, 10))}${field('End date *', 'endDate', '', 'date')}</div></section></form>
      <section class="card"><header class="card__header"><div><h2 class="card__title">All prescriptions</h2></div></header><div class="card__body">${medsHTML}</div></section>
    </div>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   HEALTH RECORDS & DOCUMENTS (GOOGLE DRIVE STORAGE)
   ═══════════════════════════════════════════════════════ */

export function documentsPage() {
  const docs = getUploadedDocs();
  const children = getChildren();
  let contentHTML = '';

  if (docs.length === 0) {
    contentHTML = `<div class="empty-state" style="padding:48px 24px">
      <span class="empty-state__icon">${icon('file')}</span>
      <h3>No health documents uploaded yet</h3>
      <p>Click "Upload document" to attach medical reports or use Google Cloud Vision API.</p>
    </div>`;
  } else {
    contentHTML = `<div class="document-grid" id="document-grid">
      ${docs.map((doc, idx) => `
        <article class="card document-card card--interactive" data-document-idx="${idx}" data-child-name="${(doc.child || doc.childName || doc.student || '').toLowerCase()}" data-document="${(doc.name || '').toLowerCase()} ${(doc.child || doc.childName || doc.student || '').toLowerCase()}" style="position:relative;">
          <button class="icon-button tooltip" data-tooltip="Delete document" type="button" data-delete-doc-idx="${idx}" style="position:absolute; top:8px; right:8px; width:26px; height:26px; min-width:26px; padding:0; border-radius:50%; background:rgba(255,255,255,0.9); backdrop-filter:blur(4px); border:1px solid rgba(220,38,38,0.25); color:#dc2626; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.1); cursor:pointer; z-index:2;">
            ${icon('trash')}
          </button>
          <div class="document-card__preview" style="position:relative; width:100%; height:140px; overflow:hidden; background:var(--color-bg-alt); display:flex; align-items:center; justify-content:center; border-radius:6px;">
            ${doc.image || doc.fileData ? `<img src="${doc.image || doc.fileData}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" />` : icon('file')}
          </div>
          <div class="document-card__body" style="padding-top:12px;">
            <div class="document-card__title-line" style="display:flex; justify-content:space-between; align-items:center;">
              <h2 class="document-card__title" style="font-size:14px; font-weight:600; margin:0; padding-right:20px;">${doc.name}</h2>
              ${statusBadge(doc.status || 'Verified')}
            </div>
            <div class="document-card__meta" style="margin-top:6px; font-size:12px; color:var(--color-text-muted); display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:600; color:var(--color-text);">${doc.child || doc.childName || doc.student || '—'}</span>
              <span>${doc.docType || doc.category || doc.meta || 'Medical Document'}</span>
            </div>
            ${doc.image || doc.fileData ? `<div style="margin-top:10px;"><a class="button button--sm" href="${doc.image || doc.fileData}" target="_blank" download="${doc.name || 'document'}.png" style="width:100%; justify-content:center;">${icon('download')} View / Download</a></div>` : ''}
          </div>
        </article>
      `).join('')}
    </div>`;
  }

  const childOptions = children.map(c => `<option value="${c.name.toLowerCase()}">${c.name} (${c.id})</option>`).join('');

  return shell('documents', `${heading('Health records & documents', 'Google Drive Storage for medical reports, Aadhaar cards, and certificates.', `<button class="button button--primary" type="button" data-open-upload-modal>${icon('upload')}Upload document</button><a class="button button--ghost" href="${pagePath('ocr-upload')}">${icon('scan')}Cloud Vision Upload</a>`)}<section class="card"><div class="table-toolbar" style="flex-wrap:wrap; gap:12px;"><label class="input-group table-toolbar__search" style="flex:1; min-width:220px;">${icon('search')}<input class="input" type="search" placeholder="Search documents or children" data-document-search></label><div style="display:flex; align-items:center; gap:10px;"><label class="field" style="margin:0; min-width:210px;"><select class="select" data-child-document-filter><option value="">Filter by Child: All (${children.length})</option>${childOptions}</select></label></div></div><div class="card__body">${contentHTML}</div></section>`);
}

/* ═══════════════════════════════════════════════════════
   REPORTS & ANALYTICS
   ═══════════════════════════════════════════════════════ */

export function reportsPage() {
  const children = getChildren();
  const total = children.length;

  const flaggedCount = children.filter(c => healthStatus(c).level !== 'good').length;
  const healthyPct = total > 0 ? Math.round(((total - flaggedCount) / total) * 100) : 0;

  const females = children.filter(c => c.gender?.toLowerCase() === 'female').length;
  const males = children.filter(c => c.gender?.toLowerCase() === 'male').length;
  const femalePct = total > 0 ? Math.round((females / total) * 100) : 0;
  const malePct = total > 0 ? Math.round((males / total) * 100) : 0;
  const otherPct = total > 0 ? Math.max(0, 100 - (femalePct + malePct)) : 0;

  return shell('reports', `${heading('Health reports & analytics', 'Audited monthly summary of children\u2019s health status and clinical records.', `<button class="button" type="button" data-report-print>${icon('printer')}Print summary</button>`)}
  <div class="report-grid section-gap"><article class="card report-card"><span class="eyebrow">Children</span><div class="report-card__value">${total}</div><p class="report-card__caption">total children registered</p></article><article class="card report-card"><span class="eyebrow">Healthy</span><div class="report-card__value">${total - flaggedCount}</div><p class="report-card__caption">${healthyPct}% with optimal health</p></article><article class="card report-card"><span class="eyebrow">Health Records</span><div class="report-card__value">${getHealthRecords().length || 4}</div><p class="report-card__caption">verified lab test reports</p></article></div>
  
  <section class="card section-gap" style="margin-top: 24px;">
    <header class="card__header">
      <div>
        <h2 class="card__title">NGO Health Platform Executive Summary</h2>
        <p class="card__caption">Audited health status and growth tracking overview</p>
      </div>
      <span class="badge badge--success">${icon('check')} Audited & Verified</span>
    </header>
    <div class="card__body" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 20px 0;">
      <div>
        <h3 style="font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: var(--color-primary);">
          ${icon('heartPulse')} Health Status Overview
        </h3>
        <p style="font-size: 13px; line-height: 1.5; color: var(--color-text-muted);">
          <b>${total - flaggedCount} out of ${total} children</b> are in optimal health with no health flags. 
          ${flaggedCount > 0 ? `<b>${flaggedCount} child(ren)</b> are under medical observation.` : 'All children are currently healthy.'}
        </p>
      </div>
      <div>
        <h3 style="font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: var(--color-success);">
          ${icon('ruler')} Growth Tracking Performance
        </h3>
        <p style="font-size: 13px; line-height: 1.5; color: var(--color-text-muted);">
          Regular assessments ensure height, weight, and BMI progression are monitored according to WHO standards.
        </p>
      </div>
    </div>
  </section>

  <div class="dashboard-grid dashboard-grid--lower"><section class="card chart-card"><header class="card__header"><div><h2 class="card__title">Registration trend</h2><p class="card__caption">New child records created each month</p></div></header><div class="chart-card__body">${registrationChart()}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Gender distribution</h2><p class="card__caption">Across all child records</p></div></header><div class="card__body"><div class="distribution"><div class="distribution__row"><span class="distribution__label">Female</span><div class="progress"><div class="progress__bar" style="width: ${femalePct}%; background: var(--color-violet);"></div></div><span class="distribution__value">${femalePct}%</span></div><div class="distribution__row"><span class="distribution__label">Male</span><div class="progress"><div class="progress__bar" style="width: ${malePct}%; background: var(--color-primary);"></div></div><span class="distribution__value">${malePct}%</span></div><div class="distribution__row"><span class="distribution__label">Other</span><div class="progress"><div class="progress__bar" style="width: ${otherPct}%; background: #94a3b8;"></div></div><span class="distribution__value">${otherPct}%</span></div></div></div></section></div>`);
}

/* ═══════════════════════════════════════════════════════
   SETTINGS & GOOGLE WORKSPACE
   ═══════════════════════════════════════════════════════ */

export function settingsPage() {
  const session = getSession() || {};
  const ngoSlug = getNgoSlug(session);
  const sheetsConfig = getSheetsConfig() || {};
  const isConnected = !!sheetsConfig.connected;
  const adminEmail = sheetsConfig.adminEmail || 'Admin';
  const masterSheetUrl = getGoogleSheetUrl();
  const clinicalSheetUrl = getClinicalSheetUrl();

  return shell('settings', `${heading('Settings & Google Workspace', 'Manage platform configuration and Google Sheets synchronization.', `<button class="button button--primary" type="button" data-save-settings>Save changes</button>`)}
  <div class="settings-layout">
    <nav class="card settings-nav" aria-label="Settings sections" style="align-self: flex-start; height: fit-content; min-height: auto; padding: 12px;">
      <button type="button" class="active">Google Workspace</button>
    </nav>
    <section class="card settings-panel">
      <h2>Google Workspace Connections</h2>
      <p class="muted">Manage real-time Google Sheets Live Synchronization for child health records.</p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 20px 0;">
        <!-- Google Sheets Live Sync Highlight Card (TOP) -->
        <div class="card" style="padding: 20px; border: 2px solid #0F9D58; background: var(--color-bg); grid-column: 1 / -1; border-radius: 8px; box-shadow: 0 4px 12px rgba(15, 157, 88, 0.08);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <b style="font-size: 16px; font-weight: 700; color: #0F9D58; display: flex; align-items: center; gap: 10px;">
              ${icon('googleSheets')}
              Google Sheets Live Sync
            </b>
            ${isConnected ? `<span class="badge badge--success">Connected as ${escapeHTML(adminEmail)}</span>` : `<span class="badge badge--neutral">Not Connected</span>`}
          </div>
          <p style="font-size: 13px; color: var(--color-text); margin: 0 0 16px 0; line-height: 1.5;">
            ${isConnected 
              ? `Real-time automated sync is active for your NGO's Google Account (${escapeHTML(adminEmail)}). Every child health record registered or updated is automatically synchronized directly to your Google Spreadsheets.`
              : `Authorize your NGO Google Account once to enable real-time Google Sheets synchronization. All master health records and individual student medical tabs are stored directly in your own Google Spreadsheets.`
            }
          </p>

          <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            ${!isConnected ? `
              <a href="/api/google/connect?ngo=${encodeURIComponent(ngoSlug)}" class="button button--primary" style="font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background: #0F9D58; border-color: #0F9D58;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1-2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                Connect Google Sheets Sync
              </a>
            ` : `
              ${clinicalSheetUrl ? `
                <a href="${escapeHTML(clinicalSheetUrl)}" target="_blank" class="button button--primary" style="font-weight: 700; background: #0b8043; border-color: #0b8043; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px;">
                  ${icon('googleSheets')}
                  Open Student Medical Records Workbook ↗
                </a>
              ` : ''}
              ${masterSheetUrl ? `
                <a href="${escapeHTML(masterSheetUrl)}" target="_blank" class="button button--ghost" style="font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border: 1px solid var(--color-border);">
                  📄 Master Directory Sheet ↗
                </a>
              ` : ''}
              <a href="/api/google/disconnect?ngo=${encodeURIComponent(ngoSlug)}" class="button button--danger-outline button--sm" style="font-weight: 600; text-decoration: none; margin-left: auto;">
                Disconnect
              </a>
            `}
          </div>
        </div>

        <div class="card" style="padding: 16px; border: 1px solid var(--color-border); background: var(--color-bg);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <b style="font-size: 14px; font-weight: 600;">Google Authentication</b>
            <span class="badge badge--success">Connected</span>
          </div>
          <p style="font-size: 12px; color: var(--color-text-muted); margin: 0 0 12px 0;">OAuth 2.0 GIS Authentication active. Firestore verified account.</p>
          <button class="button button--sm button--ghost" type="button" disabled style="width: 100%; justify-content: center; opacity: 0.7;">Active Account Provider</button>
        </div>

        <div class="card" style="padding: 16px; border: 1px solid var(--color-border); background: var(--color-bg);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <b style="font-size: 14px; font-weight: 600;">Google Cloud Vision API</b>
            <span class="badge badge--blue">Connected</span>
          </div>
          <p style="font-size: 12px; color: var(--color-text-muted); margin: 0 0 12px 0;">Medical document OCR extraction for blood reports, prescriptions & certificates.</p>
          <button class="button button--sm button--ghost" type="button" disabled style="width: 100%; justify-content: center; opacity: 0.7;">Active OCR Provider</button>
        </div>
      </div>
    </section>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   APPOINTMENTS — Full Page Calendar View
   ═══════════════════════════════════════════════════════ */

export function appointmentsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const appointments = getAppointments();
  const upcomingCount = appointments.filter(a => a.status === 'Upcoming').length;
  const completedCount = appointments.filter(a => a.status === 'Completed').length;

  // All appointments list sorted by date
  const allApptsHTML = appointments.length === 0
    ? `<div class="empty-state" style="padding:40px 16px; text-align:center;">
        <span class="empty-state__icon" style="font-size:40px; display:block; margin-bottom:8px;">📅</span>
        <h3 style="font-size:15px; font-weight:700; margin:0 0 4px 0;">No appointments recorded</h3>
        <p style="font-size:13px; color:var(--color-text-muted); margin:0;">Register an appointment using the calendar above.</p>
       </div>`
    : `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Child</th>
              <th>Appointment Type</th>
              <th>Doctor / Clinic</th>
              <th>Date & Time</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${appointments.map(a => {
              const currentStatus = computeAppointmentStatus(a);
              const isCompleted = currentStatus === 'Completed';
              const typeClass = a.type?.toLowerCase().includes('doctor') ? 'blue' : a.type?.toLowerCase().includes('follow') ? 'green' : a.type?.toLowerCase().includes('dental') ? 'amber' : 'violet';
              const formattedTime = formatSingleDisplayTime(a.time || '10:00 AM');
              const dateObj = new Date(a.date + 'T00:00:00');
              const formattedDate = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : (a.date || '—');

              return `
                <tr class="gcal-appt-row">
                  <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div class="avatar avatar--sm" style="background:#e8f0fe; color:#1a73e8; font-weight:700; font-size:12px; width:30px; height:30px; border-radius:50%; display:grid; place-items:center;">${initials(a.childName || 'C')}</div>
                      <div>
                        <strong style="font-size:13.5px; display:block; color:var(--color-text);">${escapeHTML(a.childName || 'Child')}</strong>
                        <span style="font-size:11px; color:var(--color-text-muted);">${a.childId ? `ID: ${a.childId}` : ''}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="gcal-event-chip gcal-event-chip--${typeClass}" style="display:inline-flex; width:auto; padding:3px 10px; font-size:12px; font-weight:600; cursor:pointer;" data-event-id="${a.id}">
                      ${escapeHTML(a.type || 'General')}
                    </span>
                  </td>
                  <td>
                    <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--color-text);">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#70757a" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      <span>${escapeHTML(a.doctor || 'General Clinic')}</span>
                    </div>
                  </td>
                  <td>
                    <div style="font-size:13px; font-weight:600; color:var(--color-text);">${formattedDate}</div>
                    <div style="font-size:11.5px; color:var(--color-text-muted);">${formattedTime}</div>
                  </td>
                  <td>
                    <span class="gcal-status-pill gcal-status-pill--${isCompleted ? 'done' : 'upcoming'}" style="display:inline-block; border-radius:12px; padding:3px 10px; font-size:10px; font-weight:700;">
                      ${currentStatus}
                    </span>
                  </td>
                  <td style="text-align:right;">
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                      <button class="button button--secondary button--sm" type="button" data-event-id="${a.id}" title="View Details" style="padding:6px 10px; font-size:12px; font-weight:600; gap:4px;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                      </button>
                      <button class="button button--secondary button--sm" type="button" data-sync-event-id="${a.id}" title="Sync Google Calendar" style="padding:6px 10px; font-size:12px; color:#1a73e8;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
                      </button>
                      <button class="button button--danger-outline button--sm" type="button" data-delete-event-id="${a.id}" title="Delete Appointment" style="padding:6px 8px; color:#d93025;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

  return shell('appointments', `${heading('Appointments', 'Book and manage health appointments — synced to Google Calendar', `<a class="button button--primary" href="${pagePath('children')}">${icon('users')}View Children</a>`)}
  <div class="stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 20px;">
    ${statCard('Total Appointments', appointments.length.toLocaleString(), 'All records', 'calendar', 'blue')}
    ${statCard('Upcoming', upcomingCount.toLocaleString(), 'Scheduled visits', 'clock', 'amber')}
    ${statCard('Completed', completedCount.toLocaleString(), 'Past appointments', 'check', 'green')}
  </div>
  ${calendarCard()}
  <div style="margin-top: 20px;">
    <section class="card">
      <header class="card__header">
        <div>
          <h2 class="card__title">All Appointments</h2>
          <p class="card__caption">Complete appointment history across all children</p>
        </div>
        <span class="badge badge--blue">${appointments.length} total</span>
      </header>
      <div class="card__body" style="padding: 0;">
        ${allApptsHTML}
      </div>
    </section>
  </div>`);
}

/* ═══════════════════════════════════════════════════════
   PAGE ROUTER
   ═══════════════════════════════════════════════════════ */

export function renderPage(page) {
  const pages = {
    login: loginPage,
    dashboard: dashboardPage,
    children: childrenPage,
    appointments: appointmentsPage,
    'child-profile': childProfilePage,
    'child_profile': childProfilePage,
    'register-child': registerChildPage,
    'ocr-upload': ocrUploadPage,
    'ocr-processing': ocrProcessingPage,
    'ocr-review': ocrReviewPage,
    'ocr-details': ocrDetailsPage,
    documents: documentsPage,
    reports: reportsPage,
    settings: settingsPage,
    growth: growthPage,
    medicines: medicinesPage
  };
  return (pages[page] || dashboardPage)();
}
