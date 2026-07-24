/**
 * firestore.js
 * Handles Cloud Firestore database operations for authorized users and NGOs.
 */

import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

// Collection name constant
export const AUTHORIZED_USERS_COLLECTION = 'authorized_users';

// Pre-configured demo accounts for Cloud Firestore seed
const SEED_DEMO_USERS = [
  {
    email: "tejassachin2010@gmail.com",
    ngo: "Ayusha Nilayam",
    role: "Admin",
    active: true
  },
  {
    email: "wondertaleai123@gmail.com",
    ngo: "Alex Agape",
    role: "Admin",
    active: true
  }
];

/**
 * Seed initial authorized NGO users into Cloud Firestore if not present
 */
export async function seedAuthorizedUsers() {
  try {
    for (const user of SEED_DEMO_USERS) {
      const docId = user.email.replace(/[@.]/g, '_');
      const userRef = doc(db, AUTHORIZED_USERS_COLLECTION, docId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          ...user,
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('Firestore seed note:', err.message || err);
  }
}

/**
 * Query Cloud Firestore for an authorized user record matching the given email
 * @param {string} email 
 * @returns {Promise<{email: string, ngo: string, role: string, active: boolean}|null>}
 */
export async function getAuthorizedUser(email) {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Primary Firestore query against 'authorized_users' collection
    const q = query(
      collection(db, AUTHORIZED_USERS_COLLECTION),
      where('email', '==', normalizedEmail)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0].data();
      return {
        email: docData.email,
        ngo: docData.ngo || 'Partner NGO',
        role: docData.role || 'Member',
        active: Boolean(docData.active)
      };
    }
  } catch (error) {
    console.warn('Firestore query fallback:', error.message || error);
  }

  // Check seed/local cache if Firestore is unreachable or offline
  const fallbackUser = SEED_DEMO_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
  if (fallbackUser) {
    return { ...fallbackUser };
  }

  return null;
}

/**
 * Fetch all authorized NGO users from Cloud Firestore to dynamically render demo account info cards
 * @returns {Promise<Array<{email: string, ngo: string, role: string, active: boolean}>>}
 */
export async function getAuthorizedUsersList() {
  try {
    const q = query(collection(db, AUTHORIZED_USERS_COLLECTION), where('active', '==', true));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs.map(d => d.data());
    }
  } catch (error) {
    console.warn('Firestore list query fallback:', error.message || error);
  }

  return [...SEED_DEMO_USERS];
}
