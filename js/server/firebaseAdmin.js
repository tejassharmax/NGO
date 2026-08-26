/**
 * firebaseAdmin.js
 * Lazily initializes the Firebase Admin SDK for server-side Firestore access.
 *
 * WHY A GUARD AROUND PROJECT ID
 * This repo already ships a service-account key for `sinuous-tine-482007-v3`,
 * the Cloud Vision project, and `.env` points GOOGLE_APPLICATION_CREDENTIALS at
 * it. Application Default Credentials would therefore happily authenticate the
 * Admin SDK against the WRONG project and read an empty Firestore instead of the
 * app's real one in `anirudh-449ca`. Every credential source below is checked
 * against FIREBASE_PROJECT_ID and rejected on mismatch, loudly.
 *
 * WHY IT DEGRADES INSTEAD OF THROWING
 * Firestore is the intended database, but the platform must keep running on the
 * legacy data/db.json file until an `anirudh-449ca` service-account key is
 * installed. `getDb()` returns null when credentials are unavailable and the
 * callers fall back. Check the boot log to see which mode is active.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ID = (process.env.FIREBASE_PROJECT_ID || 'anirudh-449ca').trim();

/** Candidate key-file locations, tried in order after the env-var JSON. */
const KEY_FILE_CANDIDATES = [
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  path.join(__dirname, '../../serviceAccountKey.json'),
  path.join(__dirname, `../../${PROJECT_ID}-firebase-adminsdk.json`)
].filter(Boolean);

let initState = null; // { db: Firestore|null, admin: module|null, reason: string }

/**
 * Parse and validate a service-account credential object.
 * @param {string} raw JSON text
 * @param {string} source human-readable origin, for log messages
 * @returns {object|null} the parsed credential, or null when unusable
 */
function parseServiceAccount(raw, source) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn(`[firestore] Ignoring ${source}: not valid JSON (${e.message})`);
    return null;
  }

  if (parsed.type !== 'service_account' || !parsed.private_key) {
    console.warn(`[firestore] Ignoring ${source}: not a service-account key.`);
    return null;
  }

  // The guard described in the file header.
  if (parsed.project_id !== PROJECT_ID) {
    console.warn(
      `[firestore] REFUSING ${source}: key belongs to project ` +
      `"${parsed.project_id}" but this app uses "${PROJECT_ID}". ` +
      `Generate a key from the ${PROJECT_ID} Firebase console ` +
      `(Project settings -> Service accounts -> Generate new private key).`
    );
    return null;
  }

  return parsed;
}

/**
 * Locate a usable service-account credential.
 * @returns {{credential: object, source: string}|null}
 */
function findCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const credential = parseServiceAccount(
      process.env.FIREBASE_SERVICE_ACCOUNT,
      'FIREBASE_SERVICE_ACCOUNT'
    );
    if (credential) return { credential, source: 'FIREBASE_SERVICE_ACCOUNT env var' };
  }

  for (const candidate of KEY_FILE_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;
    let raw;
    try {
      raw = fs.readFileSync(candidate, 'utf8');
    } catch (e) {
      console.warn(`[firestore] Could not read ${candidate}: ${e.message}`);
      continue;
    }
    const credential = parseServiceAccount(raw, candidate);
    if (credential) return { credential, source: candidate };
  }

  return null;
}

/**
 * Initialize the Admin SDK once and cache the result.
 *
 * Uses firebase-admin's modular entry points. The legacy `admin.apps` /
 * `admin.firestore()` / `admin.auth()` namespace was removed in v14 — the default
 * export now carries only the app functions, so Firestore and Auth must come from
 * their own subpaths.
 *
 * @returns {{db: object|null, auth: object|null, reason: string}}
 */
function init() {
  if (initState) return initState;

  let appModule;
  let firestoreModule;
  let authModule;
  try {
    appModule = require('firebase-admin/app');
    firestoreModule = require('firebase-admin/firestore');
    authModule = require('firebase-admin/auth');
  } catch (e) {
    initState = { db: null, auth: null, reason: `firebase-admin not installed (${e.message})` };
    return initState;
  }

  const found = findCredential();
  if (!found) {
    initState = {
      db: null,
      auth: null,
      reason:
        `no service-account key for project "${PROJECT_ID}". Set ` +
        `FIREBASE_SERVICE_ACCOUNT (full JSON) or drop serviceAccountKey.json in ` +
        `the project root.`
    };
    console.warn(`[firestore] Disabled: ${initState.reason}`);
    console.warn('[firestore] Falling back to the legacy data/db.json file store.');
    return initState;
  }

  try {
    // A named app, so we never collide with a default app another module created.
    const APP_NAME = 'chm-admin';
    const existing = appModule.getApps().find(a => a && a.name === APP_NAME);
    const app = existing || appModule.initializeApp({
      credential: appModule.cert(found.credential),
      projectId: PROJECT_ID
    }, APP_NAME);

    // initializeFirestore carries the settings; getFirestore is for an app that
    // was already initialized (e.g. on a warm reload of this module).
    let db;
    try {
      db = firestoreModule.initializeFirestore(app, { ignoreUndefinedProperties: true });
    } catch (e) {
      db = firestoreModule.getFirestore(app);
    }

    initState = { db, auth: authModule.getAuth(app), reason: `connected via ${found.source}` };
    console.log(`[firestore] Connected to project "${PROJECT_ID}" via ${found.source}`);
    return initState;
  } catch (e) {
    initState = { db: null, auth: null, reason: `initialization failed: ${e.message}` };
    console.error(`[firestore] Disabled: ${initState.reason}`);
    return initState;
  }
}

/**
 * Firestore handle, or null when the Admin SDK could not be initialized.
 * @returns {object|null}
 */
function getDb() {
  return init().db;
}

/**
 * Firebase Admin Auth handle, or null when unavailable. Used to set the `ngo`
 * custom claim that the security rules read.
 * @returns {object|null}
 */
function getAuth() {
  return init().auth;
}

/** @returns {boolean} true when Firestore is the active database. */
function isFirestoreEnabled() {
  return Boolean(init().db);
}

/** @returns {string} human-readable status, for logs and /api/health. */
function getStatus() {
  return init().reason;
}

module.exports = { getDb, getAuth, isFirestoreEnabled, getStatus, PROJECT_ID };
