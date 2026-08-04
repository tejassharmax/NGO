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
    email: "sachinsharma.hr@gmail.com",
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
  const docId = normalizedEmail.replace(/[@.]/g, '_');

  try {
    // 1. Direct document lookup by normalized email docId
    const directRef = doc(db, AUTHORIZED_USERS_COLLECTION, docId);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      const data = directSnap.data();
      return {
        email: data.email || normalizedEmail,
        ngo: data.ngo || 'Partner NGO',
        role: data.role || 'Admin',
        active: data.active !== undefined ? Boolean(data.active) : true
      };
    }

    // 2. Query collection where email field equals normalizedEmail
    const q = query(
      collection(db, AUTHORIZED_USERS_COLLECTION),
      where('email', '==', normalizedEmail)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return {
        email: data.email || normalizedEmail,
        ngo: data.ngo || 'Partner NGO',
        role: data.role || 'Admin',
        active: data.active !== undefined ? Boolean(data.active) : true
      };
    }

    // 3. Scan all documents in authorized_users collection as fail-safe (handles legacy doc IDs)
    const allSnap = await getDocs(collection(db, AUTHORIZED_USERS_COLLECTION));
    if (!allSnap.empty) {
      for (const d of allSnap.docs) {
        const data = d.data();
        if (data && data.email && data.email.trim().toLowerCase() === normalizedEmail) {
          return {
            email: data.email || normalizedEmail,
            ngo: data.ngo || 'Partner NGO',
            role: data.role || 'Admin',
            active: data.active !== undefined ? Boolean(data.active) : true
          };
        }
      }
    }
  } catch (error) {
    console.warn('Firestore user lookup notice:', error.message || error);
  }

  // 4. Fallback check against SEED_DEMO_USERS
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
