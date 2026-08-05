/**
 * firestore.js
 * Handles Cloud Firestore reads for the authorized-user allowlist.
 *
 * SECURITY MODEL
 * The allowlist is console/server-managed data (see firestore.rules). The client
 * may read only its own document and may never write. This module therefore does
 * NOT seed documents and does NOT fall back to a local list when a lookup fails:
 * a failed lookup must deny access, never grant it. The server independently
 * re-checks the allowlist on every /api request, so this check is only a UX
 * shortcut, not the security boundary.
 */

import { db } from './firebase-config.js';
import { doc, getDoc } from 'firebase/firestore';

// Collection name constant
export const AUTHORIZED_USERS_COLLECTION = 'authorized_users';

/**
 * Convert an email into its canonical Firestore document ID.
 * @param {string} email
 * @returns {string}
 */
export function emailToDocId(email) {
  return String(email || '').trim().toLowerCase().replace(/[@.]/g, '_');
}

/**
 * Look up the authorized-user record for an email.
 *
 * Returns null when the user is absent, inactive, or the lookup fails for any
 * reason. Callers must treat null as "deny".
 *
 * @param {string} email
 * @returns {Promise<{email: string, ngo: string, role: string, active: boolean}|null>}
 */
export async function getAuthorizedUser(email) {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const snap = await getDoc(
      doc(db, AUTHORIZED_USERS_COLLECTION, emailToDocId(normalizedEmail))
    );
    if (!snap.exists()) return null;

    const data = snap.data() || {};

    // The document ID is derived from the email, but verify the stored field too
    // so a mis-keyed document can never authorize the wrong account.
    const storedEmail = String(data.email || '').trim().toLowerCase();
    if (storedEmail && storedEmail !== normalizedEmail) return null;

    // Absent/!== true `active` denies. Do not default missing values to allowed.
    if (data.active !== true) return null;

    return {
      email: storedEmail || normalizedEmail,
      ngo: data.ngo || 'Partner NGO',
      role: data.role || 'Admin',
      active: true
    };
  } catch (error) {
    // Permission errors and network failures both land here. Deny.
    console.warn('Authorization lookup failed; denying access.', error?.message || error);
    return null;
  }
}
