/**
 * integrationStore.js
 * Persistence for each NGO's Google Workspace connection.
 *
 * WHAT IS STORED
 * The OAuth refresh token, the connecting admin's email, and the IDs/URLs of the
 * spreadsheets and documents already created in that NGO's Drive.
 *
 * WHY THIS MODULE EXISTS
 * This state used to live only in data/integrations/<slug>.json. On a host with an
 * ephemeral filesystem — Render rebuilds the disk on every deploy and wipes it
 * again whenever a free instance spins down — that file disappears. The visible
 * symptom is that Google Workspace shows "disconnected" after each deploy, and
 * reconnecting creates a *second* spreadsheet because the stored sheetId is gone,
 * leaving duplicate copies of the medical records in Drive. Moving the state to
 * Firestore makes the connection survive restarts.
 *
 * WHERE IT IS STORED, AND WHY NOT UNDER ngos/{slug}
 * Top-level `integrations/{slug}`, not `ngos/{slug}/settings/...`. The rules grant
 * an NGO's admins read access to everything under their own `ngos/{slug}` tree, so
 * a refresh token placed there would be readable by any signed-in admin's browser.
 * `integrations/**` is covered by the catch-all deny in firestore.rules, so only
 * the server — which uses the Admin SDK and bypasses rules — can ever see it.
 *
 * The file store remains the fallback for local development without a
 * service-account key, so `npm start` on a laptop behaves exactly as before.
 */

const fs = require('fs');
const path = require('path');

const { getDb, isFirestoreEnabled } = require('./firebaseAdmin');

/** Firestore collection holding one document per NGO. */
const COLLECTION = 'integrations';

/** Legacy on-disk location, still used when Firestore is unavailable. */
const INTEGRATIONS_DIR = path.join(__dirname, '../../data/integrations');

/**
 * Normalize a slug for use as a document ID or filename.
 * Matches the sanitizer in googleOAuth.js so a slug cannot resolve to two
 * different records depending on which module wrote it.
 * @param {string} ngoSlug
 * @returns {string}
 */
function safeSlug(ngoSlug) {
  return (ngoSlug || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
}

/* ───────────────────────────────────────────────────────
   FILE BACKEND (local development fallback)
   ─────────────────────────────────────────────────────── */

function filePath(ngoSlug) {
  return path.join(INTEGRATIONS_DIR, `${safeSlug(ngoSlug)}.json`);
}

function readFromFile(ngoSlug) {
  try {
    const target = filePath(ngoSlug);
    if (!fs.existsSync(target)) return {};
    return JSON.parse(fs.readFileSync(target, 'utf8') || '{}');
  } catch (err) {
    console.warn(`[integrations] Could not read ${filePath(ngoSlug)}: ${err.message}`);
    return {};
  }
}

function writeToFile(ngoSlug, data) {
  try {
    if (!fs.existsSync(INTEGRATIONS_DIR)) {
      fs.mkdirSync(INTEGRATIONS_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath(ngoSlug), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`[integrations] Could not write ${filePath(ngoSlug)}: ${err.message}`);
    return false;
  }
}

/* ───────────────────────────────────────────────────────
   PUBLIC API
   ─────────────────────────────────────────────────────── */

/**
 * Read one NGO's stored Google Workspace connection.
 *
 * Never throws: a Firestore outage degrades to the file copy rather than taking
 * down the Sheets routes, which would otherwise return 500 on every request.
 *
 * @param {string} ngoSlug
 * @returns {Promise<object>} stored fields, or {} when nothing is connected
 */
async function loadIntegration(ngoSlug) {
  const slug = safeSlug(ngoSlug);

  if (isFirestoreEnabled()) {
    try {
      const snap = await getDb().collection(COLLECTION).doc(slug).get();
      if (snap.exists) return snap.data() || {};
      // Nothing in Firestore yet. A deployment that connected Google before this
      // module existed still has the token on disk locally, so adopt it.
      return readFromFile(slug);
    } catch (err) {
      console.warn(`[integrations] Firestore read failed for ${slug}: ${err.message}`);
      return readFromFile(slug);
    }
  }

  return readFromFile(slug);
}

/**
 * Persist one NGO's Google Workspace connection.
 *
 * Firestore is authoritative when available; the file copy is still written so a
 * developer who later runs without a key does not lose the connection. Undefined
 * fields are dropped, because Firestore rejects them.
 *
 * @param {string} ngoSlug
 * @param {object} data
 * @returns {Promise<boolean>} true when at least one backend accepted the write
 */
async function saveIntegration(ngoSlug, data) {
  const slug = safeSlug(ngoSlug);
  const clean = {};
  Object.keys(data || {}).forEach(key => {
    if (data[key] !== undefined) clean[key] = data[key];
  });

  let stored = false;

  if (isFirestoreEnabled()) {
    try {
      // Not merged: callers delete keys to disconnect, and a merge would
      // resurrect the refresh token they just removed.
      await getDb().collection(COLLECTION).doc(slug).set(clean);
      stored = true;
    } catch (err) {
      console.error(`[integrations] Firestore write failed for ${slug}: ${err.message}`);
    }
  }

  // On Render this write lands on a disk that will not survive the next deploy;
  // it is a convenience for local runs, not the record of truth.
  const wroteFile = writeToFile(slug, clean);

  return stored || wroteFile;
}

module.exports = { loadIntegration, saveIntegration, safeSlug, COLLECTION };
