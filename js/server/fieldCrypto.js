/**
 * fieldCrypto.js
 * Field-level encryption for government and insurance IDs (Aadhaar, Ayushman /
 * insurance numbers). These are encrypted with AES-256-GCM before they reach
 * Firestore and decrypted only on the server. The browser receives them masked
 * to the last four characters; the full value is sent only through the logged
 * reveal endpoint.
 *
 * Stored form: "enc:v1:<iv>:<tag>:<ciphertext>", each part base64url.
 * Key: FIELD_ENCRYPTION_KEY, 32 random bytes in base64 (generate with
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))").
 * Losing the key makes the stored IDs unrecoverable, so keep a copy offline.
 */

const crypto = require('crypto');

const PREFIX = 'enc:v1:';
const MASK_CHAR = '•';
/** Shown in place of a value that is stored but cannot be decrypted (wrong or missing key). */
const LOCKED = '•••• (locked)';

/** A base64 key string as a 32-byte Buffer, or null when it is not one. */
function parseKey(raw) {
  const s = String(raw || '').trim();
  const buf = s ? Buffer.from(s, 'base64') : null;
  return buf && buf.length === 32 ? buf : null;
}

let cachedKey;
function key() {
  if (cachedKey !== undefined) return cachedKey;
  const raw = (process.env.FIELD_ENCRYPTION_KEY || '').trim();
  cachedKey = parseKey(raw);
  if (raw && !cachedKey) console.error('[crypto] FIELD_ENCRYPTION_KEY must be 32 bytes in base64; field encryption is OFF.');
  return cachedKey;
}

function isEncryptionReady() {
  return !!key();
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** True for a value the browser was sent masked and sent back unchanged. */
function isMasked(value) {
  return typeof value === 'string' && value.includes(MASK_CHAR);
}

function encrypt(plain) {
  return encryptWith(plain, key());
}

/** Encrypt with an explicit key (the key-change and recovery tools use this). */
function encryptWith(plain, k) {
  if (!k) throw new Error('Field encryption key is not configured');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, ct].map(b => b.toString('base64url')).join(':');
}

/** Plain text, or null when the value cannot be decrypted. Plain input is returned as is. */
function decrypt(value) {
  return decryptWith(value, key());
}

/** Decrypt with an explicit key; null when that key does not fit. */
function decryptWith(value, k) {
  if (!isEncrypted(value)) return value;
  if (!k) return null;
  try {
    const [iv, tag, ct] = value.slice(PREFIX.length).split(':').map(p => Buffer.from(p, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', k, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
}

/**
 * Last four characters kept, the rest replaced: "1234 5678 9012" -> "•••• •••• 9012",
 * "PMJAY-1234-5678" -> "••••••••••-5678". Spaces and dashes keep their places.
 */
function mask(value) {
  if (!value) return value;
  if (isMasked(value)) return value;
  const s = String(value);
  let keep = 4;
  const out = [];
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    if (/[A-Za-z0-9]/.test(ch)) {
      out.unshift(keep > 0 ? ch : MASK_CHAR);
      keep--;
    } else {
      out.unshift(ch);
    }
  }
  // Too short to show four characters and still hide anything.
  return s.replace(/[^A-Za-z0-9]/g, '').length <= 4 ? MASK_CHAR.repeat(4) : out.join('');
}

/* ─── The sensitive fields of a person record ─── */

/** Calls fn(get, set) for each sensitive value on a record. */
function eachSensitive(person, fn) {
  if (!person || typeof person !== 'object') return;
  if (person.idNumber) {
    fn(() => person.idNumber, v => { person.idNumber = v; }, { field: 'idNumber' });
  }
  if (Array.isArray(person.insurance)) {
    person.insurance.forEach(entry => {
      if (entry && entry.number) {
        fn(() => entry.number, v => { entry.number = v; }, { field: 'insurance', entryId: entry.id });
      }
    });
  }
}

function clone(person) {
  return person && typeof person === 'object' ? JSON.parse(JSON.stringify(person)) : person;
}

/** Stored value for one field of a stored record, matched by field and entry id. */
function storedValue(stored, field, entryId) {
  if (!stored) return undefined;
  if (field === 'idNumber') return stored.idNumber;
  const entry = (stored.insurance || []).find(e => e && e.id === entryId);
  return entry ? entry.number : undefined;
}

/**
 * A record as it is written to Firestore. Each sensitive value is encrypted;
 * when it matches what is already stored, the stored ciphertext is kept so an
 * unchanged record is not rewritten. A masked value means "unchanged" and keeps
 * the stored one; with nothing stored it is dropped rather than saved.
 * Without a key the record is written as it is (local development only).
 */
function protectForStorage(person, previousStored) {
  const ready = isEncryptionReady();
  const out = clone(person);
  eachSensitive(out, (get, set, where) => {
    const value = get();
    const prev = storedValue(previousStored, where.field, where.entryId);
    if (!ready) {
      // Development without a key: never store a masked value in place of a real one.
      if (isMasked(value)) set(prev && !isMasked(prev) ? prev : '');
      return;
    }
    if (isEncrypted(value)) return;
    if (isMasked(value)) { set(isEncrypted(prev) ? prev : ''); return; }
    if (isEncrypted(prev) && decrypt(prev) === value) { set(prev); return; }
    set(encrypt(value));
  });
  if (Array.isArray(out.insurance)) out.insurance = out.insurance.filter(e => e && e.number);
  return out;
}

/** A stored record decrypted for use on the server (Sheets sync, merges, pull). */
function revealForServer(person) {
  const out = clone(person);
  eachSensitive(out, (get, set) => {
    const plain = decrypt(get());
    set(plain === null ? LOCKED : plain);
  });
  return out;
}

/** A record as the browser receives it: sensitive values masked. */
function maskForClient(person) {
  const out = clone(person);
  eachSensitive(out, (get, set) => set(mask(get())));
  return out;
}

/**
 * Put the server's real values back where the browser sent masked ones, so
 * merges and the Sheets sync work on real values. Matching is by child id, then
 * field (and insurance entry id).
 */
function unmaskFromStored(people, storedPeople) {
  const byId = new Map((storedPeople || []).filter(p => p && p.id).map(p => [p.id, p]));
  return (people || []).map(person => {
    if (!person || typeof person !== 'object') return person;
    const stored = byId.get(person.id);
    const out = clone(person);
    eachSensitive(out, (get, set, where) => {
      if (!isMasked(get())) return;
      const real = storedValue(stored, where.field, where.entryId);
      set(real && !isMasked(real) ? real : (real === LOCKED ? LOCKED : ''));
    });
    if (Array.isArray(out.insurance)) out.insurance = out.insurance.filter(e => e && e.number);
    return out;
  });
}

/** JSON string of a children array, mapped record by record; bad input passes through. */
function mapChildrenJSON(json, fn) {
  try {
    const arr = JSON.parse(json || '[]');
    return Array.isArray(arr) ? JSON.stringify(arr.map(fn)) : json;
  } catch (e) {
    return json;
  }
}

/** A /api/sync payload with every child record masked for the browser. */
function maskPayload(payload) {
  if (!payload || typeof payload !== 'object' || !payload['chm-children']) return payload;
  return { ...payload, 'chm-children': mapChildrenJSON(payload['chm-children'], maskForClient) };
}

module.exports = {
  MASK_CHAR,
  LOCKED,
  isEncryptionReady,
  isEncrypted,
  isMasked,
  encrypt,
  decrypt,
  parseKey,
  encryptWith,
  decryptWith,
  eachSensitive,
  mask,
  storedValue,
  protectForStorage,
  revealForServer,
  maskForClient,
  unmaskFromStored,
  mapChildrenJSON,
  maskPayload
};
