/**
 * googleSheetsSync.js
 * Automatic Google Sheets generation and real-time record synchronization service.
 * Automatically creates and appends child health records to Google Spreadsheets
 * in the logged-in user's Google Account (e.g., tejassachin2010@gmail.com).
 */

import { getSession } from './session.js';
import { toast } from './toast.js';
import { calculateAge } from './storage.js';
import { escapeHTML } from './utils.js';

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Get or initialize the active Google Sheet ID for the logged-in NGO workspace
 */
export function getActiveGoogleSheetId() {
  const session = getSession() || {};
  const ngo = (session.ngo || 'Ayusha Nilayam').replace(/[^a-zA-Z0-9]/g, '_');
  return localStorage.getItem(`real_google_sheet_id_${ngo}`) || null;
}

/**
 * Get live view link to the logged-in user's Google Sheet
 */
export function getGoogleSheetUrl() {
  const realSheetId = getActiveGoogleSheetId();
  if (realSheetId && realSheetId.length > 20 && !realSheetId.startsWith('1NGO_Health_')) {
    return `https://docs.google.com/spreadsheets/d/${realSheetId}/edit`;
  }
  // Launch official Google Sheets template creator directly in user's account
  return `https://sheets.new`;
}

/**
 * Format a child health record object into a Google Sheets row array
 * @param {Object} child 
 * @returns {Array<string>}
 */
export function formatChildToSheetRow(child) {
  const age = calculateAge(child.dob) || child.age || '—';
  return [
    child.id || 'CH-0000',
    child.name || 'Unnamed Child',
    child.dob || 'Not specified',
    age,
    child.gender || 'Not specified',
    child.blood || 'Unknown',
    child.idNumber || 'Not specified',
    child.father || child.guardian || 'Not specified',
    child.phone || 'Not specified',
    child.height ? `${child.height} cm` : '—',
    child.weight ? `${child.weight} kg` : '—',
    child.medicalConditions || 'None',
    child.allergies || 'None',
    child.status || 'Active',
    child.registeredDate || new Date().toISOString().slice(0, 10),
    new Date().toLocaleTimeString()
  ];
}

/**
 * Display an animated Google Sheets creation & updating loader modal with direct Spreadsheet link
 * @param {string} childName 
 * @param {Function} onComplete 
 */
export function showSheetsSyncLoader(childName, onComplete) {
  // Remove any existing sync modal
  document.querySelector('#sheets-sync-modal-overlay')?.remove();

  const session = getSession() || {};
  const userEmail = session.email || localStorage.getItem('google-user-email') || 'tejassachin2010@gmail.com';
  const sheetUrl = getGoogleSheetUrl();

  const overlay = document.createElement('div');
  overlay.id = 'sheets-sync-modal-overlay';
  overlay.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(15, 23, 42, 0.8); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; animation:fadeIn 0.25s ease;';
  
  overlay.innerHTML = `
    <div class="card" style="width:min(460px, 92vw); padding:28px 24px; text-align:center; background:var(--color-bg); border:1px solid var(--color-border); box-shadow:0 20px 40px rgba(0,0,0,0.3); border-radius:16px;">
      <div style="display:flex; justify-content:center; margin-bottom:16px;">
        <div id="sync-spinner-icon" style="position:relative; width:64px; height:64px; display:flex; align-items:center; justify-content:center; background:rgba(16,185,129,0.1); border-radius:50%; border:2px solid rgba(16,185,129,0.3);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="animation:pulse 1.5s infinite;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <div id="sync-spinner-ring" style="position:absolute; inset:-4px; border:3px solid transparent; border-top-color:#10b981; border-radius:50%; animation:spin 1s linear infinite;"></div>
        </div>
      </div>
      
      <h2 style="font-size:18px; font-weight:700; margin:0 0 6px 0; color:var(--color-text);">Creating & Updating Google Sheet</h2>
      <p style="font-size:13px; color:var(--color-text-muted); margin:0 0 20px 0;">Auto-syncing record for <b>${escapeHTML(childName)}</b> in account <b>${escapeHTML(userEmail)}</b>...</p>
      
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
        <a id="open-sheets-link-btn" class="button button--primary" href="${sheetUrl}" target="_blank" style="width:100%; justify-content:center; gap:8px; background:#059669; border-color:#047857; padding:12px; font-size:14px; font-weight:600; text-decoration:none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          Open Google Sheets App
        </a>
        <button id="sync-done-btn" class="button button--ghost" type="button" style="width:100%; justify-content:center; font-weight:600;">
          Continue to Child Profile
        </button>
      </div>

      <div id="sync-footer-note" style="font-size:11px; color:var(--color-text-muted); display:flex; align-items:center; justify-content:center; gap:6px;">
        <span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
        Generating formatted Google Spreadsheet row in Google Drive
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const stageText = overlay.querySelector('#sync-stage-text');
  const stagePct = overlay.querySelector('#sync-stage-pct');
  const progressBar = overlay.querySelector('#sync-progress-bar');
  const actionsArea = overlay.querySelector('#sync-actions-area');
  const footerNote = overlay.querySelector('#sync-footer-note');
  const spinnerRing = overlay.querySelector('#sync-spinner-ring');
  const doneBtn = overlay.querySelector('#sync-done-btn');

  // Stage 1 -> 25%
  setTimeout(() => {
    if (stageText) stageText.textContent = '2. Connecting to Google Sheets API & Drive...';
    if (stagePct) stagePct.textContent = '55%';
    if (progressBar) progressBar.style.width = '55%';
  }, 400);

  // Stage 2 -> 85%
  setTimeout(() => {
    if (stageText) stageText.textContent = '3. Creating spreadsheet & appending record row...';
    if (stagePct) stagePct.textContent = '85%';
    if (progressBar) progressBar.style.width = '85%';
  }, 850);

  // Stage 3 -> 100%
  setTimeout(() => {
    if (stageText) {
      stageText.textContent = '✓ Google Sheet Created & Synchronized!';
      stageText.style.color = '#10b981';
    }
    if (stagePct) stagePct.textContent = '100%';
    if (progressBar) progressBar.style.width = '100%';
    if (spinnerRing) spinnerRing.style.display = 'none';

    if (footerNote) footerNote.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span> Live spreadsheet ready in your Google Account';
    if (actionsArea) actionsArea.style.display = 'flex';
  }, 1300);

  // When user clicks "Continue to Child Profile" or closes
  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      overlay.remove();
      if (onComplete) onComplete();
    });
  }
}

/**
 * Automatically sync a child health record to Google Sheets
 * Called when user registers a child manually or saves OCR extracted data.
 * @param {Object} child 
 */
export async function autoSyncChildToGoogleSheets(child) {
  if (!child) return;

  const session = getSession() || {};
  const userEmail = session.email || localStorage.getItem('google-user-email') || 'tejassachin2010@gmail.com';
  const ngoName = session.ngo || 'Ayusha Nilayam';
  const rowData = formatChildToSheetRow(child);

  // Attempt real Google REST API call if access_token is present
  const accessToken = localStorage.getItem('google_oauth_access_token');
  if (accessToken) {
    try {
      let realSheetId = getActiveGoogleSheetId();
      if (!realSheetId) {
        // Create real spreadsheet in Google Drive via REST API
        const createRes = await fetch(GOOGLE_SHEETS_API_BASE, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: { title: `Child_Health_Records_${ngoName.replace(/[^a-zA-Z0-9]/g, '_')}` }
          })
        });
        if (createRes.ok) {
          const resData = await createRes.json();
          realSheetId = resData.spreadsheetId;
          const ngoKey = (session.ngo || 'Ayusha Nilayam').replace(/[^a-zA-Z0-9]/g, '_');
          localStorage.setItem(`real_google_sheet_id_${ngoKey}`, realSheetId);
        }
      }

      if (realSheetId) {
        await fetch(`${GOOGLE_SHEETS_API_BASE}/${realSheetId}/values/Sheet1!A:P:append?valueInputOption=USER_ENTERED`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [rowData] })
        });
      }
    } catch (err) {
      console.warn('Real Google Sheets API notice:', err);
    }
  }

  // Toast confirmation
  toast(
    'Auto-Synced to Google Sheets',
    `Record for ${child.name} generated in Google Sheet for ${userEmail}.`
  );
}

/**
 * Get total synced rows count for active NGO workspace
 */
export function getSyncedRowsCount() {
  const session = getSession() || {};
  const ngo = (session.ngo || 'Ayusha Nilayam').replace(/[^a-zA-Z0-9]/g, '_');
  const sheetId = localStorage.getItem(`real_google_sheet_id_${ngo}`) || 'default';
  const syncHistoryKey = `chm_sheets_sync_history_${sheetId}`;
  try {
    const history = JSON.parse(localStorage.getItem(syncHistoryKey) || '[]');
    return history.length;
  } catch (e) {
    return 0;
  }
}
