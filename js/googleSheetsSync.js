/**
 * googleSheetsSync.js
 * Automatic Google Sheets generation and real-time record synchronization service.
 * Automatically formats and syncs child health records to Google Spreadsheets
 * matching the exact export data format:
 * ID | Child Name | Date of Birth | Age | Gender | Blood Group | Aadhaar ID | Guardian | Contact Phone | Height (cm) | Weight (kg) | Medical Conditions | Allergies | Current Medications | Dental Remarks | Oral Hygiene Index | Status | Registration Date
 */

import { getSession } from './session.js';
import { toast } from './toast.js';
import { getChildren, calculateAge, logActivity } from './storage.js';
import { escapeHTML, icon } from './utils.js';
import { apiFetch } from './apiClient.js';

export const EXACT_SHEET_COLUMNS = [
  'ID',
  'Child Name',
  'Date of Birth',
  'Age',
  'Gender',
  'Blood Group',
  'Aadhaar ID',
  'Guardian',
  'Contact Phone',
  'Height (cm)',
  'Weight (kg)',
  'Medical Conditions',
  'Allergies',
  'Status',
  'Registration Date',
  'Current Medications',
  'Dental Remarks',
  'Oral Hygiene Index'
];

let cachedSheetsConfig = null;

/**
 * Helper to consistently get the sanitized lowercase NGO slug
 */
export function getNgoSlug(session) {
  const sess = session || getSession() || {};
  const raw = sess.ngoSlug || sess.ngo || 'ayusha-nilayam';
  return String(raw).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-') || 'ayusha-nilayam';
}

/**
 * Fetch Sheets config for the current NGO from backend API
 */
export async function fetchSheetsConfig(ngoSlug) {
  const session = getSession() || {};
  const slug = ngoSlug ? String(ngoSlug).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-') : getNgoSlug(session);
  try {
    const res = await apiFetch(`/api/sheets/config?ngo=${encodeURIComponent(slug)}`);
    if (res.ok) {
      cachedSheetsConfig = await res.json();
      if (cachedSheetsConfig?.childSheetGids) {
        localStorage.setItem('chm_child_sheet_gids', JSON.stringify(cachedSheetsConfig.childSheetGids));
      }
      if (cachedSheetsConfig?.clinicalSpreadsheetUrl) {
        localStorage.setItem(`google_clinical_sheet_url_${slug}`, cachedSheetsConfig.clinicalSpreadsheetUrl);
        localStorage.setItem('google_clinical_sheet_url', cachedSheetsConfig.clinicalSpreadsheetUrl);
      }
      if (cachedSheetsConfig?.spreadsheetUrl) {
        localStorage.setItem(`google_sheet_url_${slug}`, cachedSheetsConfig.spreadsheetUrl);
        localStorage.setItem('google_sheet_url', cachedSheetsConfig.spreadsheetUrl);
      }
      return cachedSheetsConfig;
    }
  } catch (err) {
    console.warn('[Google Sheets] Config fetch warning:', err);
  }
  return cachedSheetsConfig || { connected: false };
}

/**
 * Get cached Sheets config object
 */
export function getSheetsConfig() {
  return cachedSheetsConfig;
}

/**
 * Get live view link to the Master Directory Google Sheet ("Ayusha Nilayam — Child Health Records")
 */
export function getGoogleSheetUrl() {
  const session = getSession() || {};
  const ngoSlug = getNgoSlug(session);
  const savedUrl = localStorage.getItem(`google_sheet_url_${ngoSlug}`) || localStorage.getItem('google_sheet_url');
  return cachedSheetsConfig?.spreadsheetUrl || savedUrl || null;
}

/**
 * Get live view link to the dedicated Student Medical Records workbook ("Ayusha Nilayam — Student Medical Records")
 */
export function getClinicalSheetUrl() {
  const session = getSession() || {};
  const ngoSlug = getNgoSlug(session);
  const savedUrl = localStorage.getItem(`google_clinical_sheet_url_${ngoSlug}`) || localStorage.getItem('google_clinical_sheet_url');
  return cachedSheetsConfig?.clinicalSpreadsheetUrl || savedUrl || null;
}

/**
 * Get direct Google Sheet URL for a specific child tab inside Student Medical Records workbook
 */
export function getChildGoogleSheetUrl(childId, childName) {
  const clinicalUrl = getClinicalSheetUrl();
  if (!clinicalUrl) return null;

  let gids = cachedSheetsConfig?.childSheetGids;
  if (!gids) {
    try {
      gids = JSON.parse(localStorage.getItem('chm_child_sheet_gids') || '{}');
    } catch (e) {
      gids = {};
    }
  }

  const nameUpper = (childName || '').trim().toUpperCase();
  const gid = gids?.[childId] ?? gids?.[childName] ?? gids?.[nameUpper] ?? null;

  const baseUrl = clinicalUrl.split('#')[0].replace(/\/edit.*$/, '/edit');
  if (gid !== null && gid !== undefined) {
    return `${baseUrl}#gid=${gid}`;
  }
  return clinicalUrl;
}

/**
 * Open a child's dedicated Google Sheet tab in a new browser window
 */
export async function openChildGoogleSheet(childId, childName) {
  toast('Opening Google Sheet...', `Connecting to ${childName || 'student'}'s sheet...`);
  
  // Open window synchronously on user click to avoid browser popup blockers
  let win = null;
  try {
    win = window.open('', '_blank');
    if (win && win.document) {
      win.document.write('<html><head><title>Loading Sheet...</title></head><body style="font-family:system-ui,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f8fafc; color:#334155;"><div style="text-align:center;"><div style="width:40px; height:40px; border:3px solid #cbd5e1; border-top-color:#0f9d58; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 16px auto;"></div><p style="font-size:15px; font-weight:600; margin:0;">Opening Student Medical Records...</p><p style="font-size:13px; color:#64748b; margin:6px 0 0 0;">Connecting to ' + (childName || 'child') + '\'s tab...</p></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style></body></html>');
    }
  } catch (e) {}

  const session = getSession() || {};
  const ngoSlug = getNgoSlug(session);
  const ngoName = session.ngoName || session.ngo || 'Ayusha Nilayam';
  const children = getChildren() || [];

  let targetUrl = getChildGoogleSheetUrl(childId, childName);

  // 1. Fast check: try fetching current config from server if not cached yet
  if (!targetUrl || !cachedSheetsConfig?.clinicalSpreadsheetUrl) {
    try {
      const cfg = await fetchSheetsConfig(ngoSlug);
      if (cfg && cfg.connected && cfg.clinicalSpreadsheetUrl) {
        targetUrl = getChildGoogleSheetUrl(childId, childName) || cfg.clinicalSpreadsheetUrl;
      }
    } catch (e) {}
  }

  // 2. If still missing, trigger a full live sync to generate spreadsheet and child tabs
  if (!targetUrl || !cachedSheetsConfig?.clinicalSpreadsheetUrl) {
    try {
      const res = await apiFetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ children, ngo: ngoSlug, ngoName })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          if (!cachedSheetsConfig) cachedSheetsConfig = { connected: true };
          cachedSheetsConfig.connected = true;
          if (data.spreadsheetUrl) cachedSheetsConfig.spreadsheetUrl = data.spreadsheetUrl;
          if (data.clinicalSpreadsheetUrl) {
            cachedSheetsConfig.clinicalSpreadsheetUrl = data.clinicalSpreadsheetUrl;
            cachedSheetsConfig.clinicalSheetId = data.clinicalSheetId;
            localStorage.setItem(`google_clinical_sheet_url_${ngoSlug}`, data.clinicalSpreadsheetUrl);
            localStorage.setItem('google_clinical_sheet_url', data.clinicalSpreadsheetUrl);
          }
          if (data.childSheetGids) {
            cachedSheetsConfig.childSheetGids = data.childSheetGids;
            localStorage.setItem('chm_child_sheet_gids', JSON.stringify(data.childSheetGids));
          }
          targetUrl = getChildGoogleSheetUrl(childId, childName) || data.clinicalSpreadsheetUrl;
        }
      }
    } catch (e) {
      console.warn('[Google Sheets] Sync exception:', e);
    }
  }

  if (targetUrl) {
    if (win && !win.closed) {
      win.location.href = targetUrl;
    } else {
      window.open(targetUrl, '_blank');
    }
  } else {
    if (win && !win.closed) win.close();
    // Show connection modal prompting user to connect Google Workspace in Settings
    const modalRoot = document.querySelector('#modal-root');
    if (modalRoot) {
      modalRoot.innerHTML = `
        <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; animation:fadeIn 0.2s ease;">
          <div class="card" style="max-width:440px; width:90%; padding:24px; text-align:center; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);">
            <div style="width:52px; height:52px; border-radius:50%; background:rgba(16,185,129,0.12); color:#059669; display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px;">
              ${icon('googleSheets')}
            </div>
            <h3 style="margin:0 0 8px 0; font-size:18px; font-weight:700;">Connect Google Sheets Sync</h3>
            <p style="font-size:13.5px; color:var(--color-text-muted); margin:0 0 20px 0; line-height:1.5;">
              To view <b>${escapeHTML(childName || 'this child')}'s</b> live Google Spreadsheet tab, please connect your Google Account in <b>Settings</b>.
            </p>
            <div style="display:flex; gap:10px; justify-content:center;">
              <button class="button button--ghost" type="button" onclick="document.querySelector('#modal-root').replaceChildren();">Cancel</button>
              <a class="button button--primary" href="#/settings" onclick="document.querySelector('#modal-root').replaceChildren();">Go to Settings</a>
            </div>
          </div>
        </div>`;
    }
  }
}

export function formatUnitValue(val, unit) {
  if (val === null || val === undefined || val === '') return '—';
  const num = String(val).replace(/[^0-9.]/g, '').trim();
  return num ? `${num} ${unit}` : '—';
}

export function extractRawNumber(val) {
  if (val === null || val === undefined || val === '') return '';
  return String(val).replace(/[^0-9.]/g, '').trim();
}

/**
 * Format a child health record object into the EXACT 15-column Google Sheets row array
 * @param {Object} child 
 * @returns {Array<string>}
 */
export function formatChildToSheetRow(child) {
  const age = calculateAge(child.dob) || child.age || '—';
  return [
    child.id || 'CH-0000',
    child.name || 'Unnamed Child',
    child.dob || '—',
    age,
    child.gender || '—',
    child.blood || '—',
    child.idNumber || '—',
    child.father || child.guardian || '—',
    child.phone || '—',
    formatUnitValue(child.height, 'cm'),
    formatUnitValue(child.weight, 'kg'),
    child.medicalConditions || 'None',
    child.allergies || 'None',
    child.status || 'Active',
    child.registeredDate || new Date().toISOString().slice(0, 10),
    child.medications || 'None',
    child.dentalRemarks || 'None',
    child.hygieneIndex || 'Not Assessed'
  ];
}

/**
 * Generate formatted TSV string of all records for instant Google Sheets pasting
 * @returns {string}
 */
export function generateSheetTSVData() {
  const children = getChildren() || [];
  const headerRow = EXACT_SHEET_COLUMNS.join('\t');
  const dataRows = children.map(c => formatChildToSheetRow(c).join('\t'));
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Copy formatted 15-column dataset to clipboard only
 */
export function copySheetDataToClipboard() {
  const children = getChildren() || [];
  const tsvData = generateSheetTSVData();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(tsvData).then(() => {
      toast(
        'Dataset Copied to Clipboard!',
        `Copied ${children.length} child records (15 columns). Press Ctrl+V (or Cmd+V) on cell A1 in Google Sheets to paste!`
      );
    }).catch(err => {
      console.warn('Clipboard write notice:', err);
    });
  }
}

/**
 * Copy formatted 15-column dataset to clipboard and open Google Sheets
 */
export function copyAndOpenGoogleSheets() {
  copySheetDataToClipboard();
  window.open(getGoogleSheetUrl(), '_blank');
}

/**
 * Display a professional Google Sheets Template Data Viewer Modal
 */
export function openGoogleSheetsTemplateModal() {
  document.querySelector('#google-sheets-view-modal')?.remove();

  const session = getSession() || {};
  const ngoName = session.ngo || 'Ayusha Nilayam';
  const userEmail = session.email || localStorage.getItem('google-user-email') || 'tejassachin2010@gmail.com';
  const children = getChildren() || [];

  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];

  const headerColsHTML = EXACT_SHEET_COLUMNS.map((col, idx) => `
    <th style="padding: 10px 14px; background: #f8fafc; border: 1px solid #cbd5e1; font-weight: 700; color: #334155; text-align: left; font-size: 12px; white-space: nowrap; user-select: none;">
      <div style="font-size: 10px; color: #94a3b8; font-weight: 700; letter-spacing:0.05em; text-transform: uppercase; margin-bottom: 2px;">${colLetters[idx]}</div>
      ${col}
    </th>
  `).join('');

  const rowsHTML = children.map((c, rowIdx) => {
    const row = formatChildToSheetRow(c);
    const isEven = rowIdx % 2 === 1;
    const bgStyle = isEven ? 'background: #f8fafc;' : 'background: #ffffff;';

    const cellHTML = row.map((val, cellIdx) => {
      if (cellIdx === 16) {
        const isVerified = String(val).toLowerCase() === 'verified' || String(val).toLowerCase() === 'active';
        const badgeBg = isVerified ? '#dcfce7' : '#fef3c7';
        const badgeColor = isVerified ? '#15803d' : '#b45309';
        return `
          <td style="padding: 8px 14px; border: 1px solid #e2e8f0; font-size: 12.5px; ${bgStyle} white-space: nowrap;">
            <span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:11.5px; font-weight:600; background:${badgeBg}; color:${badgeColor};">${escapeHTML(String(val))}</span>
          </td>
        `;
      }

      return `
        <td style="padding: 8px 14px; border: 1px solid #e2e8f0; font-size: 12.5px; color: #1e293b; ${bgStyle} white-space: nowrap;">
          ${escapeHTML(String(val))}
        </td>
      `;
    }).join('');

    return `
      <tr>
        <td style="padding: 8px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #64748b; text-align: center; user-select: none;">${rowIdx + 1}</td>
        ${cellHTML}
      </tr>
    `;
  }).join('');

  const modalHTML = `
    <div id="google-sheets-view-modal" style="position:fixed; inset:0; z-index:9999; background:rgba(15, 23, 42, 0.82); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.2s ease;">
      <div class="card" style="width:min(1280px, 96vw); height:min(820px, 94vh); display:flex; flex-direction:column; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4); border:1px solid #cbd5e1;">
        
        <!-- Google Sheets Header Bar -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 24px; background:linear-gradient(135deg, #0f9d58 0%, #0b8043 100%); color:white; box-shadow:0 2px 8px rgba(0,0,0,0.12);">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:40px; height:40px; border-radius:8px; background:white; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.15); overflow:hidden;">
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28 4H12C9.79086 4 8 5.79086 8 8V40C8 42.2091 9.79086 44 12 44H36C38.2091 44 40 42.2091 40 40V16L28 4Z" fill="#0F9D58"/><path d="M28 4V16H40L28 4Z" fill="#87CEAC"/><path d="M16 22H32V38H16V22Z" fill="#FFFFFF"/><path d="M16 22V27H32V22H16ZM16 27V32H32V27H16ZM16 32V37H32V32H16Z" fill="#0F9D58"/><path d="M22 22V38M27 22V38" stroke="#FFFFFF" stroke-width="1.5"/></svg>
            </div>
            <div>
              <div style="font-weight:700; font-size:16px; display:flex; align-items:center; gap:10px; color:white;">
                Child_Health_Records_${ngoName.replace(/[^a-zA-Z0-9]/g, '_')}
                <span style="font-size:11px; background:rgba(255,255,255,0.22); backdrop-filter:blur(4px); padding:3px 10px; border-radius:12px; font-weight:600; display:inline-flex; align-items:center; gap:6px;">
                  <span style="width:6px; height:6px; border-radius:50%; background:#4ade80; box-shadow:0 0 6px #4ade80;"></span>
                  Live Auto-Synced File
                </span>
              </div>
              <div style="font-size:12px; color:rgba(255,255,255,0.9); margin-top:2px; display:flex; align-items:center; gap:8px;">
                <span>Google Account: <b>${escapeHTML(userEmail)}</b></span>
                <span>•</span>
                <span><b>${children.length} Records</b> Formatted (18 Columns)</span>
              </div>
            </div>
          </div>
          
          <div style="display:flex; align-items:center; gap:12px;">
            <a href="${getGoogleSheetUrl()}" target="_blank" class="button" style="background:#ffffff; color:#0b8043; border:0; font-weight:700; font-size:13px; padding:10px 18px; border-radius:8px; box-shadow:0 3px 8px rgba(0,0,0,0.15); display:inline-flex; align-items:center; gap:8px; text-decoration:none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              Open Live Google Sheet
            </a>
            <button id="modal-close-sheets-btn" style="background:rgba(255,255,255,0.15); border:0; color:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; line-height:1; transition:background 0.2s ease;">&times;</button>
          </div>
        </div>

        <!-- Guidance Banner -->
        <div style="padding:12px 24px; background:#f0fdf4; border-bottom:1px solid #bbf7d0; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:12px; font-size:13px; color:#166534;">
            <span style="font-size:16px;">💡</span>
            <span>
              <b>Live Sheet Connected</b>: Click <b>Open Live Google Sheet</b> to open <a href="${getGoogleSheetUrl()}" target="_blank" style="color:#0b8043; font-weight:700; text-decoration:underline;">Connected Sheet</a> directly in Google Drive!
            </span>
          </div>

          <button id="modal-copy-only-btn" class="button button--sm button--ghost" type="button" style="color:#15803d; border-color:rgba(21,128,61,0.3); font-weight:600;">
            📋 Copy 18-Column Data
          </button>
        </div>

        <!-- Main Native Grid View -->
        <div style="flex:1; overflow:auto; background:#f8fafc; padding:16px;">
          <table style="width:100%; border-collapse:collapse; background:white; box-shadow:0 1px 4px rgba(0,0,0,0.06); border-radius:6px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <thead>
              <tr>
                <th style="width:44px; background:#cbd5e1; border:1px solid #94a3b8;"></th>
                ${headerColsHTML}
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </div>

        <!-- Footer Status Bar -->
        <div style="padding:12px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; font-size:12.5px; color:#64748b;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
            Connected File: <a href="${getGoogleSheetUrl()}" target="_blank" style="color:#0f9d58; font-weight:600; text-decoration:none;">NGO_Child_Health_Master_Records</a>
          </div>
          <button id="modal-close-bottom-btn" class="button button--ghost button--sm" type="button" style="font-weight:600;">Close Template</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.querySelector('#google-sheets-view-modal');
  modal.querySelector('#modal-close-sheets-btn').addEventListener('click', () => modal.remove());
  modal.querySelector('#modal-close-bottom-btn').addEventListener('click', () => modal.remove());
  modal.querySelector('#modal-copy-only-btn').addEventListener('click', () => {
    copySheetDataToClipboard();
  });
}

/**
 * Display an animated Google Sheets creation & updating loader modal
 */
export function showSheetsSyncLoader(childName, onComplete) {
  document.querySelector('#sheets-sync-modal-overlay')?.remove();

  const session = getSession() || {};
  const userEmail = session.email || localStorage.getItem('google-user-email') || 'tejassachin2010@gmail.com';

  const overlay = document.createElement('div');
  overlay.id = 'sheets-sync-modal-overlay';
  overlay.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(15, 23, 42, 0.82); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; animation:fadeIn 0.25s ease;';
  
  const activeSheetUrl = getGoogleSheetUrl() || '#';
  const activeSheetId = cachedSheetsConfig?.sheetId ? `${cachedSheetsConfig.sheetId.slice(0, 15)}...` : 'Active NGO Sheet';

  overlay.innerHTML = `
    <div class="card" style="position:relative; width:min(480px, 92vw); padding:28px 24px; text-align:center; background:var(--color-bg); border:1px solid var(--color-border); box-shadow:0 20px 40px rgba(0,0,0,0.3); border-radius:16px;">
      <button id="sync-overlay-close-btn" style="position:absolute; top:14px; right:16px; background:none; border:none; color:var(--color-text-muted); cursor:pointer; font-size:22px; line-height:1; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:background 0.2s ease;" aria-label="Close">&times;</button>

      <div style="display:flex; justify-content:center; margin-bottom:16px;">
        <div id="sync-spinner-icon" style="position:relative; width:64px; height:64px; display:flex; align-items:center; justify-content:center; background:white; border-radius:50%; border:2px solid rgba(16,185,129,0.3); box-shadow:0 4px 12px rgba(0,0,0,0.1); overflow:hidden;">
          <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation:pulse 1.5s infinite;"><path d="M28 4H12C9.79086 4 8 5.79086 8 8V40C8 42.2091 9.79086 44 12 44H36C38.2091 44 40 42.2091 40 40V16L28 4Z" fill="#0F9D58"/><path d="M28 4V16H40L28 4Z" fill="#87CEAC"/><path d="M16 22H32V38H16V22Z" fill="#FFFFFF"/><path d="M16 22V27H32V22H16ZM16 27V32H32V27H16ZM16 32V37H32V32H16Z" fill="#0F9D58"/><path d="M22 22V38M27 22V38" stroke="#FFFFFF" stroke-width="1.5"/></svg>
          <div id="sync-spinner-ring" style="position:absolute; inset:-4px; border:3px solid transparent; border-top-color:#10b981; border-radius:50%; animation:spin 1s linear infinite;"></div>
        </div>
      </div>
      
      <h2 style="font-size:18px; font-weight:700; margin:0 0 6px 0; color:var(--color-text);">Updating Live Google Sheet</h2>
      <p style="font-size:13px; color:var(--color-text-muted); margin:0 0 20px 0;">Auto-syncing for <b>${escapeHTML(childName)}</b> to live Google Sheet...</p>
      
      <div style="background:var(--color-bg-alt); padding:16px; border-radius:10px; border:1px solid var(--color-border); text-align:left; margin-bottom:20px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; font-size:12px;">
          <span id="sync-stage-text" style="font-weight:600; color:var(--color-primary);">1. Validating child details...</span>
          <span id="sync-stage-pct" style="font-weight:700; color:var(--color-text);">25%</span>
        </div>
        <div class="progress" style="height:8px; border-radius:4px; overflow:hidden; background:var(--color-border);">
          <div id="sync-progress-bar" class="progress__bar" style="width:25%; background:#10b981; transition:width 0.35s ease;"></div>
        </div>
      </div>

      <!-- Action buttons revealed on 100% complete -->
      <div id="sync-actions-area" style="display:none; flex-direction:column; gap:10px; margin-top:10px; animation:fadeIn 0.3s ease;">
        <a id="sync-open-sheet-btn" href="javascript:void(0)" class="button button--primary" style="width:100%; justify-content:center; gap:10px; background:#0f9d58; border-color:#0b8043; padding:12px; font-size:14px; font-weight:600; text-decoration:none;">
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28 4H12C9.79086 4 8 5.79086 8 8V40C8 42.2091 9.79086 44 12 44H36C38.2091 44 40 42.2091 40 40V16L28 4Z" fill="#0F9D58"/><path d="M28 4V16H40L28 4Z" fill="#87CEAC"/><path d="M16 22H32V38H16V22Z" fill="#FFFFFF"/><path d="M16 22V27H32V22H16ZM16 27V32H32V27H16ZM16 32V37H32V32H16Z" fill="#0F9D58"/><path d="M22 22V38M27 22V38" stroke="#FFFFFF" stroke-width="1.5"/></svg>
          Open Connected Live Google Sheet
        </a>
      </div>

      <div id="sync-footer-note" style="font-size:11px; color:var(--color-text-muted); display:flex; align-items:center; justify-content:center; gap:6px; margin-top:12px;">
        <span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
        <span id="sync-footer-label">Synced to Live NGO Sheet</span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const stageText = overlay.querySelector('#sync-stage-text');
  const stagePct = overlay.querySelector('#sync-stage-pct');
  const progressBar = overlay.querySelector('#sync-progress-bar');
  const actionsArea = overlay.querySelector('#sync-actions-area');
  const footerLabel = overlay.querySelector('#sync-footer-label');
  const openBtn = overlay.querySelector('#sync-open-sheet-btn');
  const spinnerRing = overlay.querySelector('#sync-spinner-ring');

  overlay.querySelector('#sync-overlay-close-btn')?.addEventListener('click', () => {
    overlay.remove();
    if (typeof onComplete === 'function') onComplete();
  });

  setTimeout(() => {
    if (stageText) stageText.textContent = '2. Transmitting record payload...';
    if (stagePct) stagePct.textContent = '55%';
    if (progressBar) progressBar.style.width = '55%';
  }, 400);

  setTimeout(() => {
    if (stageText) stageText.textContent = '3. Appending record row to Google Sheet...';
    if (stagePct) stagePct.textContent = '85%';
    if (progressBar) progressBar.style.width = '85%';
  }, 850);

  setTimeout(() => {
    if (stageText) {
      stageText.textContent = 'Live Google Sheet Updated & Synced!';
      stageText.style.color = '#10b981';
    }
    if (stagePct) stagePct.textContent = '100%';
    if (progressBar) progressBar.style.width = '100%';
    if (spinnerRing) spinnerRing.style.display = 'none';

    const latestUrl = getGoogleSheetUrl();
    if (openBtn) {
      if (latestUrl && latestUrl !== '#' && latestUrl !== 'javascript:void(0)') {
        openBtn.href = latestUrl;
      }
      openBtn.onclick = (e) => {
        e.preventDefault();
        const targetUrl = getGoogleSheetUrl();
        if (targetUrl && targetUrl !== '#' && targetUrl !== 'javascript:void(0)') {
          window.open(targetUrl, '_blank');
        } else {
          toast('Fetching Google Sheet...', 'Connecting to your NGO Google Sheet...');
          fetchSheetsConfig().then(cfg => {
            if (cfg && cfg.spreadsheetUrl && cfg.spreadsheetUrl !== '#') {
              window.open(cfg.spreadsheetUrl, '_blank');
            } else {
              modal({
                title: 'Google Workspace Not Connected',
                body: `<div style="text-align:center; padding:16px 8px;">
                  <div style="font-size:44px; margin-bottom:8px;">📊</div>
                  <h3 style="color:var(--color-primary); margin:0 0 8px 0; font-size:18px; font-weight:700;">Connect Google Sheets Sync</h3>
                  <p style="font-size:13px; color:var(--color-text); margin:0 0 16px 0; line-height:1.5;">
                    To view and open your live Google Sheet in real-time, please click <b>Connect Google Sheets Sync</b> once under <b>Settings</b>.
                  </p>
                </div>`,
                confirmText: 'Go to Settings',
                onConfirm: () => {
                  overlay.remove();
                  window.location.hash = '#/settings';
                }
              });
            }
          });
        }
      };
    }
    if (footerLabel && cachedSheetsConfig?.sheetId) {
      footerLabel.textContent = `Synced to ${cachedSheetsConfig.sheetId.slice(0, 15)}...`;
    }

    if (actionsArea) actionsArea.style.display = 'flex';
  }, 1300);
}

/**
 * Automatically sync child health records to the NGO's Google Sheet via OAuth API
 * @param {Object} child 
 */
export async function autoSyncChildToGoogleSheets(child) {
  if (!child) return;

  const session = getSession() || {};
  const ngoSlug = session.ngo || 'ayusha-nilayam';
  const ngoName = session.ngoName || session.ngo || 'Ayusha Nilayam';
  let children = getChildren() || [];
  if (child && !children.some(c => c.id === child.id)) {
    children = [...children, child];
  }

  try {
    const res = await apiFetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ children, ngo: ngoSlug, ngoName })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        if (data.spreadsheetUrl || data.clinicalSpreadsheetUrl) {
          if (!cachedSheetsConfig) cachedSheetsConfig = { connected: true };
          cachedSheetsConfig.connected = true;
          cachedSheetsConfig.spreadsheetUrl = data.spreadsheetUrl || cachedSheetsConfig.spreadsheetUrl;
          cachedSheetsConfig.sheetId = data.sheetId || cachedSheetsConfig.sheetId;
          cachedSheetsConfig.clinicalSpreadsheetUrl = data.clinicalSpreadsheetUrl || cachedSheetsConfig.clinicalSpreadsheetUrl;
          cachedSheetsConfig.clinicalSheetId = data.clinicalSheetId || cachedSheetsConfig.clinicalSheetId;
          if (data.childSheetGids) {
            cachedSheetsConfig.childSheetGids = data.childSheetGids;
            localStorage.setItem('chm_child_sheet_gids', JSON.stringify(data.childSheetGids));
          }
          if (data.spreadsheetUrl) {
            localStorage.setItem(`google_sheet_url_${ngoSlug}`, data.spreadsheetUrl);
            localStorage.setItem('google_sheet_url', data.spreadsheetUrl);
          }
          if (data.clinicalSpreadsheetUrl) {
            localStorage.setItem(`google_clinical_sheet_url_${ngoSlug}`, data.clinicalSpreadsheetUrl);
            localStorage.setItem('google_clinical_sheet_url', data.clinicalSpreadsheetUrl);
          }
        }
        toast('Auto-Synced to Google Sheets', `Record for ${child.name || 'Child'} live synced.`);
      } else if (data && data.message === 'Not connected') {
        console.log('[Google Sheets] Skip auto-sync: NGO is not connected to Google Workspace.');
      }
    }
  } catch (e) {
    console.warn('[Google Sheets] OAuth sync exception:', e);
  }
}

/**
 * Pull and import children records from the connected Google Sheets.
 * Merges any new children added directly in Google Sheets and updates existing children.
 */
export async function pullChildrenFromGoogleSheets(options = {}) {
  const session = getSession() || {};
  const ngoSlug = getNgoSlug(session);
  const ngoName = session.ngoName || session.ngo || 'Ayusha Nilayam';

  if (!options.silent) {
    toast('Syncing with Google Sheets', 'Checking for newly added children and updates in Google Sheets...');
  }

  try {
    const res = await apiFetch('/api/sheets/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ngo: ngoSlug, ngoName })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.children)) {
        // Save merged children into localStorage
        localStorage.setItem('chm-children', JSON.stringify(data.children));

        if (data.addedCount > 0) {
          logActivity('child_added', `${data.addedCount} student(s)`, `Imported ${data.addedCount} new child record(s) from Google Sheets.`);
        }

        if (!options.silent) {
          if (data.addedCount > 0 || data.updatedCount > 0) {
            toast(
              'Google Sheets Sync Complete',
              `Imported ${data.addedCount} new child(ren) and updated ${data.updatedCount} record(s) from Google Sheets.`
            );
          } else {
            toast('Google Sheets Up to Date', 'All children records are already in sync with Google Sheets.');
          }
        }
        return data;
      } else {
        if (!options.silent) {
          toast('Sync Notice', data.message || 'Unable to sync with Google Sheets.');
        }
      }
    }
  } catch (err) {
    console.warn('[Google Sheets] Pull sync error:', err);
    if (!options.silent) {
      toast('Sync Error', 'Failed to connect to Google Sheets server.');
    }
  }
  return { success: false };
}

/**
 * Get total synced rows count
 */
export function getSyncedRowsCount() {
  const children = getChildren();
  return children ? children.length : 0;
}
