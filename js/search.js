import { icon, initials, pagePath, escapeHTML } from './utils.js';
import { getChildren, calculateAge, getAppointments, getAlerts, healthStatus } from './storage.js';

export function searchChildren(query = '') {
  const term = query.trim().toLowerCase();
  const children = getChildren();
  if (!term) return children;
  return children.filter((child) => 
    Object.values(child).some((value) => String(value).toLowerCase().includes(term))
  );
}

export function searchAppointments(query = '') {
  const term = query.trim().toLowerCase();
  const appointments = getAppointments();
  if (!term) return appointments.slice(0, 4);
  return appointments.filter(a => 
    (a.childName && a.childName.toLowerCase().includes(term)) ||
    (a.type && a.type.toLowerCase().includes(term)) ||
    (a.doctor && a.doctor.toLowerCase().includes(term)) ||
    (a.notes && a.notes.toLowerCase().includes(term)) ||
    (a.date && a.date.includes(term))
  );
}

export function searchAlerts(query = '') {
  const term = query.trim().toLowerCase();
  const alerts = getAlerts().filter(a => !a.dismissed);
  if (!term) return alerts.slice(0, 3);
  return alerts.filter(a =>
    (a.childName && a.childName.toLowerCase().includes(term)) ||
    (a.message && a.message.toLowerCase().includes(term)) ||
    (a.type && a.type.toLowerCase().includes(term))
  );
}

export function getQuickCommands(query = '') {
  const term = query.trim().toLowerCase();
  const commands = [
    {
      id: 'cmd-register',
      title: 'Register New Student',
      subtitle: 'Enroll child with Aadhaar, parent details & vitals',
      iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>',
      badge: 'Create',
      url: `${pagePath('register-child')}`,
      actionType: 'navigate'
    },
    {
      id: 'cmd-calendar',
      title: 'Google Calendar & Health Camps',
      subtitle: 'Schedule medical checkups, dental visits & vaccinations',
      iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      badge: 'Calendar',
      url: `${pagePath('appointments')}`,
      actionType: 'navigate'
    },
    {
      id: 'cmd-growth',
      title: 'Growth & BMI Analytics',
      subtitle: 'WHO percentile charts, height/weight tracking',
      iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
      badge: 'Analytics',
      url: `${pagePath('growth')}`,
      actionType: 'navigate'
    },
    {
      id: 'cmd-ocr',
      title: 'Upload Health Documents (OCR)',
      subtitle: 'Smart auto-extraction for immunization cards & lab tests',
      iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
      badge: 'OCR AI',
      url: `${pagePath('ocr-upload')}`,
      actionType: 'navigate'
    },
    {
      id: 'cmd-medicines',
      title: 'Medicine Inventory & Logs',
      subtitle: 'Stock tracking, dosage schedules & alerts',
      iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>',
      badge: 'Inventory',
      url: `${pagePath('medicines')}`,
      actionType: 'navigate'
    },
    {
      id: 'cmd-sheets',
      title: 'Sync with Google Sheets',
      subtitle: 'Two-way live spreadsheet synchronization',
      iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>',
      badge: 'Google Sheets',
      url: '#sync-sheets',
      actionType: 'sheets-modal'
    }
  ];

  if (!term) return commands;
  return commands.filter(c => 
    c.title.toLowerCase().includes(term) ||
    c.subtitle.toLowerCase().includes(term) ||
    c.badge.toLowerCase().includes(term)
  );
}

export function getAllSpotlightItems(query = '') {
  const students = searchChildren(query).map(s => ({
    ...s,
    spotlightType: 'student',
    searchTitle: s.name,
    searchSubtitle: `${s.id} • ${calculateAge(s.dob) || s.age || '—'} • ${s.gender || '—'} • ${s.blood || '—'}`,
    targetUrl: `${pagePath('child-profile')}?id=${s.id}`
  }));

  const appointments = searchAppointments(query).map(a => ({
    ...a,
    spotlightType: 'appointment',
    searchTitle: `${a.childName} — ${a.type}`,
    searchSubtitle: `${a.date} at ${a.time || '10:00 AM'}${a.doctor ? ` • Dr. ${a.doctor}` : ''}`,
    targetUrl: `${pagePath('appointments')}`
  }));

  const alerts = searchAlerts(query).map(al => ({
    ...al,
    spotlightType: 'alert',
    searchTitle: al.childName ? `${al.childName}: Alert` : 'System Alert',
    searchSubtitle: al.message,
    targetUrl: al.childName ? `${pagePath('children')}` : `${pagePath('dashboard')}`
  }));

  const commands = getQuickCommands(query).map(cmd => ({
    ...cmd,
    spotlightType: 'command',
    searchTitle: cmd.title,
    searchSubtitle: cmd.subtitle,
    targetUrl: cmd.url
  }));

  return {
    students,
    appointments,
    alerts,
    commands,
    all: [...students.slice(0, 5), ...appointments.slice(0, 3), ...commands.slice(0, 3), ...alerts.slice(0, 2)]
  };
}

export function renderSpotlightItemsHTML(items, activeIndex = 0, currentTab = 'all') {
  if (!items || items.length === 0) {
    return `
      <div class="spotlight-empty-state">
        <div class="spotlight-empty-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <h4 style="margin:8px 0 4px 0; font-size:15px; font-weight:700; color:var(--color-text);">No matching records found</h4>
        <p style="font-size:12.5px; color:var(--color-text-muted); margin:0;">Try searching by student name, guardian, ID (CH-XXXX), blood group, checkup type, or command.</p>
      </div>
    `;
  }

  let globalIndex = 0;
  return items.map((item, idx) => {
    const isSelected = idx === activeIndex;
    const itemType = item.spotlightType;

    let iconHtml = '';
    let badgeHtml = '';

    if (itemType === 'student') {
      const status = healthStatus(item);
      const badgeClass = status === 'Healthy' ? 'badge--success' : (status === 'Critical' ? 'badge--danger' : 'badge--warning');
      iconHtml = `<div class="spotlight-item-avatar">${initials(item.name)}</div>`;
      badgeHtml = `<span class="badge ${badgeClass}" style="font-size:10px; padding:2px 8px; border-radius:10px;">${status}</span>`;
    } else if (itemType === 'appointment') {
      iconHtml = `<div class="spotlight-item-icon spotlight-item-icon--cal"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>`;
      badgeHtml = `<span class="badge badge--primary" style="font-size:10px; padding:2px 8px; border-radius:10px;">Camp / Appt</span>`;
    } else if (itemType === 'alert') {
      iconHtml = `<div class="spotlight-item-icon spotlight-item-icon--alert"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#dc2626" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`;
      badgeHtml = `<span class="badge badge--danger" style="font-size:10px; padding:2px 8px; border-radius:10px;">Attention</span>`;
    } else {
      iconHtml = `<div class="spotlight-item-icon spotlight-item-icon--cmd">${item.iconSvg || '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'}</div>`;
      badgeHtml = `<span class="badge badge--neutral" style="font-size:10px; padding:2px 8px; border-radius:10px;">${item.badge || 'Action'}</span>`;
    }

    return `
      <div class="spotlight-result-item ${isSelected ? 'spotlight-result-item--active' : ''}" data-spotlight-index="${idx}" data-target-url="${item.targetUrl}" data-item-type="${itemType}" data-item-id="${item.id || ''}" data-action-type="${item.actionType || 'navigate'}">
        <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
          ${iconHtml}
          <div class="spotlight-item-text">
            <div class="spotlight-item-title">${escapeHTML(item.searchTitle)}</div>
            <div class="spotlight-item-sub">${escapeHTML(item.searchSubtitle)}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          ${badgeHtml}
          <svg class="spotlight-item-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    `;
  }).join('');
}

export function renderSpotlightPreviewHTML(item) {
  if (!item) {
    return `
      <div class="spotlight-preview-empty">
        <div style="font-size:40px; margin-bottom:12px;">✨</div>
        <div style="font-size:15px; font-weight:700; color:var(--color-text); margin-bottom:4px;">Spotlight Command Center</div>
        <div style="font-size:12.5px; color:var(--color-text-muted); line-height:1.5;">Type to search students, schedule camps, inspect clinical health records, or run instant commands.</div>
      </div>
    `;
  }

  if (item.spotlightType === 'student') {
    const status = healthStatus(item);
    const age = calculateAge(item.dob) || item.age || '—';
    const statusClass = status === 'Healthy' ? 'badge--success' : (status === 'Critical' ? 'badge--danger' : 'badge--warning');

    return `
      <div class="spotlight-preview-card">
        <!-- Hero Header -->
        <div class="spotlight-preview-header">
          <div class="spotlight-preview-avatar">${initials(item.name)}</div>
          <div style="min-width:0; flex:1;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="badge ${statusClass}" style="font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:10px;">${status.toUpperCase()}</span>
              <span style="font-size:11px; font-weight:600; color:var(--color-text-muted); background:var(--color-bg-alt); padding:2px 8px; border-radius:10px;">${item.id}</span>
            </div>
            <h3 style="margin:0; font-size:18px; font-weight:700; color:var(--color-text); line-height:1.2;">${escapeHTML(item.name)}</h3>
            <div style="font-size:12px; color:var(--color-text-muted); margin-top:2px;">Student Profile</div>
          </div>
        </div>

        <!-- Quick Vitals Grid -->
        <div class="spotlight-preview-grid">
          <div class="spotlight-preview-cell">
            <span class="spotlight-cell-label">Age / DOB</span>
            <span class="spotlight-cell-val">${age} (${item.dob || '—'})</span>
          </div>
          <div class="spotlight-preview-cell">
            <span class="spotlight-cell-label">Gender</span>
            <span class="spotlight-cell-val">${item.gender || '—'}</span>
          </div>
          <div class="spotlight-preview-cell">
            <span class="spotlight-cell-label">Blood Group</span>
            <span class="spotlight-cell-val" style="color:#ef4444; font-weight:700;">${item.blood || '—'}</span>
          </div>
          <div class="spotlight-preview-cell">
            <span class="spotlight-cell-label">Guardian Contact</span>
            <span class="spotlight-cell-val">${item.father || item.guardian || 'Guardian'}${item.phone ? ` • <a href="tel:${item.phone}" style="color:var(--color-primary); text-decoration:none;">${item.phone}</a>` : ''}</span>
          </div>
        </div>

        <!-- Quick Actions Footer -->
        <div class="spotlight-preview-actions">
          <a class="button button--primary button--sm" href="${pagePath('child-profile')}?id=${item.id}" style="flex:1; justify-content:center; gap:6px; font-size:12px; padding:7px 12px; text-decoration:none;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Full Profile
          </a>
          <a class="button button--secondary button--sm" href="${pagePath('appointments')}" style="flex:1; justify-content:center; gap:6px; font-size:12px; padding:7px 12px; text-decoration:none;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Book Camp
          </a>
        </div>
      </div>
    `;
  }

  if (item.spotlightType === 'appointment') {
    return `
      <div class="spotlight-preview-card">
        <div class="spotlight-preview-header">
          <div class="spotlight-preview-icon-box" style="background:#eff6ff; color:#2563eb;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div style="min-width:0; flex:1;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="badge badge--primary" style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">${item.type || 'Appointment'}</span>
              <span class="badge badge--neutral" style="font-size:10px; padding:2px 8px; border-radius:10px;">${item.status || 'Upcoming'}</span>
            </div>
            <h3 style="margin:0; font-size:17px; font-weight:700; color:var(--color-text);">${escapeHTML(item.childName)}</h3>
            <div style="font-size:12px; color:var(--color-text-muted); margin-top:2px;">${item.date} • ${item.time || '10:00 AM'}</div>
          </div>
        </div>

        <div class="spotlight-preview-notes-box">
          <div style="font-size:11px; font-weight:700; color:var(--color-text-muted); text-transform:uppercase; margin-bottom:4px;">Clinical Notes</div>
          <div style="font-size:12.5px; color:var(--color-text); line-height:1.4;">${escapeHTML(item.notes || 'No specific clinical instructions provided.')}</div>
        </div>

        <div class="spotlight-preview-actions">
          <a class="button button--primary button--sm" href="${pagePath('appointments')}" style="width:100%; justify-content:center; gap:6px; font-size:12px; text-decoration:none;">
            Open in Health Calendar
          </a>
        </div>
      </div>
    `;
  }

  // Command preview
  return `
    <div class="spotlight-preview-card">
      <div class="spotlight-preview-header">
        <div class="spotlight-preview-icon-box" style="background:var(--color-bg-alt); color:var(--color-primary);">
          ${item.iconSvg || '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'}
        </div>
        <div style="min-width:0; flex:1;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span class="badge badge--neutral" style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">${item.badge || 'Quick Command'}</span>
          </div>
          <h3 style="margin:0; font-size:17px; font-weight:700; color:var(--color-text);">${escapeHTML(item.title)}</h3>
          <div style="font-size:12px; color:var(--color-text-muted); margin-top:2px;">${escapeHTML(item.subtitle)}</div>
        </div>
      </div>

      <div style="padding:14px; background:var(--color-bg-alt); border-radius:12px; font-size:12.5px; color:var(--color-text-muted); line-height:1.5; margin-bottom:14px;">
        Press <b>Enter ↵</b> to instantly execute this workflow or navigate to the module.
      </div>

      <div class="spotlight-preview-actions">
        <button type="button" class="button button--primary button--sm" data-run-spotlight-cmd="${item.id}" data-action-type="${item.actionType}" data-target-url="${item.url}" style="width:100%; justify-content:center; gap:6px; font-size:12px;">
          Execute Action
        </button>
      </div>
    </div>
  `;
}

export function globalSearchMarkup(query = '') {
  const data = getAllSpotlightItems(query);
  const items = data.all;
  const activeItem = items[0] || null;

  return `
    <div class="spotlight-backdrop" id="spotlight-modal" role="presentation">
      <div class="spotlight-card" role="dialog" aria-modal="true" aria-labelledby="spotlight-input">
        
        <!-- Search Input Bar -->
        <div class="spotlight-search-header">
          <span class="spotlight-search-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input 
            id="spotlight-search-input" 
            class="spotlight-input" 
            type="search" 
            placeholder="Search students, health records, appointments, or commands…" 
            value="${escapeHTML(query)}" 
            autocomplete="off" 
            spellcheck="false" 
            autofocus 
          />
          <div class="spotlight-esc-chip" data-close-spotlight>
            <span>Esc</span>
          </div>
        </div>

        <!-- Filter Category Tabs -->
        <div class="spotlight-tabs-bar">
          <button type="button" class="spotlight-tab spotlight-tab--active" data-spotlight-tab="all">
            All <span class="spotlight-tab-count">${data.all.length}</span>
          </button>
          <button type="button" class="spotlight-tab" data-spotlight-tab="students">
            Students <span class="spotlight-tab-count">${data.students.length}</span>
          </button>
          <button type="button" class="spotlight-tab" data-spotlight-tab="appointments">
            Camps & Appts <span class="spotlight-tab-count">${data.appointments.length}</span>
          </button>
          <button type="button" class="spotlight-tab" data-spotlight-tab="commands">
            Quick Actions <span class="spotlight-tab-count">${data.commands.length}</span>
          </button>
          ${data.alerts.length > 0 ? `
            <button type="button" class="spotlight-tab" data-spotlight-tab="alerts">
              Alerts <span class="spotlight-tab-count" style="background:rgba(239,68,68,0.15); color:#ef4444;">${data.alerts.length}</span>
            </button>
          ` : ''}
        </div>

        <!-- Dual-Pane Body -->
        <div class="spotlight-body">
          <!-- Left Results List -->
          <div class="spotlight-list-pane" id="spotlight-results-container">
            ${renderSpotlightItemsHTML(items, 0, 'all')}
          </div>

          <!-- Right Live Preview Pane -->
          <div class="spotlight-preview-pane" id="spotlight-preview-container">
            ${renderSpotlightPreviewHTML(activeItem)}
          </div>
        </div>

        <!-- Bottom Keyboard Shortcuts Bar -->
        <div class="spotlight-footer">
          <div class="spotlight-shortcuts">
            <span class="spotlight-key-item"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span class="spotlight-key-item"><kbd>↵</kbd> Select</span>
            <span class="spotlight-key-item"><kbd>Esc</kbd> Close</span>
          </div>
          <div class="spotlight-footer-brand">
            Child Health Management Spotlight
          </div>
        </div>

      </div>
    </div>
  `;
}

// Backward compatibility helper
export function renderSearchResultsList(query = '') {
  const data = getAllSpotlightItems(query);
  return renderSpotlightItemsHTML(data.all, 0, 'all');
}
