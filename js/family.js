/**
 * family.js
 * The screens of a family space: an overview, the family members, one member's
 * health profile, the add/edit member form, and their reports and documents.
 *
 * A family member is stored like a child record, so these pages read the same
 * collections and use the same actions (data-edit, data-delete, the upload and
 * checkup forms) as the children's home screens. Each function returns the page
 * content; renderPage in router.js wraps it in the app shell.
 */

import { icon, initials, pagePath, escapeHTML, formatDate } from './utils.js';
import { getChildren, getChild, getUploadedDocs, getAppointments, getGrowthRecords, getHealthRecords, calculateAge } from './storage.js';
import { heading, statCard, formatDateForInput, getURLParam, getDynamicGreeting } from './ui.js';
import { clinicalSectionHTML } from './clinicalSection.js';
import { computeAppointmentStatus, formatSingleDisplayTime } from './googleCalendar.js';
import { personLabel, RELATIONS } from './space.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/* ─── Helpers ─── */

/** A member's documents: matched by ID, or by name for uploads that carry only a name. */
function documentsFor(member) {
  const name = (member.name || '').toLowerCase();
  return getUploadedDocs().filter(d =>
    d.childId === member.id ||
    (d.childName && d.childName.toLowerCase() === name) ||
    (d.child && d.child.toLowerCase() === name)
  );
}

/** "Mother · 58 years" */
function memberSubtitle(member) {
  const age = calculateAge(member.dob);
  return [member.relation, age ? `${age}` : ''].filter(Boolean).join(' · ') || 'Family member';
}

/** Appointments that have not happened yet, soonest first. */
function upcomingAppointments() {
  return getAppointments()
    .filter(a => computeAppointmentStatus(a) !== 'Completed')
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

function avatar(name, size = 44) {
  return `<span aria-hidden="true" style="display:grid; place-items:center; flex:0 0 ${size}px; width:${size}px; height:${size}px; border-radius:50%; background:var(--color-primary-soft, #eef2ff); color:var(--color-primary); font-weight:700; font-size:${Math.round(size * 0.36)}px;">${initials(name)}</span>`;
}

function emptyState(glyph, title, text, action = '') {
  return `<div class="empty-state" style="padding:36px 24px;"><span class="empty-state__icon">${icon(glyph)}</span><h3>${title}</h3><p>${text}</p>${action ? `<div style="margin-top:16px;">${action}</div>` : ''}</div>`;
}

const addMemberButton = (label = 'Add family member') => `<a class="button button--primary" href="${pagePath('register-child')}">${icon('plus')}${label}</a>`;

/** One report or document, with its Google Drive link and a delete button. */
function documentCard(doc) {
  const inDrive = !!doc.driveUrl;
  return `
    <article class="card document-card" style="position:relative;">
      <button class="icon-button tooltip" data-tooltip="Delete document" type="button" data-delete-doc-id="${escapeHTML(doc.id || '')}" style="position:absolute; top:8px; right:8px; width:26px; height:26px; min-width:26px; padding:0; border-radius:50%; background:rgba(255,255,255,0.9); border:1px solid rgba(220,38,38,0.25); color:#dc2626; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:2;">
        ${icon('trash')}
      </button>
      <div class="document-card__body" style="padding:16px;">
        <h3 style="font-size:14px; font-weight:600; margin:0 0 8px; padding-right:28px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(doc.name || doc.title || 'Report')}</h3>
        <div class="detail-list detail-list--single" style="font-size:13px;">
          <div class="detail-row"><span>Type</span><b>${escapeHTML(doc.docType || doc.category || 'Report')}</b></div>
          <div class="detail-row"><span>Added</span><b>${escapeHTML(doc.uploadDate || formatDate(doc.timestamp) || 'Recently')}</b></div>
        </div>
        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
          ${inDrive
            ? `<a class="button button--sm button--primary" href="${escapeHTML(doc.driveUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:6px;">${icon('external')} Open in Drive</a>`
            : `<span class="badge" style="background:#f1f3f4; color:#5f6368; border:1px solid #dadce0;">Not in Drive yet</span>`}
          ${!inDrive && (doc.fileData || doc.image) ? `<button class="button button--sm button--ghost" type="button" data-sync-doc-id="${escapeHTML(doc.id)}" style="display:inline-flex; align-items:center; gap:6px;">${icon('refresh')} Save to Drive</button>` : ''}
        </div>
      </div>
    </article>`;
}

function documentGrid(docs) {
  return `<div class="document-grid">${docs.map(documentCard).join('')}</div>`;
}

function appointmentList(appointments) {
  if (appointments.length === 0) {
    return emptyState('calendar', 'Nothing coming up', 'Appointments you book will appear here.', `<a class="button" href="${pagePath('appointments')}">${icon('calendar')}Book an appointment</a>`);
  }
  return `<div class="detail-list detail-list--single">${appointments.map(a => `
    <div class="detail-row">
      <span><b style="color:var(--color-text);">${escapeHTML(personLabel(a.childName) || 'Family member')}</b><br><span style="font-size:12px;">${escapeHTML(a.type || 'Appointment')}${a.doctor ? ` · ${escapeHTML(a.doctor)}` : ''}</span></span>
      <b>${escapeHTML(formatDate(a.date) || a.date || '')}<br><span style="font-size:12px; font-weight:500; color:var(--color-text-muted);">${escapeHTML(formatSingleDisplayTime(a.time || '10:00 AM'))}</span></b>
    </div>`).join('')}</div>`;
}

/* ─── Overview ─── */

export function familyOverviewContent() {
  const members = getChildren();
  const docs = getUploadedDocs();
  const upcoming = upcomingAppointments();
  const checkups = getGrowthRecords().length + getHealthRecords().length;
  const recentDocs = [...docs].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 6);

  const membersHTML = members.length === 0
    ? emptyState('users', 'Add the people in your family', 'Start with yourself, then add parents, a spouse or children. Each person gets their own health profile.', addMemberButton())
    : `<div class="document-grid">${members.map(m => `
        <a class="card document-card card--interactive" href="${pagePath('child-profile')}?id=${encodeURIComponent(m.id)}" style="text-decoration:none; color:inherit;">
          <div class="document-card__body" style="padding:16px; display:flex; gap:12px; align-items:center;">
            ${avatar(m.name)}
            <div style="min-width:0;">
              <h3 style="font-size:15px; font-weight:700; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(m.name)}</h3>
              <p style="font-size:12.5px; color:var(--color-text-muted); margin:2px 0 6px;">${escapeHTML(memberSubtitle(m))}</p>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${m.blood ? `<span class="badge badge--blue">${escapeHTML(m.blood)}</span>` : ''}
                <span class="badge badge--neutral">${documentsFor(m).length} report${documentsFor(m).length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
        </a>`).join('')}</div>`;

  return `${heading(getDynamicGreeting(), 'Your family’s health records, reports and appointments, in one place.', `<button class="button" type="button" data-open-upload-modal>${icon('upload')}Upload a report</button>${addMemberButton()}`)}
  <div class="stat-grid">
    ${statCard('Family members', members.length.toLocaleString(), 'users', 'blue')}
    ${statCard('Reports & documents', docs.length.toLocaleString(), 'file', 'cyan')}
    ${statCard('Upcoming appointments', upcoming.length.toLocaleString(), 'calendar', 'amber')}
    ${statCard('Checkups & tests', checkups.toLocaleString(), 'heartPulse', 'violet')}
  </div>
  <section class="card" style="margin-top:20px;">
    <header class="card__header"><div><h2 class="card__title">Family members</h2><p class="card__caption">Open a profile to see reports, checkups and blood tests</p></div>${members.length ? `<a class="button button--sm" href="${pagePath('children')}">Manage</a>` : ''}</header>
    <div class="card__body">${membersHTML}</div>
  </section>
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px; margin-top:20px;">
    <section class="card">
      <header class="card__header"><div><h2 class="card__title">Recent reports</h2><p class="card__caption">The latest reports and documents added</p></div><a class="button button--sm" href="${pagePath('documents')}">All reports</a></header>
      <div class="card__body">${recentDocs.length === 0
        ? emptyState('file', 'No reports yet', 'Upload a lab report, prescription or scan and it is saved to your Google Drive.')
        : `<div class="detail-list detail-list--single">${recentDocs.map(d => `
            <div class="detail-row">
              <span><b style="color:var(--color-text);">${escapeHTML(d.name || 'Report')}</b><br><span style="font-size:12px;">${escapeHTML(d.childName || d.child || '')}${d.docType ? ` · ${escapeHTML(d.docType)}` : ''}</span></span>
              ${d.driveUrl ? `<a class="button button--sm button--ghost" href="${escapeHTML(d.driveUrl)}" target="_blank" rel="noopener noreferrer">${icon('external')}Open</a>` : `<b style="font-size:12px; color:var(--color-text-muted);">Not in Drive yet</b>`}
            </div>`).join('')}</div>`}</div>
    </section>
    <section class="card">
      <header class="card__header"><div><h2 class="card__title">Upcoming appointments</h2><p class="card__caption">Doctor visits and tests that are coming up</p></div><a class="button button--sm" href="${pagePath('appointments')}">Calendar</a></header>
      <div class="card__body">${appointmentList(upcoming.slice(0, 6))}</div>
    </section>
  </div>`;
}

/* ─── Family members ─── */

export function familyMembersContent() {
  const members = getChildren();
  const cards = members.map(m => {
    const docsCount = documentsFor(m).length;
    const health = [m.medicalConditions, m.allergies ? `Allergies: ${m.allergies}` : ''].filter(Boolean).join(' · ');
    return `
      <article class="card document-card">
        <div class="document-card__body" style="padding:18px;">
          <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
            ${avatar(m.name, 48)}
            <div style="min-width:0;">
              <h3 style="font-size:16px; font-weight:700; margin:0;">${escapeHTML(m.name)}</h3>
              <p style="font-size:12.5px; color:var(--color-text-muted); margin:2px 0 0;">${escapeHTML(memberSubtitle(m))}</p>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
            ${m.gender ? `<span class="badge badge--neutral">${escapeHTML(m.gender)}</span>` : ''}
            ${m.blood ? `<span class="badge badge--blue">Blood ${escapeHTML(m.blood)}</span>` : ''}
            <span class="badge badge--neutral">${docsCount} report${docsCount === 1 ? '' : 's'}</span>
          </div>
          <p style="font-size:12.5px; color:var(--color-text-muted); margin:0 0 14px; min-height:18px;">${escapeHTML(health) || 'No conditions or allergies noted'}</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <a class="button button--sm button--primary" href="${pagePath('child-profile')}?id=${encodeURIComponent(m.id)}">${icon('eye')}Open profile</a>
            <button class="button button--sm" type="button" data-open-upload-modal data-person-name="${escapeHTML(m.name)}">${icon('upload')}Upload</button>
            <button class="icon-button icon-button--small tooltip" data-tooltip="Edit" type="button" aria-label="Edit ${escapeHTML(m.name)}" data-edit="${escapeHTML(m.id)}">${icon('pencil')}</button>
            <button class="icon-button icon-button--small tooltip" data-tooltip="Remove" type="button" aria-label="Remove ${escapeHTML(m.name)}" data-delete="${escapeHTML(m.id)}">${icon('trash')}</button>
          </div>
        </div>
      </article>`;
  }).join('');

  return `${heading('Family members', 'Everyone whose health records you keep here.', addMemberButton())}
  <section class="card">
    <div class="card__body">${members.length === 0
      ? emptyState('users', 'No family members yet', 'Add yourself and the people in your family to keep their health records together.', addMemberButton())
      : `<div class="document-grid">${cards}</div>`}</div>
  </section>`;
}

/* ─── One member's health profile ─── */

const PROFILE_TABS = ['documents', 'clinical', 'overview'];

export function familyMemberContent() {
  const member = getChild(getURLParam('id'));
  if (!member) {
    return `<div class="card"><div class="card__body">${emptyState('users', 'This person is not in your family space', 'They may have been removed.', `<a class="button" href="${pagePath('children')}">Family members</a>`)}</div></div>`;
  }

  const age = calculateAge(member.dob);
  const docs = documentsFor(member);
  const growth = getGrowthRecords(member.id);
  const healthRecs = getHealthRecords(member.id);
  const latestCheckup = growth[0] || {};
  const latestBlood = healthRecs[0] || {};
  const saved = sessionStorage.getItem('chm_active_profile_tab');
  const activeTab = PROFILE_TABS.includes(saved) ? saved : 'documents';
  const show = tab => (activeTab === tab ? 'display: block;' : 'display: none;');
  const row = (label, value) => `<div class="detail-row"><span>${label}</span><b>${escapeHTML(value || '') || '—'}</b></div>`;

  const documentsPanel = `
    <section class="card">
      <header class="card__header" style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div><h2 class="card__title">Reports &amp; documents</h2><p class="card__caption">Lab reports, prescriptions and scans for ${escapeHTML(member.name)}, saved to your Google Drive</p></div>
        <button class="button button--primary button--sm" type="button" data-upload-profile-doc="${escapeHTML(member.id)}" data-child-name="${escapeHTML(member.name)}">${icon('upload')} Upload a report</button>
      </header>
      <div class="card__body">${docs.length === 0
        ? emptyState('file', 'No reports yet', `Upload ${escapeHTML(member.name)}’s lab reports, prescriptions or scans to keep them in one place.`)
        : documentGrid(docs)}</div>
    </section>`;

  const overviewPanel = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
      <section class="card">
        <header class="card__header"><div><h2 class="card__title">Details</h2><p class="card__caption">Personal and health information</p></div><button class="icon-button icon-button--small" type="button" data-edit="${escapeHTML(member.id)}" aria-label="Edit details">${icon('pencil')}</button></header>
        <div class="card__body"><div class="detail-list">
          ${row('Full name', member.name)}
          ${row('Relation', member.relation)}
          ${row('Date of birth', member.dob ? formatDate(member.dob) : '')}
          ${row('Age', age)}
          ${row('Gender', member.gender)}
          ${row('Blood group', member.blood)}
          ${row('Phone', member.phone)}
          ${row('Email', member.email)}
          ${row('Medical conditions', member.medicalConditions)}
          ${row('Allergies', member.allergies)}
          ${row('Current medicines', member.medications)}
          ${row('Notes', member.notes)}
        </div></div>
      </section>
      <section class="card">
        <header class="card__header"><div><h2 class="card__title">Latest readings</h2><p class="card__caption">From the most recent checkup and blood test</p></div><button class="button button--sm" type="button" data-switch-profile-tab="clinical">${icon('plus')}Add</button></header>
        <div class="card__body"><div class="detail-list">
          ${row('Checkup date', latestCheckup.date ? formatDate(latestCheckup.date) : '')}
          ${row('Blood pressure', latestCheckup.bp)}
          ${row('Weight', latestCheckup.weight ? `${latestCheckup.weight} kg` : '')}
          ${row('Pulse', latestCheckup.pulse ? `${latestCheckup.pulse} bpm` : '')}
          ${row('SpO2', latestCheckup.spo2 ? `${latestCheckup.spo2} %` : '')}
          ${row('Temperature', latestCheckup.temperature ? `${latestCheckup.temperature} °F` : '')}
          ${row('Blood test date', latestBlood.date ? formatDate(latestBlood.date) : '')}
          ${row('Haemoglobin', latestBlood.hemoglobin ? `${latestBlood.hemoglobin} g/dL` : '')}
          ${row('Platelets', latestBlood.platelets ? `${latestBlood.platelets} Lakhs` : '')}
        </div></div>
      </section>
    </div>`;

  return `${heading('Health profile', `Everything about ${escapeHTML(member.name)}’s health in one place.`, `<button class="button" type="button" data-open-child-sheet="${escapeHTML(member.id)}" data-child-name="${escapeHTML(member.name)}" style="display:inline-flex; align-items:center; gap:8px;">${icon('googleSheets')}Open Google Sheet</button><button class="button button--primary" type="button" data-edit="${escapeHTML(member.id)}">${icon('pencil')}Edit details</button>`)}
  <section class="card">
    <div class="profile-header">
      ${avatar(member.name, 64)}
      <div class="profile-header__copy">
        <h1>${escapeHTML(member.name)}</h1>
        <p>${escapeHTML(memberSubtitle(member))}</p>
        <div class="profile-header__meta">
          ${member.gender ? `<span class="badge badge--neutral">${escapeHTML(member.gender)}</span>` : ''}
          ${member.blood ? `<span class="badge badge--blue">Blood: ${escapeHTML(member.blood)}</span>` : ''}
          ${member.allergies ? `<span class="badge badge--warning">Allergies: ${escapeHTML(member.allergies)}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="profile-tabs">
      <div class="tabs" role="tablist">
        <button class="tab ${activeTab === 'documents' ? 'tab--active' : ''}" type="button" data-profile-tab="documents">Reports &amp; documents (${docs.length})</button>
        <button class="tab ${activeTab === 'clinical' ? 'tab--active' : ''}" type="button" data-profile-tab="clinical">Checkups &amp; tests</button>
        <button class="tab ${activeTab === 'overview' ? 'tab--active' : ''}" type="button" data-profile-tab="overview">Details</button>
      </div>
    </div>
  </section>
  <div class="profile-tab-content-container" style="margin-top: 20px;">
    <div data-tab-panel="documents" style="${show('documents')}">${documentsPanel}</div>
    <div data-tab-panel="clinical" style="${show('clinical')}">${clinicalSectionHTML(member, growth, healthRecs)}</div>
    <div data-tab-panel="overview" style="${show('overview')}">${overviewPanel}</div>
  </div>`;
}

/* ─── Add or edit a family member ─── */

export function familyMemberFormContent() {
  const editId = getURLParam('edit');
  const member = editId ? getChild(editId) : null;
  const parts = (member?.name || '').split(/\s+/);
  const value = key => escapeHTML(member?.[key] || '');
  const input = (label, name, val, type = 'text', extra = '') =>
    `<label class="field"><span class="field__label">${label}</span><input class="input" name="${name}" type="${type}" value="${val}" ${extra}></label>`;
  const select = (label, name, options, current, required = false) =>
    `<label class="field"><span class="field__label">${label}</span><select class="input" name="${name}" ${required ? 'required' : ''}><option value="" ${current ? '' : 'selected'} ${required ? 'disabled' : ''}>Select</option>${options.map(o => `<option value="${o}" ${o === current ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  const textarea = (label, name, placeholder) =>
    `<label class="field form-span-all"><span class="field__label">${label}</span><textarea class="textarea" name="${name}" placeholder="${placeholder}">${value(name)}</textarea></label>`;

  const cancelHref = member ? `${pagePath('child-profile')}?id=${encodeURIComponent(member.id)}` : pagePath('children');
  const title = member ? `Edit ${escapeHTML(member.name)}` : 'Add family member';

  return `${heading(title, 'Fields marked with an asterisk are required.', `<a class="button button--ghost" href="${cancelHref}">Cancel</a><button class="button button--primary" form="child-form" type="submit">${member ? 'Save changes' : 'Add to family'}</button>`)}
  <div class="form-layout"><form class="card" id="child-form">${member ? `<input type="hidden" name="id" value="${escapeHTML(member.id)}">` : ''}
    <section class="form-section"><div class="form-section__heading"><h2 class="card__title">About them</h2><p>Who they are and how they are related to you.</p></div>
      <div class="form-grid--two">
        ${input('First name *', 'firstName', escapeHTML(parts[0] || ''), 'text', 'required placeholder="e.g. Asha"')}
        ${input('Last name', 'lastName', escapeHTML(parts.slice(1).join(' ')), 'text', 'placeholder="e.g. Pandya"')}
        ${select('Relation *', 'relation', RELATIONS, member?.relation || '', true)}
        ${input('Date of birth', 'birthDate', member ? formatDateForInput(member.dob) : '', 'date')}
        ${select('Gender *', 'gender', ['Male', 'Female', 'Other'], member?.gender || '', true)}
        ${select('Blood group', 'blood', BLOOD_GROUPS, member?.blood || '')}
        ${input('Phone', 'phone', value('phone'), 'tel', 'placeholder="+91 00000 00000"')}
        ${input('Email', 'email', value('email'), 'email', 'placeholder="name@example.com"')}
      </div>
    </section>
    <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Health</h2><p>Anything a doctor should know.</p></div>
      <div class="form-grid--two">
        ${textarea('Medical conditions', 'medicalConditions', 'e.g. Diabetes, High blood pressure')}
        ${textarea('Allergies', 'allergies', 'e.g. Penicillin, Peanuts')}
        ${textarea('Current medicines', 'medications', 'e.g. Metformin 500 mg twice a day')}
        ${textarea('Notes', 'notes', 'Anything else worth remembering')}
      </div>
    </section>
  </form></div>`;
}

/* ─── Reports and documents for the whole family ─── */

export function familyDocumentsContent() {
  const members = getChildren();
  const docs = getUploadedDocs();
  const unsynced = docs.filter(d => !d.driveUrl && (d.fileData || d.image)).length;
  const claimed = new Set(); // IDs of documents shown under a member

  const sections = members.map(m => {
    const own = documentsFor(m);
    own.forEach(d => claimed.add(d.id));
    return `
      <section class="card" style="margin-bottom:20px;">
        <header class="card__header" style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div style="display:flex; gap:12px; align-items:center;">${avatar(m.name, 36)}<div><h2 class="card__title">${escapeHTML(m.name)}</h2><p class="card__caption">${escapeHTML(memberSubtitle(m))} · ${own.length} report${own.length === 1 ? '' : 's'}</p></div></div>
          <button class="button button--sm" type="button" data-open-upload-modal data-person-name="${escapeHTML(m.name)}">${icon('upload')}Upload</button>
        </header>
        <div class="card__body">${own.length === 0 ? `<p style="margin:0; font-size:13px; color:var(--color-text-muted);">No reports for ${escapeHTML(m.name)} yet.</p>` : documentGrid(own)}</div>
      </section>`;
  }).join('');

  const others = docs.filter(d => !claimed.has(d.id));
  const otherSection = others.length === 0 ? '' : `
    <section class="card" style="margin-bottom:20px;">
      <header class="card__header"><div><h2 class="card__title">Other documents</h2><p class="card__caption">Not linked to a family member</p></div></header>
      <div class="card__body">${documentGrid(others)}</div>
    </section>`;

  const actions = `<button class="button button--primary" type="button" data-open-upload-modal>${icon('upload')}Upload a report</button>${unsynced > 0 ? `<button class="button button--ghost" type="button" data-auto-sync-drive style="display:inline-flex; align-items:center; gap:6px;">${icon('refresh')}Save ${unsynced} to Drive</button>` : ''}`;

  if (members.length === 0 && docs.length === 0) {
    return `${heading('Reports & documents', 'Reports for everyone in your family, saved to your Google Drive.', actions)}
    <section class="card"><div class="card__body">${emptyState('file', 'Add a family member first', 'Reports are kept per person, so start by adding someone.', addMemberButton())}</div></section>`;
  }
  return `${heading('Reports & documents', 'Reports for everyone in your family, saved to your Google Drive.', actions)}${sections}${otherSection}`;
}
