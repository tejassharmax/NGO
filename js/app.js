import { renderPage } from './router.js';
import { deleteChild, getChildren, getChild, logActivity, addPendingDoc, getActivities, addUploadedDoc, getUploadedDocs, deleteUploadedDoc, addGrowthRecord, addMeal, addMedicine, addAppointment, deleteAppointment, addEmergencyContact, deleteEmergencyContact, addExpense, getAppointments, getMedicines, updateAppointment, updateMedicine, healthStatus, calculateAge, addHealthRecord, getAlerts, dismissAlert, syncWithServer, hydrateFromServer, addSponsor, reorderChildren } from './storage.js';
import { updateChildTable, childRows, setColumnOrder } from './table.js';
import { searchChildren, globalSearchMarkup, renderSearchResultsList } from './search.js';
import { toast } from './toast.js';
import { modal, closeModal } from './modal.js';
import { saveChild } from './form.js';
import { pagePath, icon } from './utils.js';
import { initChart } from './chart.js';
import { loginWithGoogle, logoutUser, initAuthListener } from './auth.js';
import { getAuthorizedUser } from './firestore.js';
import { saveSession, clearSession, isSessionActive } from './session.js';
import { showSheetsSyncLoader, openGoogleSheetsTemplateModal, copyAndOpenGoogleSheets, fetchSheetsConfig, openChildGoogleSheet, pullChildrenFromGoogleSheets, autoSyncDeleteChildFromGoogleSheets } from './googleSheetsSync.js';
import { openGoogleDocsTemplateModal, syncAndOpenGoogleDoc, fetchDocsConfig } from './googleDocsSync.js';
import { bookAppointment, updateCalendarView, renderBookingModalMarkup, renderEventDetailsModalMarkup, buildGoogleCalendarUrl, buildGoogleTasksUrl, formatSingleDisplayTime } from './googleCalendar.js';
import { initCombobox } from './combobox.js';

let activeSort = { field: 'name', direction: 'asc' };
let activeDocFilter = 'All';
let currentPage = 1;
const itemsPerPage = 5;
let page = 'dashboard';

// ─── Authentication Guard & Async App Start ───
let renderCurrentPage = null;

(async () => {
  localStorage.removeItem('sample-students');
  localStorage.removeItem('sample-children');
  localStorage.setItem('chm-documents', '[]');
  localStorage.setItem('chm-pending-docs', '[]');

  // Purge legacy preset mock data and test registrations completely
  const MOCK_NAMES = ['Naveen Roy', 'Aisha Khan', 'Aarav Sharma', 'Ananya Patil', 'Diya Nair', 'Unnamed Child', 'Tejas Sharma'];
  const MOCK_IDS = ['CH-1025', 'CH-1026', 'CH-1027', 'CH-1028', 'CH-1029', 'CH-1001', 'CH-1002', 'CH-1461', 'CH-3923', 'CH-3136', 'CH-8372', 'CH-3938', 'CH-1079'];

  try {
    const rawKids = localStorage.getItem('chm-children');
    if (rawKids) {
      const kids = JSON.parse(rawKids);
      const cleanKids = (kids || []).filter(k => k && !MOCK_NAMES.includes((k.name || '').trim()) && !MOCK_IDS.includes(k.id));
      localStorage.setItem('chm-children', JSON.stringify(cleanKids));
    }
  } catch (e) {}

  ['chm-growth', 'chm-appointments', 'chm-medicines', 'chm-alerts', 'chm-health-records', 'chm-activity', 'chm-nutrition', 'chm-expenses'].forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const clean = arr.filter(item => item && !MOCK_IDS.includes(item.childId) && !MOCK_NAMES.includes(item.childName || item.subject));
          localStorage.setItem(key, JSON.stringify(clean));
        }
      }
    } catch (e) {}
  });

  function getActivePage() {
    if (!isSessionActive()) {
      return 'login';
    }
    const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (hash && hash.trim() !== '' && hash !== 'login') return hash.trim();
    return 'dashboard';
  }

  renderCurrentPage = async function() {
    const loggedIn = isSessionActive();

    if (!loggedIn) {
      page = 'login';
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
      const app = document.querySelector('#app');
      if (app) {
        app.innerHTML = renderPage('login');
      }
      return;
    }

    page = getActivePage();
    if (page === 'login') {
      window.location.hash = '#/';
      page = 'dashboard';
    }

    const deprecatedPages = ['emergency', 'expenses', 'nutrition', 'export'];
    if (deprecatedPages.includes(page)) {
      window.location.hash = '#/dashboard';
      return;
    }

    await Promise.all([
      hydrateFromServer().catch(() => {}),
      fetchSheetsConfig().catch(() => {}),
      fetchDocsConfig().catch(() => {})
    ]);

    const app = document.querySelector('#app');
    if (app) {
      app.innerHTML = renderPage(page);
      applyColumnVisibility();
      initFormListeners();
      initOCRProcessing();
      if (page === 'children') {
        initDragReorder();
        initColumnDragReorder();
        pullChildrenFromGoogleSheets({ silent: true }).then(res => {
          if (res && res.success && res.addedCount > 0) {
            updateChildTable();
          }
        }).catch(() => {});
      }
    }

    if (page === 'dashboard' || page === 'reports') {
      initChart();
    }

    enableColumnResize();
    syncWithServer().catch(() => {});
  };

  if (window.location.href.includes('google_connected=true')) {
    toast('Google Workspace Connected!', 'Your NGO Google Account is connected for Sheets & Docs sync.');
  } else if (window.location.href.includes('google_disconnected=true')) {
    toast('Google Workspace Disconnected', 'Workspace integration turned off.');
  }

  // Always listen for hash changes
  window.addEventListener('hashchange', () => {
    if (renderCurrentPage) renderCurrentPage();
  });

  // Initial render
  await renderCurrentPage();
})();


// ─── Event Listeners ───

// Document Clicks
document.addEventListener('click', (event) => {
  const target = event.target.closest('button, a, input[data-global-search], [data-upload-zone], [data-close-sidebar], [data-topbar-back], [data-calendar-day], [data-open-booking-modal], [data-close-cal-modal], [data-toggle-cal-more], [data-open-child-sheet], [data-event-id], [data-delete-event-id], [data-edit-event-id], [data-sync-event-id], .modal-backdrop, .gcal-popup-backdrop');
  if (!target) return;

  if (target.matches('[data-topbar-back]')) {
    const prevPageMap = {
      'child-profile': 'children',
      'register-child': 'children',
      'ocr-review': 'ocr-upload',
      'ocr-details': 'ocr-review',
      'ocr-processing': 'ocr-upload',
      'children': 'dashboard',
      'documents': 'dashboard',
      'reports': 'dashboard',
      'settings': 'dashboard',
      'growth': 'dashboard',
      'medicines': 'dashboard'
    };
    const prev = prevPageMap[page] || 'dashboard';
    window.location.href = pagePath(prev);
  }

  if (target.closest('[data-collapse-sidebar]')) document.querySelector('.app-shell')?.classList.toggle('sidebar-collapsed');
  if (target.closest('[data-open-sidebar]')) { document.querySelector('.app-shell')?.classList.add('sidebar-open'); const mb = document.querySelector('.mobile-backdrop'); if (mb) mb.hidden = false; }
  if (target.closest('[data-close-sidebar]')) { document.querySelector('.app-shell')?.classList.remove('sidebar-open'); const mb = document.querySelector('.mobile-backdrop'); if (mb) mb.hidden = true; }

  // Dynamic Day/Dark Theme toggle
  const themeBtn = target.closest('[data-theme-toggle]');
  if (themeBtn) {
    event.preventDefault();
    const isDark = !document.body.classList.contains('theme-dark');
    setTheme(isDark);
    toast(isDark ? 'Dark Theme Activated' : 'Light Theme Activated', `Switched workspace display mode.`);
    return;
  }

  // Notifications dropdown toggle
  const notifBtn = target.closest('[data-notifications]');
  if (notifBtn) {
    event.preventDefault();
    event.stopPropagation();
    const dropdown = document.querySelector('[data-notif-dropdown]');
    if (dropdown) {
      const willShow = dropdown.hidden;
      document.querySelectorAll('[data-profile-dropdown]').forEach(d => d.hidden = true);
      dropdown.hidden = !willShow;
      notifBtn.setAttribute('aria-expanded', String(willShow));
    }
    return;
  }

  // Dismiss single alert
  const dismissAlertBtn = target.closest('[data-dismiss-alert-id]');
  if (dismissAlertBtn) {
    event.preventDefault();
    event.stopPropagation();
    const alertId = dismissAlertBtn.getAttribute('data-dismiss-alert-id');
    if (alertId) {
      dismissAlert(alertId);
      const itemEl = target.closest('[data-notif-item-id]');
      if (itemEl) {
        itemEl.style.opacity = '0.5';
        dismissAlertBtn.replaceWith(Object.assign(document.createElement('span'), {
          textContent: 'Dismissed',
          style: 'font-size:10px; color:var(--color-text-muted);'
        }));
      }
      const activeUnread = getAlerts().filter(a => !a.dismissed).length;
      const dot = document.querySelector('.notif-badge-dot');
      if (dot && activeUnread === 0) dot.remove();
      const badge = document.querySelector('[data-notif-dropdown] .badge');
      if (badge) {
        if (activeUnread === 0) {
          badge.className = 'badge badge--neutral';
          badge.textContent = '0 new';
          document.querySelector('[data-clear-all-notifs]')?.remove();
        } else {
          badge.textContent = `${activeUnread} new`;
        }
      }
    }
    return;
  }

  // Mark all notifications as read
  const clearAllNotifsBtn = target.closest('[data-clear-all-notifs]');
  if (clearAllNotifsBtn) {
    event.preventDefault();
    event.stopPropagation();
    const allAlerts = getAlerts().map(a => ({ ...a, dismissed: true }));
    localStorage.setItem('sample-alerts', JSON.stringify(allAlerts));

    document.querySelector('.notif-badge-dot')?.remove();
    clearAllNotifsBtn.remove();

    const badge = document.querySelector('[data-notif-dropdown] .badge');
    if (badge) {
      badge.className = 'badge badge--neutral';
      badge.textContent = '0 new';
    }

    document.querySelectorAll('[data-dismiss-alert-id]').forEach(btn => {
      btn.replaceWith(Object.assign(document.createElement('span'), {
        textContent: 'Dismissed',
        style: 'font-size:10px; color:var(--color-text-muted);'
      }));
    });
    document.querySelectorAll('[data-notif-item-id]').forEach(el => el.style.opacity = '0.5');
    toast('Notifications Cleared', 'All alerts marked as read.');
    return;
  }

  // Profile menu toggle
  const profileTrigger = target.closest('[data-profile-menu]');
  if (profileTrigger) {
    event.preventDefault();
    event.stopPropagation();
    const dropdown = document.querySelector('[data-profile-dropdown]');
    if (dropdown) {
      const willShow = dropdown.hidden;
      document.querySelectorAll('[data-notif-dropdown]').forEach(d => d.hidden = true);
      dropdown.hidden = !willShow;
      profileTrigger.setAttribute('aria-expanded', String(willShow));
    }
    return;
  }

  // Close dropdowns if clicking outside
  if (!target.closest('.topbar-notif') && !target.closest('.topbar-profile')) {
    document.querySelectorAll('[data-notif-dropdown], [data-profile-dropdown]').forEach(d => {
      d.hidden = true;
    });
    document.querySelectorAll('[data-notifications], [data-profile-menu]').forEach(b => {
      b.setAttribute('aria-expanded', 'false');
    });
  }

  const signOutBtn = target.closest('[data-sign-out]');
  if (signOutBtn) {
    event.preventDefault();
    logoutUser().then(() => {
      toast('Signed Out', 'Terminated session and cleared workspace state.');
      window.location.hash = '#/login';
      if (renderCurrentPage) renderCurrentPage();
    });
    return;
  }

  if (target.closest('[data-google-login]')) {
    toast('Opening Google Authentication', 'Please complete sign-in using the Google popup window...');
    loginWithGoogle().then(async (res) => {
      if (res.success) {
        toast('Firebase Authentication Success', `Logged in as ${res.user.displayName} (${res.user.ngo})`);
        await hydrateFromServer().catch(() => {});
        await fetchSheetsConfig().catch(() => {});
        window.location.hash = '#/';
        if (renderCurrentPage) renderCurrentPage();
      } else if (res.errorCode === 'ACCESS_DENIED') {
        modal({
          title: 'Access Denied',
          body: `<div style="text-align:center; padding:16px 8px;">
              <div style="font-size:44px; margin-bottom:8px;">🚫</div>
              <h3 style="color:var(--color-danger); margin:0 0 8px 0; font-size:18px; font-weight:700;">Access Denied</h3>
              <p style="font-size:14px; color:var(--color-text); margin:0 0 12px 0; font-weight:600;">This Google account is not authorized.</p>
              <div style="padding:10px; background:var(--color-bg-alt); border:1px solid var(--color-border); border-radius:6px; font-size:12px; font-weight:500;">
                Tried account: <code>${res.email || 'Unauthorized Account'}</code>
              </div>
            </div>`,
          confirmText: 'Try Authorized Account',
          onConfirm: () => { window.location.reload(); }
        });
      } else {
        toast('Authentication Info', res.message || 'Google Sign-In popup closed.');
      }
    });
  }

  const toggleServiceBtn = target.closest('[data-toggle-google-service]');
  if (toggleServiceBtn) {
    const service = toggleServiceBtn.dataset.toggleGoogleService;
    const key = `google-${service}-connected`;
    const isConnected = localStorage.getItem(key) === 'true';
    const serviceName = service === 'drive' ? 'Google Drive' : service === 'sheets' ? 'Google Sheets' : 'Google Calendar';

    if (isConnected) {
      localStorage.setItem(key, 'false');
      toast(`${serviceName} Disconnected`, 'Service disconnected from workspace.');
    } else {
      localStorage.setItem(key, 'true');
      toast(`${serviceName} Connected`, `Successfully connected to workspace account.`);
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 400);
  }



  // ─── Open Event Details Popover Card ───
  const deleteBtn = target.closest('[data-delete-event-id]');
  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-delete-event-id');
    deleteAppointment(id);
    toast('Appointment Deleted', 'Appointment removed permanently from schedule.');
    
    // 1. Remove popover modal if open
    document.querySelector('#cal-booking-modal')?.remove();

    // 2. Remove table row if deleted from data table
    deleteBtn.closest('tr.gcal-appt-row')?.remove();

    // 3. Remove all matching event chips and cards from DOM
    document.querySelectorAll(`[data-event-id="${id}"]`).forEach(el => el.remove());

    // 4. Refresh calendar grid view dynamically if present
    const calRoot = document.querySelector('[data-calendar-root]');
    if (calRoot) {
      const mode = calRoot.getAttribute('data-cal-view-mode') || 'month';
      const year = parseInt(calRoot.getAttribute('data-cal-year')) || new Date().getFullYear();
      const month = parseInt(calRoot.getAttribute('data-cal-month')) || new Date().getMonth();
      const day = parseInt(calRoot.getAttribute('data-cal-day')) || new Date().getDate();
      updateCalendarView(calRoot, mode, year, month, day);
    }
    return;
  }

  const editBtn = target.closest('[data-edit-event-id]');
  if (editBtn) {
    const id = editBtn.getAttribute('data-edit-event-id');
    const appt = getAppointments().find(a => String(a.id) === String(id));
    if (appt) {
      const modalContainer = document.querySelector('#modal-root') || document.querySelector('#cal-modal-container') || document.body;
      modalContainer.innerHTML = renderBookingModalMarkup(appt.date, appt.time || '10:00');
    }
    return;
  }

  const syncBtn = target.closest('[data-sync-event-id]');
  if (syncBtn) {
    window.open('https://calendar.google.com/', '_blank');
    toast('Google Calendar', 'Opening Google Calendar...');
    return;
  }

  const eventCard = target.closest('[data-event-id]');
  if (eventCard) {
    const eventId = eventCard.getAttribute('data-event-id');
    const modalContainer = document.querySelector('#modal-root') || document.querySelector('#cal-modal-container') || document.body;
    modalContainer.innerHTML = renderEventDetailsModalMarkup(eventId);
    return;
  }

  // ─── Open Booking Popup Modal (from any button or time slot row) ───
  const slotBtn = target.closest('[data-open-booking-modal]');
  if (slotBtn) {
    const slotDate = slotBtn.getAttribute('data-slot-date') || new Date().toISOString().slice(0, 10);
    const slotTime = slotBtn.getAttribute('data-slot-time') || '10:00';
    const modalContainer = document.querySelector('#modal-root') || document.querySelector('#cal-modal-container') || document.body;
    modalContainer.innerHTML = renderBookingModalMarkup(slotDate, slotTime);
    return;
  }

  // ─── Calendar Controls (View Toggle, Today, Prev/Next, Day Click) ───
  const calRoot = target.closest('[data-calendar-root]');
  if (calRoot) {
    let viewMode = calRoot.getAttribute('data-cal-view-mode') || 'month';
    let y = parseInt(calRoot.getAttribute('data-cal-year') || new Date().getFullYear());
    let m = parseInt(calRoot.getAttribute('data-cal-month') || new Date().getMonth());
    let d = parseInt(calRoot.getAttribute('data-cal-day') || new Date().getDate());

    // View Toggle Buttons (Month / Day)
    const viewBtn = target.closest('[data-cal-view]');
    if (viewBtn) {
      const newMode = viewBtn.getAttribute('data-cal-view');
      updateCalendarView(calRoot, newMode, y, m, d);
      return;
    }

    // Today Button
    if (target.closest('[data-calendar-today]')) {
      const now = new Date();
      updateCalendarView(calRoot, viewMode, now.getFullYear(), now.getMonth(), now.getDate());
      return;
    }

    // Prev Button
    if (target.closest('[data-calendar-prev]')) {
      if (viewMode === 'month') {
        m--;
        if (m < 0) { m = 11; y--; }
      } else {
        const curDate = new Date(y, m, d - 1);
        y = curDate.getFullYear();
        m = curDate.getMonth();
        d = curDate.getDate();
      }
      updateCalendarView(calRoot, viewMode, y, m, d);
      return;
    }

    // Next Button
    if (target.closest('[data-calendar-next]')) {
      if (viewMode === 'month') {
        m++;
        if (m > 11) { m = 0; y++; }
      } else {
        const curDate = new Date(y, m, d + 1);
        y = curDate.getFullYear();
        m = curDate.getMonth();
        d = curDate.getDate();
      }
      updateCalendarView(calRoot, viewMode, y, m, d);
      return;
    }

    // Day Click in Month View -> MUST SWITCH TO DAY VIEW FOR THAT DATE!
    const dayCell = target.closest('[data-calendar-day]');
    if (dayCell) {
      const dayNum = parseInt(dayCell.getAttribute('data-calendar-day'));
      if (!isNaN(dayNum)) {
        updateCalendarView(calRoot, 'day', y, m, dayNum);
      }
      return;
    }
  }



  // Modal Close Button or Overlay Backdrop Click
  const isExplicitClose = target.closest('[data-close-cal-modal]');
  const isDirectBackdrop = event.target && event.target.classList && (event.target.classList.contains('modal-backdrop') || event.target.classList.contains('gcal-popup-backdrop') || event.target.dataset.closeCalModalBg !== undefined);

  if (isExplicitClose || isDirectBackdrop) {
    const modalRoot = document.querySelector('#modal-root');
    if (modalRoot) modalRoot.replaceChildren();
    const calModal = document.querySelector('#cal-booking-modal');
    if (calModal) calModal.remove();
    return;
  }

  // "More options" toggle in calendar booking modal
  if (target.closest('[data-toggle-cal-more]')) {
    const notesRow = document.querySelector('.gcal-popup-row textarea[name="notes"]');
    if (notesRow) {
      const section = notesRow.closest('.gcal-popup-row');
      if (section) {
        const isHidden = section.style.display === 'none';
        section.style.display = isHidden ? '' : 'none';
        target.textContent = isHidden ? 'Fewer options' : 'More options';
      }
    }
    return;
  }

  const childSheetBtn = target.closest('[data-open-child-sheet]');
  if (childSheetBtn) {
    event.preventDefault();
    event.stopPropagation();
    const childId = childSheetBtn.dataset.openChildSheet;
    const childName = childSheetBtn.dataset.childName;
    openChildGoogleSheet(childId, childName);
    return;
  }

  if (target.closest('[data-open-sheets-template]')) {
    openGoogleSheetsTemplateModal();
  }

  if (target.closest('[data-open-docs-template]')) {
    openGoogleDocsTemplateModal();
  }

  if (target.closest('[data-sync-google-doc]')) {
    syncAndOpenGoogleDoc();
  }

  const syncSheetsBtn = target.closest('[data-sync-from-sheets]');
  if (syncSheetsBtn) {
    event.preventDefault();
    syncSheetsBtn.disabled = true;
    const origHTML = syncSheetsBtn.innerHTML;
    syncSheetsBtn.innerHTML = `${icon('rotate')} Syncing...`;
    pullChildrenFromGoogleSheets().then(res => {
      syncSheetsBtn.disabled = false;
      syncSheetsBtn.innerHTML = origHTML;
      if (res && res.success) {
        if (renderCurrentPage) {
          renderCurrentPage();
        } else {
          updateChildTable(res.children || getChildren());
        }
      }
    }).catch(() => {
      syncSheetsBtn.disabled = false;
      syncSheetsBtn.innerHTML = origHTML;
    });
    return;
  }



  if (target.matches('[data-global-search]')) openGlobalSearch();
  if (target.matches('[data-filter-toggle]')) { const row = document.querySelector('[data-filter-row]'); row.hidden = !row.hidden; }
  if (target.matches('[data-sort]')) { const field = target.dataset.sort; activeSort = { field, direction: activeSort.field === field && activeSort.direction === 'asc' ? 'desc' : 'asc' }; applyTableFilters(); }
  if (target.matches('[data-clear-filters]')) { document.querySelectorAll('[data-filter-status], [data-filter-blood]').forEach((input) => { input.value = ''; }); applyTableFilters(); }
  if (target.matches('[data-column-visibility-toggle]')) {
    const columns = [
      { id: 'age', label: 'Age' },
      { id: 'gender', label: 'Gender' },
      { id: 'blood', label: 'Blood group' },
      { id: 'status', label: 'Status' }
    ];
    const states = JSON.parse(localStorage.getItem('chm-col-visibility') || '{"age":true,"gender":true,"blood":true,"status":true}');
    const formHTML = columns.map(col => `
        <label class="checkbox" style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" data-col-id="${col.id}" ${states[col.id] ? 'checked' : ''}>
          <span>${col.label}</span>
        </label>
      `).join('');
    modal({
      title: 'Configure columns',
      body: `<div style="display:flex; flex-direction:column; gap:4px; padding: 10px 0;">
          <p style="margin-bottom:12px; font-size:12px; color:var(--color-text-muted);">Toggle columns or reorder them by dragging column headers in the table.</p>
          ${formHTML}
          <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--color-border); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:var(--color-text-muted);">Want default view?</span>
            <button class="button button--ghost button--sm" type="button" id="btn-reset-columns-layout" style="font-size:12px; color:var(--color-primary);">Reset layout</button>
          </div>
        </div>`,
      confirmText: 'Apply changes',
      onConfirm: () => {
        const newStates = {};
        columns.forEach(col => {
          const checked = document.querySelector(`input[data-col-id="${col.id}"]`)?.checked;
          newStates[col.id] = checked;
        });
        localStorage.setItem('chm-col-visibility', JSON.stringify(newStates));
        applyColumnVisibility();
        toast('View updated', 'Your custom columns have been applied.');
      }
    });

    // Handle reset layout button inside modal
    setTimeout(() => {
      document.querySelector('#btn-reset-columns-layout')?.addEventListener('click', () => {
        localStorage.removeItem('chm-col-order');
        localStorage.removeItem('chm-col-visibility');
        closeModal();
        renderCurrentPage();
        toast('Layout reset', 'Default column order and visibility restored.');
      });
    }, 50);
  }

  if (target.matches('[data-delete]')) {
    const id = target.dataset.delete;
    const child = getChildren().find((item) => item.id === id);
    const childName = child?.name || 'child';
    modal({
      title: `Remove ${childName}?`,
      body: 'This removes the child record from this workspace and automatically updates your connected Google Sheet. This action cannot be undone.',
      confirmText: 'Remove child',
      confirmClass: 'button--danger',
      onConfirm: () => {
        deleteChild(id);
        applyTableFilters();
        toast('Child removed', `The record for ${childName} has been removed.`);
        autoSyncDeleteChildFromGoogleSheets(id, childName);
        syncWithServer().catch(() => {});
      }
    });
  }

  if (target.matches('[data-edit]')) {
    const id = target.dataset.edit;
    window.location.href = `${pagePath('register-child')}?method=manual&edit=${id}`;
  }

  if (target.matches('#btn-prev')) {
    if (currentPage > 1) {
      currentPage--;
      applyTableFilters();
    }
  }
  if (target.matches('#btn-next')) {
    const children = filteredChildren();
    const totalPages = Math.ceil(children.length / itemsPerPage) || 1;
    if (currentPage < totalPages) {
      currentPage++;
      applyTableFilters();
    }
  }

  const childCard = target.closest('[data-child-id]');
  if (childCard && !target.matches('button, a')) {
    const childId = childCard.dataset.childId;
    window.location.href = `${pagePath('child-profile')}?id=${childId}`;
  }

  const uploadProfileBtn = target.closest('[data-upload-profile-doc]');
  if (uploadProfileBtn) {
    const childId = uploadProfileBtn.dataset.uploadProfileDoc;
    const childName = uploadProfileBtn.dataset.childName || 'Child';

    modal({
      title: `Upload Document for ${childName}`,
      body: `
        <form id="profile-doc-upload-form" class="form-layout" style="display:flex; flex-direction:column; gap:14px;">
          <label class="field">
            <span class="field__label">Document Title *</span>
            <input class="input" type="text" name="title" placeholder="e.g. Aadhaar Card, Vaccination Certificate, Blood Report" required />
          </label>
          <label class="field">
            <span class="field__label">Category / Document Type *</span>
            <select class="select" name="docType">
              <option value="Medical Report">Medical Report / Lab Test</option>
              <option value="Aadhaar Card">Aadhaar Card / Govt ID</option>
              <option value="Birth Certificate">Birth Certificate</option>
              <option value="Vaccination Record">Immunization / Vaccination Record</option>
              <option value="Prescription">Doctor Prescription</option>
              <option value="School Certificate">School / Admission Certificate</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Select Document File (JPG, PNG, PDF) *</span>
            <input class="input" type="file" name="docFile" accept=".jpg,.jpeg,.png,.pdf" required />
          </label>
        </form>
      `,
      confirmText: 'Upload Document',
      onConfirm: () => {
        const form = document.querySelector('#profile-doc-upload-form');
        if (!form) return;
        const title = form.querySelector('[name="title"]')?.value.trim();
        const docType = form.querySelector('[name="docType"]')?.value;
        const fileInput = form.querySelector('[name="docFile"]');
        if (!title || !fileInput || !fileInput.files || !fileInput.files[0]) {
          toast('Upload failed', 'Please enter a title and select a document file.');
          return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
          addUploadedDoc(title, childName, e.target.result, 'Verified', docType, childId);
          logActivity('doc_uploaded', childName, `Uploaded ${title} (${docType})`);
          toast('Document uploaded', `${title} linked to ${childName}'s profile.`);
          window.setTimeout(() => { window.location.reload(); }, 500);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const docCardClick = target.closest('[data-document-idx]');
  if (docCardClick && !target.matches('button, a')) {
    const idx = docCardClick.dataset.documentIdx;
    const docs = getUploadedDocs();
    const doc = docs[idx];
    if (doc) {
      modal({
        title: `${doc.name} - ${doc.child || doc.student || '—'}`,
        body: doc.image
          ? `<div style="text-align:center; max-height: 70vh; overflow: auto;"><img src="${doc.image}" style="max-width:100%; max-height: 55vh; object-fit:contain; border-radius:6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" /></div>`
          : `<div class="empty-state" style="padding: 24px;"><span class="empty-state__icon">${icon('file')}</span><p>No preview image available for this document.</p></div>`,
        confirmText: 'Close',
        onConfirm: () => { }
      });
    }
  }

  if (target.matches('[data-bulk-export], [data-report-export], [data-create-export]')) {
    exportChildrenToExcel();
  }

  if (target.matches('[data-report-email]')) toast('Report queued for email', 'A secure report link will be delivered to your inbox.');
  if (target.matches('[data-report-print], [data-profile-print]')) window.print();
  if (target.matches('[data-apply-report]')) toast('Report updated', 'Your report now reflects the selected filters.');

  if (target.matches('[data-save-settings]')) {
    const orgNameInput = document.querySelector('input[name="schoolName"]')?.value.trim() || 'An Organisation';
    const orgCodeInput = document.querySelector('input[name="schoolCode"]')?.value.trim() || 'ORG-IND-01';
    const orgEmailInput = document.querySelector('input[name="contact"]')?.value.trim() || 'admin@organisation.org';
    const orgTimezoneInput = document.querySelector('input[name="timezone"]')?.value.trim() || 'Asia / Kolkata';

    const sheetInput = document.querySelector('#admin-google-sheet-input')?.value.trim();
    if (sheetInput) {
      localStorage.setItem('google_sheet_url', sheetInput);
    }

    localStorage.setItem('sample-org-name', orgNameInput);
    localStorage.setItem('sample-org-code', orgCodeInput);
    localStorage.setItem('sample-org-email', orgEmailInput);
    localStorage.setItem('sample-org-timezone', orgTimezoneInput);

    toast('Settings saved', 'Your workspace preferences and Google Sheet connection are up to date.');
    window.setTimeout(() => { window.location.reload(); }, 600);
  }

  if (target.matches('[data-2fa]')) toast('Security configuration', 'Two-factor authentication configuration would open here.');
  if (target.matches('[data-upload-document]')) toast('Choose a document', 'Use Smart Upload for guided document extraction.');

  if (target.matches('[data-filter-docs]')) {
    const statuses = ['All', 'Pending', 'Verified'];
    const currIdx = statuses.indexOf(activeDocFilter);
    activeDocFilter = statuses[(currIdx + 1) % statuses.length];
    target.innerHTML = `${icon('filter')}Status: ${activeDocFilter}`;
    applyDocumentFilters();
  }

  if (target.closest('[data-add-measurement]')) {
    const firstSelect = document.querySelector('.growth-form-instance select[name="childId"]');
    const childOptionsHTML = firstSelect ? firstSelect.innerHTML : '<option value="">Select child</option>';
    const container = document.querySelector('#growth-forms-container');
    if (container) {
      const formCount = container.querySelectorAll('.growth-form-instance').length;
      const newForm = document.createElement('form');
      newForm.className = 'card growth-form-instance page-enter';
      newForm.style.marginTop = '24px';
      newForm.innerHTML = `
          <section class="form-section">
            <div class="form-section__heading" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <div>
                <h2 class="card__title">New measurement #${formCount + 1}</h2>
                <p>Record height and weight for another child.</p>
              </div>
              <button class="icon-button remove-form-btn tooltip" data-tooltip="Remove" type="button" aria-label="Remove form" style="border: none; background: transparent; cursor: pointer; color: var(--color-danger); display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
                ${icon('trash')}
              </button>
            </div>
            <div class="form-grid--two">
              <label class="field"><span class="field__label">Child *</span><select class="select" name="childId" required>${childOptionsHTML}</select></label>
              <label class="field"><span class="field__label">Date *</span><input class="input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label>
              <label class="field"><span class="field__label">Height (cm) *</span><input class="input" name="height" type="number" placeholder="e.g. 140" required></label>
              <label class="field"><span class="field__label">Weight (kg) *</span><input class="input" name="weight" type="number" placeholder="e.g. 35" required></label>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:20px;">
              <button class="button button--primary" type="submit">${icon('check')} Save measurement</button>
            </div>
          </section>
        `;
      container.appendChild(newForm);
      newForm.scrollIntoView({ behavior: 'smooth' });
      const select = newForm.querySelector('select[name="childId"]');
      if (select) select.focus();
      toast('Form added', 'Another measurement form has been added at the bottom.');
    }
  }

  if (target.closest('.remove-form-btn')) {
    const btn = target.closest('.remove-form-btn');
    const form = btn.closest('.growth-form-instance');
    if (form) {
      form.remove();
      toast('Form removed', 'Measurement form was removed.');
    }
  }

  if (target.matches('[data-activity]')) toast('Activity feed', 'Your activity history is up to date.');
  if (target.matches('[data-start-ocr]')) document.querySelector('[data-upload-input]')?.click();
  if (target.matches('[data-upload-zone]')) document.querySelector('[data-upload-input]')?.click();
  if (target.matches('[data-ocr-back]')) window.history.back();

  if (target.matches('[data-ocr-continue]')) {
    if (document.querySelector('[data-ocr-confirm]')?.checked) {
      const ocrData = JSON.parse(localStorage.getItem('ocr-parsed-data') || '{}');
      const formFields = document.querySelectorAll('form.card input, form.card select');
      formFields.forEach(field => {
        if (field.name) {
          ocrData[field.name] = field.value;
        }
      });
      localStorage.setItem('ocr-parsed-data', JSON.stringify(ocrData));
      window.location.href = pagePath('ocr-details');
    } else {
      toast('Review required', 'Confirm that you have checked the extracted details before continuing.');
    }
  }

  if (target.matches('[data-ocr-rotate], [data-ocr-rotate] *')) {
    const img = document.querySelector('.document-preview-img');
    if (img) {
      let rotation = parseInt(img.dataset.rotation || '0', 10);
      rotation = (rotation + 90) % 360;
      img.dataset.rotation = String(rotation);
      img.style.transform = `rotate(${rotation}deg)`;
    } else {
      toast('Preview not active', 'No document image is currently loaded to rotate.');
    }
  }

  if (target.matches('[data-ocr-fullscreen], [data-ocr-fullscreen] *')) {
    const wrapper = document.querySelector('.document-preview-img-wrap') || document.querySelector('.document-sheet');
    if (wrapper) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        wrapper.requestFullscreen?.() || wrapper.webkitRequestFullscreen?.() || wrapper.msRequestFullscreen?.();
      }
    } else {
      toast('Preview not active', 'No document preview is loaded to maximize.');
    }
  }

  if (target.matches('.accordion__trigger')) target.closest('.accordion__item').classList.toggle('is-open');
  if (target.closest('.tab')) {
    const tabBtn = target.closest('.tab');
    const tabsGroup = tabBtn.closest('.tabs');
    if (tabsGroup) {
      const allTabs = Array.from(tabsGroup.querySelectorAll('.tab'));
      const index = allTabs.indexOf(tabBtn);
      allTabs.forEach((t) => {
        t.classList.toggle('tab--active', t === tabBtn);
        t.setAttribute('aria-selected', String(t === tabBtn));
      });

      const profileContainer = document.querySelector('.profile-tab-content-container');
      if (profileContainer) {
        const panels = Array.from(profileContainer.querySelectorAll('[data-tab-panel]'));
        const panelNames = ['overview', 'guardian', 'health', 'growth', 'documents', 'timeline', 'notes'];
        const selectedPanelName = tabBtn.dataset.profileTab || panelNames[index] || 'overview';
        panels.forEach((p) => {
          p.style.display = (p.dataset.tabPanel === selectedPanelName) ? 'block' : 'none';
        });
      }
    }
  }
  if (target.closest('.settings-nav button')) {
    target.closest('.settings-nav').querySelectorAll('button').forEach((button) => button.classList.toggle('active', button === target));
    toast(`${target.textContent.trim()} settings`, 'This section is ready for configuration.');
  }

  // Delete emergency contact
  if (target.matches('[data-delete-contact]')) {
    const contactId = target.dataset.deleteContact;
    modal({ title: 'Remove contact?', body: 'This will permanently remove this emergency contact.', confirmText: 'Remove', confirmClass: 'button--danger', onConfirm: () => { deleteEmergencyContact(contactId); toast('Contact removed', 'Emergency contact has been deleted.'); window.setTimeout(() => window.location.reload(), 500); } });
  }

  // Dismiss health alert
  if (target.closest('[data-dismiss-alert]')) {
    const alertId = target.closest('[data-dismiss-alert]').dataset.dismissAlert;
    dismissAlert(alertId);
    toast('Alert dismissed', 'The notification has been archived.');
    window.setTimeout(() => window.location.reload(), 500);
  }

  // Open Direct Document Upload Modal
  if (target.closest('[data-open-upload-modal]')) {
    const children = getChildren();
    const selectedFilter = document.querySelector('[data-child-document-filter]')?.value || '';
    const childOptions = children.map(c => `<option value="${c.name}" ${c.name.toLowerCase() === selectedFilter ? 'selected' : ''}>${c.name} (${c.id})</option>`).join('');

    modal({
      title: 'Upload Document for Child',
      body: `
          <form id="direct-doc-form" style="display:flex; flex-direction:column; gap:14px;">
            <label class="field">
              <span class="field__label">Select Child *</span>
              <select class="select" name="childName" required>
                <option value="">Choose child</option>
                ${childOptions}
              </select>
            </label>
            <label class="field">
              <span class="field__label">Document Title / Name *</span>
              <input class="input" name="docName" placeholder="e.g. Aadhaar Card, Blood Test Report" required>
            </label>
            <label class="field">
              <span class="field__label">Category *</span>
              <select class="select" name="docType" required>
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="Medical Report">Medical Report / Lab Test</option>
                <option value="Birth Certificate">Birth Certificate</option>
                <option value="Vaccination Record">Vaccination Record</option>
                <option value="Prescription">Prescription</option>
                <option value="School Record">School / NGO Document</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">Choose File (Image / PDF) *</span>
              <input class="input" type="file" name="docFile" accept=".jpg,.jpeg,.png,.pdf" required id="modal-upload-input">
            </label>
          </form>
        `,
      confirmText: 'Upload Document',
      onConfirm: () => {
        const form = document.querySelector('#direct-doc-form');
        if (!form || !form.reportValidity()) return false;
        const formData = new FormData(form);
        const childName = formData.get('childName');
        const docName = formData.get('docName');
        const docType = formData.get('docType');
        const fileInput = document.querySelector('#modal-upload-input');

        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const reader = new FileReader();
          reader.onload = function (e) {
            addUploadedDoc(docName, childName, e.target.result, 'Verified', docType);
            logActivity('doc_uploaded', childName, `Uploaded ${docType}: ${docName}`);
            toast('Document uploaded', `${docName} attached to ${childName}.`);
            window.setTimeout(() => window.location.reload(), 400);
          };
          reader.readAsDataURL(file);
        } else {
          toast('Upload error', 'Please select a document file.');
        }
      }
    });
  }

  // Delete uploaded document
  if (target.closest('[data-delete-doc-idx]')) {
    const idx = parseInt(target.closest('[data-delete-doc-idx]').dataset.deleteDocIdx, 10);
    modal({
      title: 'Delete Document?',
      body: 'Are you sure you want to delete this uploaded document?',
      confirmText: 'Delete',
      confirmClass: 'button--danger',
      onConfirm: () => {
        deleteUploadedDoc(idx);
        toast('Document removed', 'Document deleted from records.');
        window.setTimeout(() => window.location.reload(), 400);
      }
    });
  }
});

// Change listeners
document.addEventListener('change', (event) => {
  if (event.target.matches('[data-child-document-filter]')) {
    const filterVal = event.target.value.toLowerCase();
    const searchVal = (document.querySelector('[data-document-search]')?.value || '').toLowerCase();
    document.querySelectorAll('#document-grid article').forEach(card => {
      const cardChild = card.dataset.childName || '';
      const cardText = card.dataset.document || '';
      const matchesChild = !filterVal || cardChild.includes(filterVal);
      const matchesSearch = !searchVal || cardText.includes(searchVal);
      card.style.display = (matchesChild && matchesSearch) ? 'block' : 'none';
    });
  }
});

// Global Keyboard Shortcuts (⌘ K / Ctrl K for Search)
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openGlobalSearch('');
  }
  if (event.key === 'Escape') {
    closeModal();
  }
});

// Inputs
document.addEventListener('input', (event) => {
  if (event.target.matches('[data-global-search]')) {
    openGlobalSearch(event.target.value);
  }

  if (event.target.matches('[data-document-search]')) {
    const searchVal = event.target.value.toLowerCase();
    const filterVal = (document.querySelector('[data-child-document-filter]')?.value || '').toLowerCase();
    document.querySelectorAll('#document-grid article').forEach(card => {
      const cardChild = card.dataset.childName || '';
      const cardText = card.dataset.document || '';
      const matchesChild = !filterVal || cardChild.includes(filterVal);
      const matchesSearch = !searchVal || cardText.includes(searchVal);
      card.style.display = (matchesChild && matchesSearch) ? 'block' : 'none';
    });
  }

  if (event.target.matches('#child-search, [data-filter-status], [data-filter-blood]')) {
    currentPage = 1;
    applyTableFilters();
  }
  if (event.target.matches('[data-document-search]')) applyDocumentFilters();
});

// Changes
document.addEventListener('change', (event) => {
  if (event.target.matches('[data-filter-status], [data-filter-blood]')) {
    currentPage = 1;
    applyTableFilters();
  }
  if (event.target.matches('#select-all')) document.querySelectorAll('[data-select-row]').forEach((input) => { input.checked = event.target.checked; });
  if (event.target.matches('[data-upload-input]') && event.target.files?.length) {
    processUploadedFile(event.target.files[0]);
  }
});

// Drag & Drop
document.addEventListener('dragover', (event) => {
  const zone = event.target.closest('[data-upload-zone]');
  if (zone) {
    event.preventDefault();
    zone.classList.add('is-dragging');
  }
});

document.addEventListener('dragleave', (event) => {
  const zone = event.target.closest('[data-upload-zone]');
  if (zone && !zone.contains(event.relatedTarget)) {
    zone.classList.remove('is-dragging');
  }
});

document.addEventListener('drop', (event) => {
  const zone = event.target.closest('[data-upload-zone]');
  if (zone) {
    event.preventDefault();
    zone.classList.remove('is-dragging');
    if (event.dataTransfer.files?.length) {
      processUploadedFile(event.dataTransfer.files[0]);
    }
  }
});

// ─── Drag-and-Drop Row Reorder (Apple-style) ───
function initDragReorder() {
  const tbody = document.querySelector('#child-table-body');
  if (!tbody) return;

  let dragRow = null;

  tbody.addEventListener('dragstart', (e) => {
    const tr = e.target.closest('tr[draggable]');
    if (!tr) return;
    const handle = e.target.closest('.drag-handle');
    if (!handle) { e.preventDefault(); return; }

    dragRow = tr;
    tr.classList.add('dragging');
    tbody.classList.add('drag-active');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tr.dataset.childId);

    try {
      const rect = tr.getBoundingClientRect();
      e.dataTransfer.setDragImage(tr, e.clientX - rect.left, e.clientY - rect.top);
    } catch (_) {}
  });

  tbody.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const tr = e.target.closest('tr[draggable]');
    if (!tr || tr === dragRow) return;

    tbody.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    const rect = tr.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      tr.classList.add('drag-over-top');
    } else {
      tr.classList.add('drag-over-bottom');
    }
  });

  tbody.addEventListener('dragleave', (e) => {
    const tr = e.target.closest('tr[draggable]');
    if (tr) {
      tr.classList.remove('drag-over-top', 'drag-over-bottom');
    }
  });

  tbody.addEventListener('drop', (e) => {
    e.preventDefault();
    const targetTr = e.target.closest('tr[draggable]');
    if (!targetTr || !dragRow || targetTr === dragRow) return;

    const rect = targetTr.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertBefore = e.clientY < midY;

    if (insertBefore) {
      tbody.insertBefore(dragRow, targetTr);
    } else {
      tbody.insertBefore(dragRow, targetTr.nextSibling);
    }

    // Collect new order of child IDs and persist
    const orderedIds = Array.from(tbody.querySelectorAll('tr[data-child-id]'))
      .map(row => row.dataset.childId);
    reorderChildren(orderedIds);

    // Flash the moved row with a smooth 2-second fade
    dragRow.classList.add('drag-flash');
    setTimeout(() => dragRow?.classList.remove('drag-flash'), 2000);

    toast('Row position updated', 'Saved child record order.');
    syncWithServer().catch(() => {});
  });

  tbody.addEventListener('dragend', () => {
    if (dragRow) {
      dragRow.classList.remove('dragging');
    }
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.classList.remove('drag-over-top', 'drag-over-bottom');
      tr.classList.add('drag-settled');
    });
    tbody.classList.remove('drag-active');

    setTimeout(() => {
      tbody.querySelectorAll('.drag-settled').forEach(tr => {
        tr.classList.remove('drag-settled');
      });
    }, 500);

    dragRow = null;
  });
}

// ─── Drag-and-Drop Column Reorder (Apple-style) ───
function initColumnDragReorder() {
  const table = document.querySelector('.data-table');
  if (!table) return;
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('#child-table-body');
  if (!thead || !tbody) return;

  let dragColTh = null;
  let draggedColId = null;

  thead.addEventListener('dragstart', (e) => {
    if (e.target.closest('.column-resizer')) {
      e.preventDefault();
      return;
    }
    const th = e.target.closest('th.col-draggable');
    if (!th) return;

    dragColTh = th;
    draggedColId = th.dataset.column;
    th.classList.add('col-dragging');
    table.classList.add('col-drag-active');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedColId);

    // Soft highlight on all data cells in this column
    tbody.querySelectorAll(`td[data-column="${draggedColId}"]`).forEach(td => {
      td.classList.add('col-cells-dragging');
    });

    try {
      e.dataTransfer.setDragImage(th, th.offsetWidth / 2, th.offsetHeight / 2);
    } catch (_) {}
  });

  thead.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const targetTh = e.target.closest('th.col-draggable');
    if (!targetTh || targetTh === dragColTh) return;

    thead.querySelectorAll('.col-drag-over-left, .col-drag-over-right').forEach(el => {
      el.classList.remove('col-drag-over-left', 'col-drag-over-right');
    });

    const rect = targetTh.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    if (e.clientX < midX) {
      targetTh.classList.add('col-drag-over-left');
    } else {
      targetTh.classList.add('col-drag-over-right');
    }
  });

  thead.addEventListener('dragleave', (e) => {
    const targetTh = e.target.closest('th.col-draggable');
    if (targetTh) {
      targetTh.classList.remove('col-drag-over-left', 'col-drag-over-right');
    }
  });

  thead.addEventListener('drop', (e) => {
    e.preventDefault();
    const targetTh = e.target.closest('th.col-draggable');
    if (!targetTh || !dragColTh || targetTh === dragColTh) return;

    const rect = targetTh.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const insertBefore = e.clientX < midX;

    const theadRow = thead.querySelector('tr');
    if (insertBefore) {
      theadRow.insertBefore(dragColTh, targetTh);
    } else {
      theadRow.insertBefore(dragColTh, targetTh.nextSibling);
    }

    const targetColId = targetTh.dataset.column;
    tbody.querySelectorAll('tr').forEach(row => {
      const draggedTd = row.querySelector(`td[data-column="${draggedColId}"]`);
      const targetTd = row.querySelector(`td[data-column="${targetColId}"]`);
      if (draggedTd && targetTd) {
        if (insertBefore) {
          row.insertBefore(draggedTd, targetTd);
        } else {
          row.insertBefore(draggedTd, targetTd.nextSibling);
        }
      }
    });

    const newOrder = Array.from(thead.querySelectorAll('th[data-column]'))
      .map(th => th.dataset.column);
    setColumnOrder(newOrder);

    // Flash the moved column with a smooth 2-second fade
    dragColTh.classList.add('col-drag-flash');
    tbody.querySelectorAll(`td[data-column="${draggedColId}"]`).forEach(td => {
      td.classList.add('col-drag-flash');
    });

    setTimeout(() => {
      dragColTh?.classList.remove('col-drag-flash');
      tbody.querySelectorAll('.col-drag-flash').forEach(td => td.classList.remove('col-drag-flash'));
    }, 2000);

    applyColumnVisibility();
    enableColumnResize();
    toast('Columns rearranged', 'Saved custom column layout.');
  });

  thead.addEventListener('dragend', () => {
    if (dragColTh) {
      dragColTh.classList.remove('col-dragging');
    }
    tbody.querySelectorAll('.col-cells-dragging').forEach(td => {
      td.classList.remove('col-cells-dragging');
    });
    thead.querySelectorAll('th').forEach(th => {
      th.classList.remove('col-drag-over-left', 'col-drag-over-right');
      th.classList.add('col-drag-settled');
    });
    table.classList.remove('col-drag-active');

    setTimeout(() => {
      thead.querySelectorAll('.col-drag-settled').forEach(th => {
        th.classList.remove('col-drag-settled');
      });
    }, 500);

    dragColTh = null;
    draggedColId = null;
  });
}

// ─── Form Submissions ───
function initFormListeners() {
  console.log("initFormListeners called for page:", page);

  // Child registration form
  document.querySelector('#child-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const child = saveChild(form);
    form.reset();
    form.querySelector('input[name="id"]')?.remove();

    showSheetsSyncLoader(child.name, () => {
      toast('Child saved & synced', `${child.name}'s record generated in Google Sheets.`);
      window.location.href = `${pagePath('child-profile')}?id=${child.id}`;
    });
  });

  // OCR additional form
  document.querySelector('#ocr-additional-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const child = saveChild(form);
    logActivity('doc_processed', child.name, 'OCR-verified child saved');
    addPendingDoc('Health record', child.name);

    const fileData = localStorage.getItem('ocr-upload-file');
    const fileName = localStorage.getItem('ocr-upload-filename') || 'Medical Document';
    let docLabel = 'Medical Report';
    if (fileName.toLowerCase().includes('aadhaar') || fileName.toLowerCase().includes('aadhar')) {
      docLabel = 'Aadhaar Card';
    } else if (fileName.toLowerCase().includes('birth') || fileName.toLowerCase().includes('cert')) {
      docLabel = 'Birth Certificate';
    } else if (fileName.toLowerCase().includes('blood') || fileName.toLowerCase().includes('cbc') || fileName.toLowerCase().includes('test')) {
      docLabel = 'Blood Test Report';
    }
    addUploadedDoc(docLabel, child.name, fileData, 'Verified', docLabel);

    const addInput = form.querySelector('[data-additional-doc-input]');
    if (addInput && addInput.files && addInput.files[0]) {
      const addFile = addInput.files[0];
      const addReader = new FileReader();
      addReader.onload = function (e) {
        addUploadedDoc(addFile.name.replace(/\.[^/.]+$/, ""), child.name, e.target.result, 'Verified', 'Medical Record');
      };
      addReader.readAsDataURL(addFile);
    }

    // Save blood report test results to health records
    const ocrData = JSON.parse(localStorage.getItem('ocr-parsed-data') || '{}');
    if (ocrData.isBloodReport || ocrData.hemoglobin || ocrData.rbc) {
      addHealthRecord({
        childId: child.id,
        childName: child.name,
        type: 'cbc',
        date: new Date().toISOString().slice(0, 10),
        hemoglobin: ocrData.hemoglobin || '',
        wbc: ocrData.wbc || '',
        rbc: ocrData.rbc || '',
        platelets: ocrData.platelets || '',
        pcv: ocrData.pcv || ''
      });

      const alerts = [];
      if (ocrData.hemoglobin && parseFloat(ocrData.hemoglobin) < 11.0) {
        alerts.push('Low Hemoglobin (Anemia risk)');
      }
      if (ocrData.rbc && parseFloat(ocrData.rbc) > 4.8) {
        alerts.push('High RBC Count');
      }

      if (alerts.length > 0) {
        logActivity('health_alert', child.name, `Abnormal blood values: ${alerts.join(', ')}`);
      } else {
        logActivity('health_alert', child.name, `Normal blood test processed`);
      }
    }

    showSheetsSyncLoader(child.name, () => {
      toast('Verified child saved', `${child.name}'s record generated in Google Sheets.`);
      window.location.href = `${pagePath('child-profile')}?id=${child.id}`;
    });
  });

  // Growth form (using delegated submit handler for dynamic form cards)
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form.classList.contains('growth-form-instance') || form.id === 'growth-form') {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form));
      const child = getChild(values.childId);
      addGrowthRecord({
        childId: values.childId,
        childName: child ? child.name : 'Unknown',
        date: values.date,
        height: parseFloat(values.height),
        weight: parseFloat(values.weight)
      });
      toast('Growth recorded', `Measurement for ${child ? child.name : 'Child'} has been saved.`);
      window.setTimeout(() => window.location.reload(), 500);
    }
  });

  // Meal form
  document.querySelector('#meal-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    const child = getChild(values.childId);
    addMeal({
      childId: values.childId,
      childName: child ? child.name : 'Unknown',
      mealType: values.mealType,
      date: values.date,
      description: values.description,
      calories: values.calories || ''
    });
    toast('Meal logged', 'Nutrition entry has been saved.');
    window.setTimeout(() => window.location.reload(), 500);
  });

  // Medicine form
  document.querySelector('#medicine-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    const child = getChild(values.childId);
    addMedicine({
      childId: values.childId,
      childName: child ? child.name : 'Unknown',
      medicineName: values.medicineName,
      dosage: values.dosage,
      frequency: values.frequency || 'As directed',
      startDate: values.startDate,
      endDate: values.endDate,
      status: 'Active'
    });
    toast('Prescription added', 'Medicine tracking has started.');
    window.setTimeout(() => window.location.reload(), 500);
  });

  // Appointment form (legacy & calendar widget)
  const handleBookingSubmit = (form) => {
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    const child = getChild(values.childId);
    bookAppointment({
      childId: values.childId,
      childName: child ? child.name : 'Unknown',
      type: values.type,
      date: values.date,
      time: values.time || '',
      doctor: values.doctor || '',
      notes: values.notes || ''
    });

    const modalRoot = document.querySelector('#modal-root');
    if (modalRoot) modalRoot.replaceChildren();
    const calModal = document.querySelector('#cal-booking-modal');
    if (calModal) calModal.remove();

    window.setTimeout(() => window.location.reload(), 1000);
  };

  document.querySelector('#appointment-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleBookingSubmit(event.currentTarget);
  });

  document.addEventListener('submit', (event) => {
    if (event.target && (event.target.id === 'cal-booking-form' || event.target.classList.contains('cal-booking-form'))) {
      event.preventDefault();
      handleBookingSubmit(event.target);
    }
  });

  // ── Custom Combobox Dropdown ──
  initCombobox();

  // Live date & time text update in booking popup
  document.addEventListener('input', (event) => {
    const form = event.target.closest('#cal-booking-form');
    if (!form) return;
    const dateInput = form.querySelector('[name="date"]');
    const timeInput = form.querySelector('[name="time"]');
    const displayEl = form.querySelector('.gcal-popup-date-display');
    if (displayEl && dateInput && dateInput.value) {
      const dateObj = new Date(dateInput.value + 'T00:00:00');
      const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const rawTime = timeInput ? timeInput.value : '';
      const displayTime = rawTime ? formatSingleDisplayTime(rawTime) : '';
      displayEl.textContent = `${displayDate}${displayTime ? ` · ${displayTime}` : ''}`;
    }
  });

  // Emergency contact form
  document.querySelector('#emergency-form')?.addEventListener('submit', (event) => {
    console.log("Emergency form submit captured!");
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    addEmergencyContact({
      name: values.name,
      type: values.type,
      phone: values.phone,
      specialty: values.specialty || '',
      address: values.address || ''
    });
    toast('Contact added', 'Emergency contact has been saved.');
    window.setTimeout(() => window.location.reload(), 500);
  });

  // Sponsor form
  document.querySelector('#sponsor-form')?.addEventListener('submit', (event) => {
    console.log("Sponsor form submit captured!");
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    const values = Object.fromEntries(formData);
    addSponsor({
      name: values.name,
      phone: values.phone || '',
      email: values.email || '',
      totalContribution: parseFloat(values.contribution) || 0,
      childrenIds: []
    });
    toast('Sponsor registered', 'Sponsor record has been created.');
    window.setTimeout(() => window.location.reload(), 500);
  });

  // Expense form

  document.querySelector('#expense-form')?.addEventListener('submit', (event) => {
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
      childId: values.childId || '',
      childName: child ? child.name : ''
    });
    toast('Expense logged', 'Transaction has been recorded.');
    window.setTimeout(() => window.location.reload(), 500);
  });

  // Login form (triggers Google Auth flow)
  document.querySelector('[data-login-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    toast('Opening Google Authentication', 'Please complete sign-in using the Google popup window...');
    loginWithGoogle().then((res) => {
      if (res.success) {
        toast('Firebase Authentication Success', `Logged in as ${res.user.displayName} (${res.user.ngo})`);
        window.setTimeout(() => { window.location.href = pagePath('dashboard'); }, 850);
      } else if (res.errorCode === 'ACCESS_DENIED') {
        modal({
          title: 'Access Denied',
          body: `<div style="text-align:center; padding:16px 8px;">
              <div style="font-size:44px; margin-bottom:8px;">🚫</div>
              <h3 style="color:var(--color-danger); margin:0 0 8px 0; font-size:18px; font-weight:700;">Access Denied</h3>
              <p style="font-size:14px; color:var(--color-text); margin:0 0 12px 0; font-weight:600;">This Google account is not authorized.</p>
              <div style="padding:10px; background:var(--color-bg-alt); border:1px solid var(--color-border); border-radius:6px; font-size:12px; font-weight:500;">
                Tried account: <code>${res.email || 'Unauthorized Account'}</code>
              </div>
            </div>`,
          confirmText: 'Try Authorized Account',
          onConfirm: () => { window.location.reload(); }
        });
      } else {
        toast('Authentication Info', res.message || 'Google Sign-In popup closed.');
      }
    });
  });
}

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openGlobalSearch(); }
  if (event.key === 'Escape') closeModal();
});

// OCR processing backend fetch logic
function initOCRProcessing() {
  if (page !== 'ocr-processing' || window.__ocrStarted) return;
  window.__ocrStarted = true;
  const fileData = localStorage.getItem('ocr-upload-file');
  const fileName = localStorage.getItem('ocr-upload-filename') || 'document.png';
  const fileType = localStorage.getItem('ocr-upload-filetype') || 'image/png';

  if (fileData) {
    const progressBar = document.querySelector('.ocr-progress-bar');
    const progressPctText = document.querySelector('.ocr-progress-pct');
    const progressStatusText = document.querySelector('.ocr-progress-status');
    let currentProgress = 0;

    const statusSteps = [
      { min: 0, text: 'Preprocessing image & normalizing contrast...' },
      { min: 20, text: 'Scanning text with Tesseract multi-pass OCR...' },
      { min: 45, text: 'Extracting document fields (Name, DOB, ID)...' },
      { min: 70, text: 'Verifying confidence scores & structuring draft...' },
      { min: 88, text: 'Finalizing review draft...' }
    ];

    const progressTimer = window.setInterval(() => {
      if (currentProgress < 92) {
        currentProgress += Math.floor(Math.random() * 5) + 3;
        if (currentProgress > 92) currentProgress = 92;
        if (progressBar) progressBar.style.width = `${currentProgress}%`;
        if (progressPctText) progressPctText.textContent = `${currentProgress}%`;

        const step = statusSteps.filter(s => currentProgress >= s.min).pop();
        if (step && progressStatusText) {
          progressStatusText.textContent = step.text;
        }
      }
    }, 180);

    fetch(fileData)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], fileName, { type: fileType });
        const formData = new FormData();
        formData.append('document', file);

        const startTime = Date.now();

        apiFetch('/api/ocr', {
          method: 'POST',
          body: formData
        })
          .then(response => {
            if (!response.ok) throw new Error('OCR API failed');
            return response.json();
          })
          .then(result => {
            window.clearInterval(progressTimer);
            if (result.success) {
              if (progressBar) progressBar.style.width = '100%';
              if (progressPctText) progressPctText.textContent = '100%';

              localStorage.setItem('ocr-parsed-data', JSON.stringify(result.data));
              const name = [result.data.firstName, result.data.lastName].filter(Boolean).join(' ') || 'Unknown';
              logActivity('doc_processed', name, 'Document extracted via OCR');

              const elapsed = Date.now() - startTime;
              const remaining = Math.max(0, 1000 - elapsed);
              window.setTimeout(() => {
                window.location.href = pagePath('ocr-review');
              }, remaining);
            } else {
              throw new Error(result.error || 'Extraction failed');
            }
          })
          .catch(err => {
            window.clearInterval(progressTimer);
            console.error('Live OCR failed:', err);
            localStorage.removeItem('ocr-parsed-data');

            modal({
              title: 'Extraction Failed',
              body: '<p>The system could not identify or extract valid information from this document. Please ensure it is a clear scan of a supported document (e.g. Aadhaar Card, Birth Certificate, Blood Test Report).</p>',
              confirmText: 'Try Again',
              onConfirm: () => {
                window.location.href = pagePath('ocr-upload');
              }
            });

            const processingContainer = document.querySelector('.ocr-processing');
            if (processingContainer) {
              processingContainer.innerHTML = `<span class="ocr-processing__sample" style="color:var(--color-danger)">${icon('alertCircle') || '⚠️'}</span><h2>Extraction failed</h2><p>Please try again with a clearer image.</p>`;
            }
          });
      });
  } else {
    window.setTimeout(() => { window.location.href = pagePath('ocr-review'); }, 1850);
  }
}

// ─── Core Helpers ───

function enableColumnResize() {
  document.querySelectorAll('th[data-resizable]').forEach((header) => {
    if (header.querySelector('.column-resizer')) return;
    const handle = document.createElement('button');
    handle.className = 'column-resizer';
    handle.type = 'button';
    handle.setAttribute('aria-label', `Resize ${header.textContent.trim()} column`);
    header.append(handle);
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = header.getBoundingClientRect().width;
      const resize = (moveEvent) => { header.style.width = `${Math.max(120, startWidth + moveEvent.clientX - startX)}px`; };
      const stop = () => { document.removeEventListener('pointermove', resize); document.removeEventListener('pointerup', stop); };
      document.addEventListener('pointermove', resize);
      document.addEventListener('pointerup', stop);
    });
  });
}

function setTheme(isDark) {
  document.body.classList.toggle('theme-dark', isDark);
  localStorage.setItem('sample-theme', isDark ? 'dark' : 'light');
  document.querySelectorAll('[data-theme-toggle] .theme-icon-container').forEach(el => {
    el.innerHTML = isDark ? icon('sun') : icon('moon');
  });
}

setTheme(localStorage.getItem('sample-theme') === 'dark');

function openGlobalSearch(query = '') {
  const root = document.querySelector('#modal-root');
  if (!root) return;

  const existingInput = root.querySelector('#global-search-input');
  const resultsContainer = root.querySelector('#global-search-results-container');

  if (existingInput && resultsContainer) {
    resultsContainer.innerHTML = renderSearchResultsList(query);
  } else {
    root.innerHTML = globalSearchMarkup(query);
    const input = root.querySelector('#global-search-input');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.addEventListener('input', () => {
        const container = root.querySelector('#global-search-results-container');
        if (container) {
          container.innerHTML = renderSearchResultsList(input.value);
        }
      });
    }
    root.querySelector('.modal-backdrop')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) closeModal();
    });
  }
}

function filteredChildren() {
  const query = document.querySelector('#child-search')?.value || '';
  const status = document.querySelector('[data-filter-status]')?.value || '';
  const blood = document.querySelector('[data-filter-blood]')?.value || '';
  return searchChildren(query).filter((child) => (!status || child.status === status) && (!blood || child.blood === blood));
}

function applyTableFilters() {
  const children = filteredChildren().sort((a, b) => String(a[activeSort.field] || '').localeCompare(String(b[activeSort.field] || '')) * (activeSort.direction === 'asc' ? 1 : -1));

  const totalItems = children.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * itemsPerPage;
  const paginated = children.slice(start, start + itemsPerPage);

  updateChildTable(paginated);

  const countSpan = document.getElementById('child-count');
  if (countSpan) {
    countSpan.textContent = `${totalItems} children (Page ${currentPage} of ${totalPages})`;
  }

  const btnPrev = document.getElementById('btn-prev');
  if (btnPrev) btnPrev.disabled = currentPage === 1;

  const btnNext = document.getElementById('btn-next');
  if (btnNext) btnNext.disabled = currentPage === totalPages;
  applyColumnVisibility();
}

function applyColumnVisibility() {
  const states = JSON.parse(localStorage.getItem('chm-col-visibility') || '{"age":true,"gender":true,"blood":true,"status":true}');
  Object.keys(states).forEach(colId => {
    const visible = states[colId];
    document.querySelectorAll(`[data-column="${colId}"]`).forEach(el => {
      el.style.display = visible ? '' : 'none';
    });
  });
}

function applyDocumentFilters() {
  const searchVal = document.querySelector('[data-document-search]')?.value.toLowerCase().trim() || '';
  document.querySelectorAll('.document-card').forEach((card) => {
    const text = card.dataset.document || '';
    const matchesSearch = text.includes(searchVal);
    const badge = card.querySelector('.badge');
    const statusBadgeText = badge ? badge.textContent.trim() : '';
    const matchesStatus = (activeDocFilter === 'All') ||
      (activeDocFilter === 'Pending' && statusBadgeText.includes('Pending')) ||
      (activeDocFilter === 'Verified' && (statusBadgeText.includes('Verified') || statusBadgeText.includes('Active')));
    card.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
  });
}

function processUploadedFile(file) {
  if (!file.type.startsWith('image/')) {
    toast('Unsupported file format', 'Please upload a clean image file (JPG or PNG).');
    return;
  }

  toast('Document received', 'Starting a secure draft extraction.');

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      try {
        const pngDataUrl = canvas.toDataURL('image/png');
        localStorage.setItem('ocr-upload-file', pngDataUrl);
        localStorage.setItem('ocr-upload-filename', file.name.replace(/\.[^/.]+$/, "") + '.png');
        localStorage.setItem('ocr-upload-filetype', 'image/png');
      } catch (err) {
        console.warn('Canvas conversion failed, saving original:', err);
        localStorage.setItem('ocr-upload-file', e.target.result);
        localStorage.setItem('ocr-upload-filename', file.name);
        localStorage.setItem('ocr-upload-filetype', file.type);
      }
      window.setTimeout(() => { window.location.href = pagePath('ocr-processing'); }, 500);
    };
    img.onerror = function () {
      console.warn('Image loading failed, saving original:', file.name);
      localStorage.setItem('ocr-upload-file', e.target.result);
      localStorage.setItem('ocr-upload-filename', file.name);
      localStorage.setItem('ocr-upload-filetype', file.type);
      window.setTimeout(() => { window.location.href = pagePath('ocr-processing'); }, 500);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ─── SheetJS Excel Export Logic ───
function loadSheetJS(callback) {
  if (window.XLSX) {
    callback();
    return;
  }
  toast('Preparing export', 'Loading the secure Excel engine...');
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  script.onload = () => callback();
  script.onerror = () => toast('Export failed', 'Could not load the Excel export library. Please check your internet connection.');
  document.head.appendChild(script);
}

function exportChildrenToExcel() {
  const children = getChildren();
  if (children.length === 0) {
    toast('No data to export', 'Register some children first.');
    return;
  }

  loadSheetJS(() => {
    const data = children.map(c => ({
      'Child ID': c.id || '',
      'Name': c.name || '',
      'Date of Birth': c.dob || '',
      'Age': calculateAge(c.dob) || '',
      'Gender': c.gender || '',
      'Blood Group': c.blood || '',
      'Father / Guardian': c.father || '',
      'Mother': c.mother || '',
      'Phone': c.phone || '',
      'Registration Date': c.registeredDate || '',
      'Height (cm)': c.height || '',
      'Weight (kg)': c.weight || '',
      'Medical Conditions': c.medicalConditions || '',
      'Allergies': c.allergies || '',
      'Address': c.address || '',
      'Health Status': healthStatus(c).label,
      'Verification Status': c.status || 'Active'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Children Health Records");
    XLSX.writeFile(wb, "ChildCare_Health_Records.xlsx");

    logActivity('export_created', 'Excel file', 'Exported all children health data to Excel');
    toast('Export complete', 'Your children health records Excel file has been downloaded.');
  });
}
