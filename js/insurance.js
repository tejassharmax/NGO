/**
 * insurance.js
 * Health insurance on a person's record: Ayushman Bharat (PM-JAY) cards and any
 * other policy. Optional. A record can hold several entries, each valid for its
 * own date range, e.g. one per renewal or a government card alongside a private
 * policy:
 *   child.insurance = [{ id, number, insurer, startDate, expiryDate }, ...]
 * Dates are YYYY-MM-DD, as <input type="date"> gives them.
 */

import { icon, escapeHTML, formatDate } from './utils.js';

const FIELDS = ['number', 'insurer', 'startDate', 'expiryDate'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'Active', 'Upcoming' (starts later) or 'Expired', judged on `today`. */
export function insuranceStatus(entry, today = todayISO()) {
  if (entry.startDate && entry.startDate > today) return 'Upcoming';
  if (entry.expiryDate && entry.expiryDate < today) return 'Expired';
  return 'Active';
}

const STATUS_ORDER = { Active: 0, Upcoming: 1, Expired: 2 };

/** Current cover first, then upcoming, then expired; newest first within each. */
export function sortedInsurance(entries) {
  const today = todayISO();
  return (Array.isArray(entries) ? entries : [])
    .map(entry => ({ entry, status: insuranceStatus(entry, today) }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      || String(b.entry.startDate || '').localeCompare(String(a.entry.startDate || '')));
}

function periodText(entry) {
  const from = entry.startDate ? formatDate(entry.startDate) : '';
  const to = entry.expiryDate ? formatDate(entry.expiryDate) : '';
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return 'Dates not set';
}

const BADGE = { Active: 'success', Upcoming: 'warning', Expired: 'neutral' };

/**
 * Profile card listing every entry with its period and status. `stacked` adds the
 * top margin used where cards follow each other rather than sit in a grid.
 */
export function insuranceCardHTML(person, { stacked = true } = {}) {
  const items = sortedInsurance(person.insurance);
  const body = items.length
    ? `<div style="display:flex; flex-direction:column;">${items.map(({ entry, status }, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:12px 0; ${i ? 'border-top:1px solid var(--color-border);' : ''} ${status === 'Expired' ? 'opacity:0.7;' : ''}">
          <div style="min-width:0;">
            <div style="font-weight:600; font-size:14px; color:var(--color-text); overflow-wrap:anywhere;">${escapeHTML(entry.number || '—')}</div>
            <div style="font-size:12.5px; color:var(--color-text-muted);">${escapeHTML(entry.insurer || 'Insurer not specified')}</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span style="font-size:12.5px; color:var(--color-text-muted);">${escapeHTML(periodText(entry))}</span>
            <span class="badge badge--${BADGE[status]}">${status}</span>
          </div>
        </div>`).join('')}</div>`
    : `<p style="margin:0; color:var(--color-text-muted); font-size:13px;">No insurance recorded. Add an Ayushman card or other policy from Edit profile.</p>`;

  return `
      <section class="card"${stacked ? ' style="margin-top: 20px;"' : ''}>
        <header class="card__header">
          <div><h2 class="card__title">Health insurance</h2><p class="card__caption">Ayushman Bharat card and other policies, with the period each one covers</p></div>
          <button class="icon-button icon-button--small" type="button" data-edit="${escapeHTML(person.id)}" aria-label="Edit insurance">${icon('pencil')}</button>
        </header>
        <div class="card__body">${body}</div>
      </section>`;
}

function newEntryId() {
  return `INS-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** One editable entry. Inputs carry no `name`, so the main form data is unchanged. */
export function insuranceRowHTML(entry = {}) {
  const input = (label, key, type, placeholder) =>
    `<label class="field"><span class="field__label">${label}</span><input class="input" type="${type}" data-ins-field="${key}" value="${escapeHTML(entry[key] || '')}" ${placeholder ? `placeholder="${placeholder}"` : ''}></label>`;
  return `
    <div data-insurance-row data-ins-id="${escapeHTML(entry.id || newEntryId())}" style="border:1px solid var(--color-border); border-radius:8px; padding:14px; display:flex; gap:12px; align-items:flex-start;">
      <div class="form-grid--two" style="flex:1;">
        ${input('Ayushman / insurance ID', 'number', 'text', 'e.g. PM-JAY card or policy number')}
        ${input('Insurer name', 'insurer', 'text', 'e.g. Ayushman Bharat (PM-JAY)')}
        ${input('Start date', 'startDate', 'date')}
        ${input('Expiry date', 'expiryDate', 'date')}
      </div>
      <button class="icon-button icon-button--small" type="button" data-remove-insurance aria-label="Remove this insurance entry" title="Remove">${icon('trash')}</button>
    </div>`;
}

/** Edit-form section. Starts empty for a record without insurance. */
export function insuranceFormSection(person) {
  const entries = Array.isArray(person?.insurance) ? person.insurance : [];
  return `
  <section class="form-section"><div class="form-section__heading"><h2 class="card__title">Health insurance</h2><p>Optional. Add the Ayushman Bharat card or any other policy. Add a new entry for each renewal or policy period.</p></div>
    <div style="min-width:0;">
      <div data-insurance-list style="display:flex; flex-direction:column; gap:12px;">${entries.map(insuranceRowHTML).join('')}</div>
      <button class="button button--sm" type="button" data-add-insurance style="margin-top:12px; display:inline-flex; align-items:center; gap:6px;">${icon('plus')}Add insurance</button>
    </div>
  </section>`;
}

/**
 * Entries from the form, blank rows dropped. Returns undefined when the form has
 * no insurance section, so the caller keeps what the record already holds.
 */
export function collectInsurance(form) {
  const list = form.querySelector('[data-insurance-list]');
  if (!list) return undefined;
  return [...list.querySelectorAll('[data-insurance-row]')]
    .map(row => {
      const entry = { id: row.dataset.insId || newEntryId() };
      FIELDS.forEach(key => { entry[key] = (row.querySelector(`[data-ins-field="${key}"]`)?.value || '').trim(); });
      return entry;
    })
    .filter(entry => FIELDS.some(key => entry[key]));
}

/** An entry with any detail needs its ID, and cannot expire before it starts. */
function validateRow(row) {
  const get = key => row.querySelector(`[data-ins-field="${key}"]`);
  const number = get('number');
  const expiry = get('expiryDate');
  const filled = FIELDS.some(key => get(key)?.value.trim());
  number?.setCustomValidity(filled && !number.value.trim() ? 'Enter the Ayushman or insurance ID, or remove this entry.' : '');
  const start = get('startDate')?.value;
  expiry?.setCustomValidity(start && expiry.value && expiry.value < start ? 'Expiry date must be on or after the start date.' : '');
}

let listenersReady = false;

export function initInsuranceListeners() {
  if (listenersReady) return;
  listenersReady = true;

  document.addEventListener('click', (event) => {
    const add = event.target.closest('[data-add-insurance]');
    if (add) {
      const list = add.parentElement?.querySelector('[data-insurance-list]');
      if (!list) return;
      list.insertAdjacentHTML('beforeend', insuranceRowHTML());
      list.lastElementChild?.querySelector('[data-ins-field="number"]')?.focus();
      return;
    }
    const remove = event.target.closest('[data-remove-insurance]');
    if (remove) remove.closest('[data-insurance-row]')?.remove();
  });

  document.addEventListener('input', (event) => {
    const row = event.target.closest?.('[data-insurance-row]');
    if (row) validateRow(row);
  });
}
