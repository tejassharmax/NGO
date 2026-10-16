/**
 * clinicalSection.js
 * The "Clinical & Sheet Sync" part of a health profile: the checkup and blood
 * test form, and the history of every checkup and blood test. Shared by the
 * children's home profile (router.js) and the family profile (family.js).
 */

import { icon, escapeHTML, formatDate } from './utils.js';
import { getBloodTestSheetUrl } from './googleSheetsSync.js';
import { renderClinicalSectionsMarkup } from './googleCalendar.js';
import { isFamilySpace } from './space.js';

/**
 * @param {object} child the person whose profile this is
 * @param {object[]} growth their checkups, newest first
 * @param {object[]} healthRecs their blood test reports, newest first
 * @returns {string}
 */
export function clinicalSectionHTML(child, growth, healthRecs) {
  const family = isFamilySpace();
  const childBloodSheetUrl = getBloodTestSheetUrl(child.id, child.name);
  const allClinicalHistory = [
    ...growth.map(g => ({ ...g, entryType: 'checkup', sortDate: g.date || '1970-01-01' })),
    ...healthRecs.map(h => ({ ...h, entryType: 'blood', sortDate: h.date || '1970-01-01' }))
  ].sort((a, b) => (new Date(b.sortDate).getTime() || 0) - (new Date(a.sortDate).getTime() || 0));

  const historyClinicalRowsHTML = allClinicalHistory.length === 0 ? `
    <tr><td colspan="5" class="empty-state" style="padding: 24px; text-align: center;">No ${family ? '' : 'clinical '}checkups or blood tests recorded yet for ${escapeHTML(child.name)}.</td></tr>
  ` : allClinicalHistory.map(item => {
    const isCheckup = item.entryType === 'checkup';
    const typeBadge = isCheckup
      ? `<span class="badge badge--blue" style="font-size:11px; display:inline-flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> ${family ? 'Checkup' : 'Routine Checkup (Row 3)'}</span>`
      : `<span class="badge badge--danger" style="font-size:11px; display:inline-flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> ${family ? 'Blood test' : 'Blood Test (Row 19)'}</span>`;

    const summaryHTML = isCheckup
      ? `<span>${[
          item.temperature ? `${item.temperature}°F` : '',
          item.bp ? `BP ${item.bp}` : '',
          item.weight ? `${item.weight}kg` : '',
          item.pulse ? `${item.pulse}bpm` : '',
          item.spo2 ? `SpO2 ${item.spo2}%` : ''
        ].filter(Boolean).join(' · ') || 'Vitals recorded'}</span>`
      : `<span>${[
          item.hemoglobin ? `Hb: ${item.hemoglobin} g/dL` : '',
          item.wbc ? `WBC: ${item.wbc}` : '',
          item.platelets ? `Platelets: ${item.platelets} Lakhs` : '',
          item.rbc ? `RBC: ${item.rbc}` : ''
        ].filter(Boolean).join(' · ') || 'Lab values recorded'}</span>`;

    const detailsHTML = isCheckup
      ? `${item.prescription ? `<b>Rx:</b> ${escapeHTML(item.prescription)} ` : ''}${item.complaint ? `<i>(${escapeHTML(item.complaint)})</i>` : ''}${item.eyeCheckup ? ` · Eye: ${escapeHTML(item.eyeCheckup)}` : ''}${item.clinicName || item.doctorName ? ` · ${escapeHTML([item.doctorName, item.clinicName].filter(Boolean).join(', '))}` : ''}` || '—'
      : `${item.rbcMorphology ? `RBC: ${escapeHTML(item.rbcMorphology)} ` : ''}${item.plateletsAdequacy ? `· Platelets: ${escapeHTML(item.plateletsAdequacy)}` : ''}` || '—';

    const rawData = JSON.stringify(item).replace(/"/g, '&quot;');

    return `
      <tr>
        <td style="font-weight:600; white-space:nowrap;">${item.date ? formatDate(item.date) : 'Recent'}</td>
        <td style="white-space:nowrap;">${typeBadge}</td>
        <td style="font-size:13px;">${summaryHTML}</td>
        <td style="font-size:12.5px; color:var(--color-text-muted); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${detailsHTML}</td>
        <td style="text-align:right; white-space:nowrap;">
          <button class="button button--ghost button--sm" type="button" data-load-clinical-item="${rawData}" style="display:inline-flex; align-items:center; gap:4px;">
            ${icon('pencil')} Load into Form
          </button>
          <button class="icon-button tooltip" type="button" data-tooltip="Delete entry" data-delete-clinical-item="${item.id}" data-clinical-type="${item.entryType}" style="color:var(--color-danger); margin-left:6px;">
            ${icon('trash')}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!-- Main Data Entry Form -->
    <section class="card" style="margin-bottom: 24px;">
      <form id="profile-clinical-data-form" class="clinical-sync-form" style="padding: 24px;">
        <input type="hidden" name="childId" value="${child.id}" />
        <input type="hidden" name="childName" value="${escapeHTML(child.name)}" />
        <input type="hidden" name="existingGrowthId" id="prof-growth-id" value="" />
        <input type="hidden" name="existingBloodId" id="prof-blood-id" value="" />

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 class="card__title" style="margin: 0 0 4px 0; display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              ${family ? 'Add a checkup or blood test' : 'Clinical Details &amp; Google Sheet Sync Form'}
            </h2>
            <p class="card__caption" style="margin: 0;">${family ? 'Enter the vitals from a doctor visit, or the values from a blood test report. Saving updates your records and your Google Sheet.' : 'Fill in clinical checkup vitals and blood test parameters. Saving automatically updates the database and Google Sheets.'}</p>
          </div>
          <button class="button button--primary" id="btn-save-profile-clinical" type="submit" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; padding: 8px 18px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Save &amp; Sync to Sheet
          </button>
        </div>

        <div id="prof-edit-banner" style="display: none; margin-bottom: 18px; padding: 10px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1d4ed8; font-weight: 600;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span id="prof-edit-banner-text">Editing historical clinical entry</span>
          </div>
          <button type="button" class="button button--ghost button--sm" id="prof-cancel-edit-btn" style="color: #1d4ed8; font-size: 12px; padding: 4px 12px; border-color: #bfdbfe;">
            Cancel &amp; New Entry
          </button>
        </div>

        ${renderClinicalSectionsMarkup({
          existingGrowth: {},
          existingBlood: {},
          targetDate: new Date().toISOString().slice(0, 10),
          prefix: 'prof-'
        })}

        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--color-border);">
          <button class="button button--primary" id="btn-save-profile-clinical-bottom" type="submit" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; padding: 8px 18px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Save &amp; Sync to Sheet
          </button>
        </div>
      </form>
    </section>

    <!-- History Table -->
    <section class="card">
      <header class="card__header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 class="card__title">${family ? 'Checkups &amp; test history' : 'Clinical &amp; Lab History'}</h2>
          <p class="card__caption">${family ? 'Every checkup and blood test' : 'All routine clinical checkups and blood test reports'} recorded for ${escapeHTML(child.name)}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          ${childBloodSheetUrl ? `<a href="${escapeHTML(childBloodSheetUrl)}" target="_blank" class="button button--ghost button--sm" style="font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--color-border);">🩸 Blood test sheet ↗</a>` : ''}
          <span class="badge badge--neutral">${allClinicalHistory.length} total entries</span>
        </div>
      </header>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Measurements / Key Values</th>
              <th>Clinical Remarks / Prescription</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${historyClinicalRowsHTML}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
