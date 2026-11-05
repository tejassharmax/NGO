/**
 * reveal.js
 * Aadhaar and insurance IDs arrive from the server masked to their last four
 * characters. A Reveal button asks the server for the full value, which shows
 * for 30 seconds and is never kept in the page's copy of the records. The
 * server records every reveal in its audit log.
 */

import { apiFetch } from './apiClient.js';
import { icon, escapeHTML } from './utils.js';
import { toast } from './toast.js';
import { getSession } from './session.js';

const MASK_CHAR = '•';
const SHOW_FOR_MS = 30000;

export function isMaskedValue(value) {
  return typeof value === 'string' && value.includes(MASK_CHAR);
}

export const PARTLY_EDITED_MESSAGE = 'Type the full number. The dots hide the saved one; delete them first.';

/** A masked field whose dots were edited instead of replaced. */
export function partlyEditedMask(input) {
  return !!input && !!input.dataset.maskedOriginal && isMaskedValue(input.value) && input.value !== input.dataset.maskedOriginal;
}

/** Is the signed-in account an Admin? Roles are stored as "Admin" or "admin". */
export function isAdmin() {
  return String(getSession()?.role || 'Admin').trim().toLowerCase() === 'admin';
}

/**
 * A masked value with its Reveal button.
 * @param {string} value masked text from the server
 * @param {string} childId
 * @param {'idNumber'|'insurance'} field
 * @param {string} [entryId] insurance entry id
 */
export function maskedValueHTML(value, childId, field, entryId = '') {
  const text = `<span data-reveal-text>${escapeHTML(value)}</span>`;
  if (!isMaskedValue(value)) return text;
  return `<span style="display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;">${text}<button class="button button--sm button--ghost" type="button" data-reveal-id="${escapeHTML(childId)}" data-reveal-field="${field}" data-reveal-entry="${escapeHTML(entryId)}" aria-label="Reveal the full number" style="min-height:26px; padding:0 8px; font-size:11.5px; display:inline-flex; align-items:center; gap:4px;">${icon('eye')}Reveal</button></span>`;
}

let ready = false;

export function initRevealListeners() {
  if (ready) return;
  ready = true;

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-reveal-id]');
    if (!button) return;
    const holder = button.parentElement?.querySelector('[data-reveal-text]');
    if (!holder) return;
    const masked = holder.textContent;
    button.disabled = true;
    try {
      const res = await apiFetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: button.dataset.revealId,
          field: button.dataset.revealField,
          entryId: button.dataset.revealEntry || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.value) throw new Error(data.error || 'Could not reveal this number');
      holder.textContent = data.value;
      // The button's inline display style would override the hidden attribute.
      button.style.display = 'none';
      setTimeout(() => {
        if (!holder.isConnected) return;
        holder.textContent = masked;
        button.style.display = 'inline-flex';
        button.disabled = false;
      }, SHOW_FOR_MS);
    } catch (err) {
      button.disabled = false;
      toast('Could not reveal', err.message);
    }
  });

  // A masked value in a form is kept unless replaced: focusing it selects it all,
  // so typing replaces the whole number instead of editing the dots.
  document.addEventListener('focusin', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !isMaskedValue(input.value)) return;
    if (!input.dataset.maskedOriginal) input.dataset.maskedOriginal = input.value;
    // After the click has placed the caret, so the selection sticks.
    setTimeout(() => input.select(), 0);
  });

  // Partly editing the dots would leave a value the server reads as "unchanged",
  // silently keeping the old number. Require the whole number instead.
  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.maskedOriginal) return;
    // Insurance rows run this check inside their own validation (insurance.js).
    if (input.closest('[data-insurance-row]')) return;
    input.setCustomValidity(partlyEditedMask(input) ? PARTLY_EDITED_MESSAGE : '');
  });
}
