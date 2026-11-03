/**
 * recordValidation.js
 * Server-side checks on fields of synced records. The browser form enforces the
 * same rules, but /api/sync accepts whatever a signed-in client sends, so the
 * server applies them again before anything is stored.
 */

const MAX_INSURANCE_ENTRIES = 20;
const MAX_TEXT_LENGTH = 120;

/** A real calendar date in YYYY-MM-DD form, as <input type="date"> produces. */
function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function cleanText(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  // Control characters are never part of an ID or a name.
  return String(value).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_TEXT_LENGTH);
}

/**
 * Health insurance entries on a person's record.
 *   - must be an array of objects; anything else becomes []
 *   - each entry keeps only id, number, insurer, startDate, expiryDate as text
 *   - an entry without its ID (number) is dropped
 *   - a date that is not a real YYYY-MM-DD date is cleared
 *   - an entry that expires before it starts is dropped
 *   - at most MAX_INSURANCE_ENTRIES entries
 * @param {any} entries
 * @returns {Array<{id: string, number: string, insurer: string, startDate: string, expiryDate: string}>}
 */
function sanitizeInsurance(entries) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of entries) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const entry = {
      id: cleanText(raw.id),
      number: cleanText(raw.number),
      insurer: cleanText(raw.insurer),
      startDate: isISODate(raw.startDate) ? raw.startDate : '',
      expiryDate: isISODate(raw.expiryDate) ? raw.expiryDate : ''
    };
    if (!entry.number) continue;
    if (entry.startDate && entry.expiryDate && entry.expiryDate < entry.startDate) continue;
    if (!entry.id || seen.has(entry.id)) entry.id = `INS-${out.length + 1}-${entry.number}`.slice(0, MAX_TEXT_LENGTH);
    seen.add(entry.id);
    out.push(entry);
    if (out.length === MAX_INSURANCE_ENTRIES) break;
  }
  return out;
}

/**
 * A child or family member record as it will be stored. Only fields with rules
 * here are touched; a record without `insurance` is returned unchanged.
 * @param {any} record
 * @returns {any}
 */
function sanitizePersonRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
  if (!('insurance' in record)) return record;
  return { ...record, insurance: sanitizeInsurance(record.insurance) };
}

module.exports = { isISODate, sanitizeInsurance, sanitizePersonRecord, MAX_INSURANCE_ENTRIES, MAX_TEXT_LENGTH };
