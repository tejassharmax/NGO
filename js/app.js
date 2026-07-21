import { renderPage } from './router.js';
import { deleteChild, getChildren, getChild, logActivity, addPendingDoc, getActivities, addUploadedDoc, getUploadedDocs, addGrowthRecord, addMeal, addMedicine, addAppointment, addEmergencyContact, deleteEmergencyContact, addExpense, getAppointments, getMedicines, updateAppointment, updateMedicine, healthStatus, calculateAge, addHealthRecord, dismissAlert, syncWithServer } from './storage.js';
import { updateChildTable, childRows } from './table.js';
import { searchChildren, globalSearchMarkup } from './search.js';
import { toast } from './toast.js';
import { modal, closeModal } from './modal.js';
import { saveChild } from './form.js';
import { pagePath, icon } from './utils.js';
import { initChart } from './chart.js';

let activeSort = { field: 'name', direction: 'asc' };
let activeDocFilter = 'All';
let currentPage = 1;
const itemsPerPage = 5;
let page = 'dashboard';

// ─── Authentication Guard & Async App Start ───
(async () => {
  const isLoggedIn = localStorage.getItem('sample-logged-in') === 'true';
  page = document.body.dataset.page || 'dashboard';

  if (!isLoggedIn && page !== 'login') {
    window.location.href = pagePath('login');
  } else if (isLoggedIn && page === 'login') {
    window.location.href = pagePath('dashboard');
  } else {
    // Await database sync from server if logged in
    if (page !== 'login') {
      await syncWithServer();
    }

    // Render the active page
    const app = document.querySelector('#app');
    if (app) {
      app.innerHTML = renderPage(page);
      applyColumnVisibility();
    }

    // Initialize interactive chart if on dashboard or reports
    if (page === 'dashboard' || page === 'reports') {
      initChart();
    }

    // Initialize Column Resize functionality on tables
    enableColumnResize();
  }
})();

  // ─── Event Listeners ───

  // Document Clicks
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, a, input[data-global-search], [data-upload-zone], [data-close-sidebar], [data-topbar-back]');
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
        'export': 'dashboard',
        'settings': 'dashboard',
        'growth': 'dashboard',
        'nutrition': 'dashboard',
        'medicines': 'dashboard',
        'appointments': 'dashboard',
        'emergency': 'dashboard',
        'expenses': 'dashboard'
      };
      const prev = prevPageMap[page] || 'dashboard';
      window.location.href = pagePath(prev);
    }

    if (target.matches('[data-collapse-sidebar]')) document.querySelector('.app-shell').classList.toggle('sidebar-collapsed');
    if (target.matches('[data-open-sidebar]')) { document.querySelector('.app-shell').classList.add('sidebar-open'); document.querySelector('.mobile-backdrop').hidden = false; }
    if (target.matches('[data-close-sidebar]')) { document.querySelector('.app-shell').classList.remove('sidebar-open'); target.hidden = true; }
    if (target.matches('[data-theme-toggle]')) setTheme(!document.body.classList.contains('theme-dark'));
    if (target.matches('[data-notifications]')) toast('You\u2019re all caught up', 'No new health alerts need your attention.');
    if (target.matches('[data-profile-menu]')) { const dropdown = document.querySelector('[data-profile-dropdown]'); const visible = dropdown.hidden; dropdown.hidden = !visible; target.setAttribute('aria-expanded', String(visible)); }
    
    if (target.matches('[data-sign-out]')) {
      localStorage.removeItem('sample-logged-in');
      toast('Signed out', 'You have securely signed out of your workspace.');
      window.setTimeout(() => { window.location.href = pagePath('login'); }, 850);
    }

    if (target.closest('[data-google-login]')) {
      toast('Connecting to Google...', 'Redirecting to secure single sign-on.');
      window.setTimeout(() => {
        localStorage.setItem('sample-logged-in', 'true');
        toast('Google Login Successful', 'Logged in as Admin (admin@childcare.org).');
        window.setTimeout(() => { window.location.href = pagePath('dashboard'); }, 850);
      }, 1200);
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
          <p style="margin-bottom:12px; font-size:12px; color:var(--color-text-muted);">Toggle columns to customize your data table view.</p>
          ${formHTML}
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
    }
    
    if (target.matches('[data-delete]')) {
      const id = target.dataset.delete;
      const child = getChildren().find((item) => item.id === id);
      modal({ title: `Remove ${child?.name || 'child'}?`, body: 'This removes the child record from this workspace. This action cannot be undone.', confirmText: 'Remove child', confirmClass: 'button--danger', onConfirm: () => { deleteChild(id); applyTableFilters(); toast('Child removed', 'The record has been removed from this workspace.'); } });
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
          onConfirm: () => {}
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

      localStorage.setItem('sample-org-name', orgNameInput);
      localStorage.setItem('sample-org-code', orgCodeInput);
      localStorage.setItem('sample-org-email', orgEmailInput);
      localStorage.setItem('sample-org-timezone', orgTimezoneInput);

      toast('Settings saved', 'Your workspace preferences are up to date.');
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
    if (target.matches('.tab')) {
      target.closest('.tabs').querySelectorAll('.tab').forEach((tab) => {
        tab.classList.toggle('tab--active', tab === target);
        tab.setAttribute('aria-selected', String(tab === target));
      });
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
  });

  // Inputs
  document.addEventListener('input', (event) => {
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

  // ─── Form Submissions ───

  // Child registration form
  document.querySelector('#child-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const child = saveChild(form);
    toast('Child saved', `${child.name}'s record is ready.`);
    window.setTimeout(() => { window.location.href = `${pagePath('child-profile')}?id=${child.id}`; }, 500);
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

    toast('Verified child saved', `${child.name}'s record is now active.`);
    window.setTimeout(() => { window.location.href = `${pagePath('child-profile')}?id=${child.id}`; }, 500);
  });

  // Growth form
  document.querySelector('#growth-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
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
    toast('Growth recorded', 'Measurement has been saved.');
    window.setTimeout(() => window.location.reload(), 500);
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

  // Appointment form
  document.querySelector('#appointment-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    const child = getChild(values.childId);
    addAppointment({
      childId: values.childId,
      childName: child ? child.name : 'Unknown',
      type: values.type,
      date: values.date,
      time: values.time || '',
      doctor: values.doctor || '',
      notes: values.notes || '',
      status: 'Upcoming'
    });
    toast('Appointment scheduled', 'Reminder has been set.');
    window.setTimeout(() => window.location.reload(), 500);
  });

  // Emergency contact form
  document.querySelector('#emergency-form')?.addEventListener('submit', (event) => {
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

  // Login form
  document.querySelector('[data-login-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const adminIdInput = event.target.querySelector('[data-admin-id-input]')?.value.trim();
    if (adminIdInput === 'admin-ngo') {
      localStorage.setItem('sample-logged-in', 'true');
      toast('Login Successful', 'Welcome to the Child Health Management workspace.');
      window.setTimeout(() => { window.location.href = pagePath('dashboard'); }, 850);
    } else {
      toast('Access Denied', 'Incorrect Admin User ID. Please check the demo credentials.', 'danger');
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openGlobalSearch(); }
    if (event.key === 'Escape') closeModal();
  });

  // OCR processing backend fetch logic
  if (page === 'ocr-processing') {
    const fileData = localStorage.getItem('ocr-upload-file');
    const fileName = localStorage.getItem('ocr-upload-filename') || 'document.png';
    const fileType = localStorage.getItem('ocr-upload-filetype') || 'image/png';

    if (fileData) {
      const progressBar = document.querySelector('.ocr-progress-bar');
      const progressPctText = document.querySelector('.ocr-progress-pct');
      let currentProgress = 0;
      
      const progressTimer = window.setInterval(() => {
        if (currentProgress < 90) {
          currentProgress += Math.floor(Math.random() * 8) + 2;
          if (currentProgress > 90) currentProgress = 90;
          if (progressBar) progressBar.style.width = `${currentProgress}%`;
          if (progressPctText) progressPctText.textContent = `${currentProgress}%`;
        }
      }, 200);

      fetch(fileData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], fileName, { type: fileType });
          const formData = new FormData();
          formData.append('document', file);

          const startTime = Date.now();

          fetch('/api/ocr', {
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
}

setTheme(localStorage.getItem('sample-theme') === 'dark');

function openGlobalSearch(query = '') {
  const root = document.querySelector('#modal-root');
  if (!root) return;
  root.innerHTML = globalSearchMarkup(query);
  const input = root.querySelector('#global-search-input');
  if (input) {
    input.focus();
    input.select();
    input.addEventListener('input', () => openGlobalSearch(input.value));
  }
  root.querySelector('.modal-backdrop')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) closeModal(); });
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
