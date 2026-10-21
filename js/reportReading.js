/**
 * reportReading.js
 * "Read the values from this report": the choice in the upload dialogs, the
 * progress window while a report is read, and filling the person's blood test
 * form with what was found.
 *
 * Nothing is saved from here. The values go into the blood test form on the
 * person's Checkups & tests tab, marked for checking, and are saved only when
 * the person presses Save there: the same path, and the same Google Sheet
 * columns, as values typed by hand.
 */

import { readReportText } from './reportReader.js';
import { parseBloodReport } from './bloodReportParser.js';
import { escapeHTML, pagePath } from './utils.js';
import { toast } from './toast.js';

const PREFILL_KEY = 'chm-report-prefill';

/** Upload categories that hold blood test results. */
export function isBloodReportType(docType) {
  return /lab report|cbc|blood|medical report/i.test(String(docType || ''));
}

/** Form field id (after the "prof-" prefix) for each value the reader finds. */
const FIELD_IDS = {
  hemoglobin: 'blood-hb',
  wbc: 'blood-wbc',
  platelets: 'blood-platelets',
  rbc: 'blood-rbc',
  pcv: 'blood-pcv',
  neutrophil: 'blood-neutrophil',
  lymphocytes: 'blood-lymphocytes',
  eosinophils: 'blood-eosinophils',
  monocytes: 'blood-monocytes',
  basophils: 'blood-basophils',
  plateletsAdequacy: 'blood-platelets-adequacy',
  rbcMorphology: 'blood-rbc-morph',
  wbcMorphology: 'blood-wbc-morph'
};

const FIELD_COUNT = Object.keys(FIELD_IDS).length;

/** The choice shown in the upload dialogs when the category is a blood or lab report. */
export function readingChoiceHTML(docType) {
  const show = isBloodReportType(docType);
  return `
    <fieldset class="report-reading" data-report-reading ${show ? '' : 'hidden'}>
      <legend class="field__label">Blood test values</legend>
      <label class="report-reading__option">
        <input type="radio" name="valuesEntry" value="type" checked>
        <span><b>I'll type the values myself</b><small>Add them later on the Checkups &amp; tests tab.</small></span>
      </label>
      <label class="report-reading__option">
        <input type="radio" name="valuesEntry" value="read">
        <span><b>Read the values from this report</b> <em class="badge badge--blue">Beta</em><small>The values are filled in for you to check before saving. Nothing is saved until you press Save.</small></span>
      </label>
    </fieldset>`;
}

/** Show the choice only for blood and lab report categories. */
export function initReadingChoiceToggle() {
  document.addEventListener('change', event => {
    const select = event.target.closest('#profile-doc-upload-form [name="docType"], #direct-doc-form [name="docType"]');
    if (!select) return;
    const fieldset = select.form && select.form.querySelector('[data-report-reading]');
    if (!fieldset) return;
    const show = isBloodReportType(select.value);
    fieldset.hidden = !show;
    if (!show) fieldset.querySelector('input[value="type"]').checked = true;
  });
}

/** True when the dialog asked for the values to be read. */
export function wantsReading(form) {
  const fieldset = form && form.querySelector('[data-report-reading]');
  return !!(fieldset && !fieldset.hidden && fieldset.querySelector('input[value="read"]')?.checked);
}

function progressWindow(fileName) {
  document.querySelector('#report-reading-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'report-reading-overlay';
  overlay.className = 'report-reading-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'report-reading-title');
  overlay.innerHTML = `
    <div class="card report-reading-overlay__card">
      <h2 id="report-reading-title">Reading the report…</h2>
      <p class="report-reading-overlay__file">${escapeHTML(fileName || '')}</p>
      <div class="progress"><div class="progress__bar" data-reading-bar style="width:5%"></div></div>
      <p class="report-reading-overlay__status" data-reading-status aria-live="polite">Getting ready</p>
      <p class="report-reading-overlay__note">This stays on your device. A photo can take up to a minute.</p>
    </div>`;
  document.body.appendChild(overlay);
  const bar = overlay.querySelector('[data-reading-bar]');
  const status = overlay.querySelector('[data-reading-status]');
  return {
    update({ stage, page, pages, progress }) {
      let pct = 5;
      let text = 'Getting ready';
      if (stage === 'pdf') { pct = 10 + Math.round(((page || 1) / (pages || 1)) * 30); text = `Reading page ${page} of ${pages}`; }
      if (stage === 'loading') { pct = 15; text = 'Loading the text recogniser (first time only)'; }
      if (stage === 'ocr') {
        const done = ((page || 1) - 1 + (progress || 0)) / (pages || 1);
        pct = 20 + Math.round(done * 75);
        text = pages > 1 ? `Recognising text, page ${page} of ${pages}` : 'Recognising text';
      }
      bar.style.width = `${Math.min(pct, 97)}%`;
      status.textContent = text;
    },
    close() { overlay.remove(); }
  };
}

/**
 * Read the report and keep the values for the person's blood test form.
 * Never throws: when nothing can be read the upload carries on as usual.
 * @returns {Promise<boolean>} true when values were found
 */
export async function readReportForForm(file, { childId, childName, title }) {
  const progress = progressWindow(file && file.name);
  try {
    const { text, source } = await readReportText(file, p => progress.update(p));
    const { values, found, date, lines } = parseBloodReport(text, { ocr: source !== 'pdf' });
    if (!found.length) {
      toast('No blood test values found', 'The report is saved. Add the values yourself on the Checkups & tests tab.', 'info');
      return false;
    }
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify({ childId, childName, title, values, date, lines, source, at: Date.now() }));
    sessionStorage.setItem('chm_active_profile_tab', 'clinical');
    return true;
  } catch (err) {
    console.warn('[Report reading]', err);
    if (err && err.code === 'blurry') {
      toast('Photo too blurry to read', 'The report is saved. To have the values read, upload a sharper photo (page flat, good light, phone held steady) or the lab\'s PDF. You can also type them on the Checkups & tests tab.');
    } else {
      toast('Could not read this report', 'The report is saved. Add the values yourself on the Checkups & tests tab.', 'info');
    }
    return false;
  } finally {
    progress.close();
  }
}

/**
 * Where the page should go after an upload: the person's profile when values
 * are waiting to be checked, otherwise the page it was on.
 */
export function reloadAfterUpload() {
  const pending = pendingPrefill();
  if (pending && pending.childId) {
    window.location.href = `${pagePath('child-profile')}?id=${encodeURIComponent(pending.childId)}`;
  }
  window.location.reload();
}

/**
 * The values waiting for the form. They are kept for a few seconds after they
 * are first shown, because the page can be drawn again while it loads.
 */
function pendingPrefill() {
  try {
    const p = JSON.parse(sessionStorage.getItem(PREFILL_KEY) || 'null');
    const now = Date.now();
    // Values not shown within 10 minutes belong to an abandoned upload.
    const fresh = p && now - (p.at || 0) < 10 * 60 * 1000 && (!p.shownAt || now - p.shownAt < 20 * 1000);
    if (fresh) return p;
  } catch (e) { }
  sessionStorage.removeItem(PREFILL_KEY);
  return null;
}

/**
 * On the person's profile, put the values read from their report into the
 * blood test form and mark them for checking. Called after every render.
 */
export function applyReportPrefill() {
  const pending = pendingPrefill();
  if (!pending) return;
  const form = document.querySelector('#profile-clinical-data-form');
  const childId = form && form.querySelector('[name="childId"]')?.value;
  if (!form || childId !== pending.childId) return;
  if (!pending.shownAt) sessionStorage.setItem(PREFILL_KEY, JSON.stringify({ ...pending, shownAt: Date.now() }));
  const forget = () => sessionStorage.removeItem(PREFILL_KEY);

  const filled = [];
  Object.entries(FIELD_IDS).forEach(([key, id]) => {
    const input = form.querySelector(`#prof-${id}`);
    if (!input) return;
    if (pending.values[key] !== undefined) {
      input.value = pending.values[key];
      input.classList.add('clinical-input--read');
      if (pending.lines && pending.lines[key]) input.title = `Read from: ${pending.lines[key]}`;
      filled.push(input);
    } else {
      input.value = '';
    }
  });
  const dateInput = form.querySelector('#prof-blood-date');
  if (dateInput && pending.date) {
    dateInput.value = pending.date;
    dateInput.classList.add('clinical-input--read');
    filled.push(dateInput);
  }
  // A new entry, not an edit of an older one.
  const bloodId = form.querySelector('#prof-blood-id');
  if (bloodId) bloodId.value = '';

  const count = Object.keys(pending.values).length;
  const banner = document.createElement('div');
  banner.className = 'report-read-banner';
  banner.setAttribute('role', 'status');
  banner.innerHTML = `
    <div>
      <b>${count} of ${FIELD_COUNT} values read from “${escapeHTML(pending.title || 'the report')}”${pending.date ? '' : ' (date not found: set it below)'}</b>
      <p>Check each highlighted value against the report and correct anything that is wrong. Hover a value to see the line it was read from. Nothing is saved until you press <b>Save &amp; Sync to Sheet</b>.</p>
    </div>
    <button type="button" class="button button--ghost button--sm" data-clear-report-read>Clear these values</button>`;
  const anchor = form.querySelector('#prof-edit-banner') || form.firstElementChild;
  anchor.parentNode.insertBefore(banner, anchor);

  const clearMarks = () => {
    form.querySelectorAll('.clinical-input--read').forEach(el => { el.classList.remove('clinical-input--read'); el.removeAttribute('title'); });
    banner.remove();
  };
  banner.querySelector('[data-clear-report-read]').addEventListener('click', () => {
    Object.values(FIELD_IDS).forEach(id => { const el = form.querySelector(`#prof-${id}`); if (el) el.value = ''; });
    forget();
    clearMarks();
  });
  form.addEventListener('input', event => { forget(); event.target.classList.remove('clinical-input--read'); });
  form.addEventListener('submit', () => { forget(); clearMarks(); }, { once: true });

  if (!pending.shownAt) (filled[0] || banner).scrollIntoView({ behavior: 'smooth', block: 'center' });
}
