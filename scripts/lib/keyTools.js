// Shared by scripts/change-key.js and scripts/recover-ids-from-sheet.js.
// See KEY-RECOVERY.md for when to use each.
const fs = require('fs');
const { parseKey } = require('../../js/server/fieldCrypto');

/** A key from a file holding either "FIELD_ENCRYPTION_KEY=..." or just the key. */
function readKeyFile(path) {
  if (!path) throw new Error('A key file path is required');
  const text = fs.readFileSync(path, 'utf8');
  const raw = (text.match(/FIELD_ENCRYPTION_KEY\s*=\s*(\S+)/) || [null, text.trim()])[1];
  const key = parseKey(raw);
  if (!key) throw new Error(`${path} does not hold a valid key (32 bytes, base64)`);
  return key;
}

/** --name value pairs and bare --flags from process.argv. */
function args() {
  const out = { _: [] };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const name = a[i].slice(2);
      if (a[i + 1] !== undefined && !a[i + 1].startsWith('--')) out[name] = a[++i];
      else out[name] = true;
    } else {
      out._.push(a[i]);
    }
  }
  return out;
}

/** RFC 4180 CSV (quoted fields, doubled quotes, line breaks inside quotes) to rows. */
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const s = String(text).replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c !== ''));
}

/**
 * The full IDs held in a master directory sheet (Sheet1), by child id:
 *   { idNumber, insurance: [{ number, insurer, startDate, expiryDate }] }
 * Insurance comes from "All Insurance Entries" (one entry per line,
 * "number · insurer · start to expiry"), falling back to the current-policy
 * columns when that cell is empty.
 */
function idsFromSheetRows(rows) {
  const [header, ...data] = rows;
  const col = name => (header || []).findIndex(h => String(h || '').trim().toLowerCase() === name);
  const idCol = (header || []).findIndex(h => ['id', 'member id'].includes(String(h || '').trim().toLowerCase()));
  const aadhaarCol = col('aadhaar id');
  const allCol = col('all insurance entries');
  const cur = { number: col('insurance id'), insurer: col('insurer'), from: col('insurance valid from'), to: col('insurance valid to') };
  const clean = v => String(v == null ? '' : v).replace(/^'/, '').trim();
  const isoOrBlank = v => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

  const out = new Map();
  for (const r of data) {
    const childId = clean(r[idCol]);
    if (!childId) continue;
    const insurance = [];
    const all = allCol >= 0 ? clean(r[allCol]) : '';
    if (all) {
      for (const line of all.split(/\r?\n/)) {
        const parts = line.split(' · ').map(p => p.trim());
        if (!parts[0]) continue;
        const [from = '', to = ''] = (parts[2] || '').split(' to ').map(x => x.trim());
        insurance.push({
          number: parts[0].replace(/^'/, ''),
          insurer: parts[1] === 'Insurer not specified' ? '' : (parts[1] || ''),
          startDate: isoOrBlank(from),
          expiryDate: isoOrBlank(to)
        });
      }
    } else if (cur.number >= 0 && clean(r[cur.number])) {
      insurance.push({
        number: clean(r[cur.number]),
        insurer: cur.insurer >= 0 ? clean(r[cur.insurer]) : '',
        startDate: cur.from >= 0 ? isoOrBlank(clean(r[cur.from])) : '',
        expiryDate: cur.to >= 0 ? isoOrBlank(clean(r[cur.to])) : ''
      });
    }
    out.set(childId, { idNumber: aadhaarCol >= 0 ? clean(r[aadhaarCol]) : '', insurance });
  }
  return out;
}

module.exports = { readKeyFile, args, parseCSV, idsFromSheetRows };
