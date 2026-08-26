#!/usr/bin/env node
/**
 * scripts/setupFirestore.js
 * One-time setup for the per-NGO Firestore database.
 *
 * Two jobs, both idempotent — re-running is safe and cheap:
 *
 *   1. CLAIMS  Stamp the `ngo` custom claim onto every allowlisted Firebase Auth
 *              user, reading the tenant from their `authorized_users` document.
 *              firestore.rules checks `request.auth.token.ngo`, and a claim is
 *              the only tenant signal a browser cannot forge.
 *
 *   2. IMPORT  Copy the legacy global data/db.json into `ngos/{slug}/...` so the
 *              existing roster survives the switch. Uses the same writeSnapshot
 *              the live sync endpoint uses, so the stored shape cannot drift.
 *
 * USAGE
 *   node scripts/setupFirestore.js --dry-run            # print the plan, change nothing
 *   node scripts/setupFirestore.js --ngo "Alex Agape"   # claims + import into that NGO
 *   node scripts/setupFirestore.js --claims             # claims only
 *   node scripts/setupFirestore.js --import --ngo "..." # import only
 *
 * The import destination matters: it must be an NGO some allowlisted admin
 * actually belongs to, or the children land in a folder nobody can read. The
 * script prints the account-to-NGO grouping first and refuses a destination with
 * no owners.
 *
 * REQUIRES a service-account key for the Firebase project. See
 * js/server/firebaseAdmin.js for where it looks; without one this script exits
 * with instructions rather than silently doing nothing.
 */

const fs = require('fs');
const path = require('path');

const { getDb, getAuth, isFirestoreEnabled, getStatus, PROJECT_ID } =
  require('../js/server/firebaseAdmin');
const { sanitizeNgoSlug, writeSnapshot, readSnapshot, DEFAULT_NGO } =
  require('../js/server/ngoStore');
const { mergeNamespace } = require('../js/server/syncMerge');

const DB_FILE = path.join(__dirname, '../data/db.json');

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const ONLY_CLAIMS = argv.includes('--claims');
const ONLY_IMPORT = argv.includes('--import');
const DO_CLAIMS = ONLY_CLAIMS || !ONLY_IMPORT;
const DO_IMPORT = ONLY_IMPORT || !ONLY_CLAIMS;

/** Value of a `--flag value` pair, or null. */
function flagValue(name) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
}

const NGO_OVERRIDE = flagValue('--ngo');

/* ───────────────────────────────────────────────────────
   0. PREFLIGHT: WHO SHARES WHICH DATABASE?
   ─────────────────────────────────────────────────────── */

/**
 * Report which NGO folder each allowlisted admin will read and write.
 *
 * The `ngo` field is the most consequential value in the whole setup. Admins
 * sharing a value share one children list; admins with different values get
 * separate, mutually invisible databases. Both are legitimate — colleagues at one
 * NGO want the former, genuinely separate organisations the latter — but nothing
 * errors either way, so the only way to catch a typo is to look at the grouping.
 *
 * Slugging absorbs harmless differences (case, extra spaces, punctuation), so
 * only a real difference in wording splits a tenant: "Alex Agape" and
 * "alex  agape" share a database, "Alex Agape" and "Ayusha Nilayam" do not.
 *
 * @returns {Promise<Map<string, {name: string, emails: string[]}>>} slug -> members
 */
async function preflightTenants() {
  const db = getDb();
  if (!db) throw new Error('Admin SDK unavailable');

  const snap = await db.collection('authorized_users').get();
  const groups = new Map();

  snap.forEach(doc => {
    const data = doc.data() || {};
    const email = String(data.email || doc.id).trim().toLowerCase();
    const rawNgo = data.ngo ? String(data.ngo) : '';
    const slug = sanitizeNgoSlug(rawNgo || DEFAULT_NGO);

    if (!groups.has(slug)) {
      groups.set(slug, { name: rawNgo || `(no ngo field — defaulted to ${DEFAULT_NGO})`, emails: [] });
    }
    groups.get(slug).emails.push(email + (data.active === true ? '' : '  [INACTIVE]'));
  });

  console.log(`\n[preflight] ${snap.size} allowlisted account(s), grouped by database:`);
  groups.forEach((group, slug) => {
    const shared = group.emails.length > 1 ? ' — these accounts share one children list' : '';
    console.log(`\n  ngos/${slug}   (ngo: "${group.name}")${shared}`);
    group.emails.forEach(e => console.log(`    - ${e}`));
  });

  if (groups.size > 1) {
    console.log(
      `\n[preflight] ${groups.size} separate databases. Accounts in different groups\n` +
      `            cannot see each other's children. Intended for separate NGOs; if\n` +
      `            two of these are colleagues, make their \`ngo\` fields match in the\n` +
      `            Firebase console and re-run.`
    );
  }

  return groups;
}

/* ───────────────────────────────────────────────────────
   1. CUSTOM CLAIMS
   ─────────────────────────────────────────────────────── */

/**
 * Give every allowlisted account an `ngo` custom claim matching its
 * authorized_users document.
 *
 * A user who has never signed in has no Firebase Auth record yet, so there is
 * nothing to stamp; they are reported and skipped. Re-run after their first
 * sign-in. Claims only reach a browser on the next token refresh (within an
 * hour, or immediately after a sign-out/sign-in).
 *
 * @returns {Promise<{updated: number, skipped: number, missing: string[]}>}
 */
async function syncCustomClaims() {
  const db = getDb();
  const auth = getAuth();
  if (!db || !auth) throw new Error('Admin SDK unavailable');

  const snap = await db.collection('authorized_users').get();
  console.log(`\n[claims] ${snap.size} document(s) in authorized_users`);

  let updated = 0;
  let skipped = 0;
  const missing = [];

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const email = String(data.email || '').trim().toLowerCase();
    if (!email) {
      console.warn(`[claims] ${doc.id}: no email field, skipping`);
      continue;
    }

    const slug = sanitizeNgoSlug(data.ngo || 'Ayusha Nilayam');

    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        missing.push(email);
        continue;
      }
      throw e;
    }

    const existing = user.customClaims || {};
    if (existing.ngo === slug) {
      console.log(`[claims] ${email}: already "${slug}"`);
      skipped++;
      continue;
    }

    console.log(
      `[claims] ${email}: ${existing.ngo ? `"${existing.ngo}" -> ` : ''}"${slug}"` +
      (DRY_RUN ? '  (dry run)' : '')
    );
    if (!DRY_RUN) {
      // Merge, so any unrelated claim set elsewhere survives.
      await auth.setCustomUserClaims(user.uid, { ...existing, ngo: slug });
    }
    updated++;
  }

  if (missing.length) {
    console.log(
      `\n[claims] ${missing.length} allowlisted account(s) have no Firebase Auth ` +
      `record yet (they have never signed in). Re-run this script after their ` +
      `first sign-in:\n  ${missing.join('\n  ')}`
    );
  }

  return { updated, skipped, missing };
}

/* ───────────────────────────────────────────────────────
   2. IMPORT data/db.json
   ─────────────────────────────────────────────────────── */

/**
 * Copy the legacy file store into one NGO's Firestore tree.
 *
 * Merged against whatever is already in Firestore using the live sync rules, so
 * running this after some data has been synced cannot lose the newer records —
 * the file's rows are added, not swapped in.
 *
 * @param {string} ngoName display name of the destination NGO
 * @returns {Promise<{writes: number, deletes: number}|null>}
 */
async function importFileStore(ngoName) {
  if (!fs.existsSync(DB_FILE)) {
    console.log(`\n[import] No ${DB_FILE} to import. Nothing to do.`);
    return null;
  }

  let fileData;
  try {
    fileData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  } catch (e) {
    throw new Error(`Could not parse ${DB_FILE}: ${e.message}`);
  }

  const slug = sanitizeNgoSlug(ngoName);
  console.log(`\n[import] data/db.json -> ngos/${slug}`);

  // Report what is about to move, so a mistake is visible before it lands.
  Object.keys(fileData).sort().forEach(key => {
    const value = fileData[key];
    if (typeof value !== 'string') return;
    let count = null;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) count = parsed.length;
    } catch (e) { }
    console.log(`[import]   ${key}: ${count === null ? JSON.stringify(value) : `${count} record(s)`}`);
  });

  const { payload: current, index } = await readSnapshot(slug);
  // The file is the "client" here: its non-empty roster wins, exactly as a
  // browser's would, and every other collection union-merges.
  const merged = mergeNamespace(fileData, current);

  if (DRY_RUN) {
    console.log('[import] dry run — no writes performed');
    return null;
  }

  const result = await writeSnapshot(slug, merged, index);
  console.log(`[import] ${result.writes} write(s), ${result.deletes} delete(s)`);
  return result;
}

/* ───────────────────────────────────────────────────────
   ENTRY POINT
   ─────────────────────────────────────────────────────── */

async function main() {
  console.log(`Firestore setup for project "${PROJECT_ID}"`);
  console.log(`Status: ${getStatus()}`);

  if (!isFirestoreEnabled()) {
    console.error(
      '\nCannot continue: no usable service-account key.\n' +
      `  1. Firebase console -> project "${PROJECT_ID}" -> Project settings ->\n` +
      '     Service accounts -> Generate new private key\n' +
      '  2. Save it as serviceAccountKey.json in the project root, or set\n' +
      '     FIREBASE_SERVICE_ACCOUNT to the full JSON.\n' +
      '\nNote: GOOGLE_APPLICATION_CREDENTIALS in .env points at the Cloud Vision\n' +
      'project and is deliberately refused — a key from the wrong project would\n' +
      'connect to an empty database that looks real.'
    );
    process.exit(1);
  }

  if (DRY_RUN) console.log('\n*** DRY RUN — nothing will be written ***');

  const groups = await preflightTenants();

  if (DO_CLAIMS) {
    const { updated, skipped } = await syncCustomClaims();
    console.log(`[claims] ${updated} updated, ${skipped} already correct`);
  }

  if (DO_IMPORT) {
    const target = NGO_OVERRIDE || DEFAULT_NGO;
    const targetSlug = sanitizeNgoSlug(target);
    const owners = groups.get(targetSlug);

    // The one mistake that fails silently: importing the existing roster into a
    // folder no admin resolves to. Nothing errors — the children simply never
    // appear for anyone, and the app looks like it lost them.
    if (!owners) {
      const options = [...groups.entries()]
        .map(([slug, g]) => `  --ngo "${g.name}"    -> ngos/${slug}  (${g.emails.length} admin(s))`)
        .join('\n');
      console.error(
        `\n[import] REFUSING to import into ngos/${targetSlug}: no allowlisted account\n` +
        `         has ngo "${target}", so the imported children would be invisible to\n` +
        `         everyone. Pick a destination that an admin actually belongs to:\n\n${options}\n`
      );
      process.exit(2);
    }

    console.log(
      `\n[import] Destination ngos/${targetSlug} is owned by: ${owners.emails.join(', ')}`
    );
    await importFileStore(target);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('\nSetup failed:', err.message);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});
