/**
 * auth.js
 * Firebase Authentication service utilizing GoogleAuthProvider and Cloud Firestore Authorization.
 */

import { auth, googleProvider } from './firebase-config.js';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getAuthorizedUser } from './firestore.js';
import { saveSession, clearSession } from './session.js';

/**
 * Perform Google Authentication flow with Cloud Firestore authorization check
 * @returns {Promise<{success: boolean, message?: string, user?: Object, errorCode?: string}>}
 */
export async function loginWithGoogle() {
  try {
    // 1. Firebase Google Popup Sign-In
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    if (!fbUser || !fbUser.email) {
      return {
        success: false,
        errorCode: 'NO_EMAIL',
        message: 'Could not retrieve email from Google Account.'
      };
    }

    const email = fbUser.email.toLowerCase();
    const displayName = fbUser.displayName || email.split('@')[0] || 'Authorized User';

    // 2. Query Cloud Firestore for authorization record in 'authorized_users' collection
    const userDoc = await getAuthorizedUser(email);

    // 3. Validate existence and active status against Cloud Firestore
    if (!userDoc || !userDoc.active) {
      // Immediately sign out from Firebase if email is not in Firestore authorized_users
      await firebaseSignOut(auth);
      clearSession();

      return {
        success: false,
        errorCode: 'ACCESS_DENIED',
        message: `Access Denied\n\nThe Google account (${email}) is not authorized to access this workspace.\nOnly approved NGO admin accounts listed in Cloud Firestore are permitted.`,
        email: email
      };
    }

    // 4. Create Session and save state with actual Google Account details & Firestore NGO context
    const sessionUser = {
      uid: fbUser.uid,
      displayName: displayName,
      email: email,
      photoURL: fbUser.photoURL || null,
      ngo: userDoc.ngo || 'Ayusha Nilayam',
      role: userDoc.role || 'Admin'
    };

    saveSession(sessionUser);

    return {
      success: true,
      user: sessionUser,
      message: `Welcome, ${sessionUser.displayName}`
    };

  } catch (error) {
    console.error('Firebase Auth Error:', error);

    // Handle domain authorization restriction (domain not in Firebase console OAuth whitelist)
    if (error.code === 'auth/unauthorized-domain' || (error.message && error.message.includes('unauthorized-domain'))) {
      return {
        success: false,
        errorCode: 'UNAUTHORIZED_DOMAIN',
        message: 'Domain Authorization Required:\nPlease add "ngo-4xde.onrender.com" to Authorized Domains in Firebase Console -> Authentication -> Settings -> Authorized Domains.'
      };
    }

    // Clean user-friendly error handling
    if (error.code === 'auth/popup-closed-by-user') {
      return {
        success: false,
        errorCode: 'POPUP_CLOSED',
        message: 'Sign-in cancelled. The Google popup was closed before completing.'
      };
    }

    if (error.code === 'auth/network-request-failed') {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Network connection issue. Please check your internet connection and try again.'
      };
    }

    if (error.code === 'auth/cancelled-popup-request') {
      return {
        success: false,
        errorCode: 'CANCELLED',
        message: 'Another authentication popup is already active.'
      };
    }

    return {
      success: false,
      errorCode: 'FIREBASE_ERROR',
      message: 'Unable to authenticate with Google. Please try again.'
    };
  }
}

/**
 * Sign out user from Firebase and clear local session state
 */
export async function logoutUser() {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn('Firebase SignOut Warning:', e);
  } finally {
    clearSession();
  }
}

/**
 * Monitor Firebase Authentication State Persistence
 * @param {Function} callback 
 */
export function initAuthListener(callback) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser && fbUser.email) {
      const email = fbUser.email.toLowerCase();
      const userDoc = await getAuthorizedUser(email);

      if (userDoc && userDoc.active) {
        const sessionUser = {
          uid: fbUser.uid,
          displayName: fbUser.displayName || 'Authorized User',
          email: email,
          photoURL: fbUser.photoURL || null,
          ngo: userDoc.ngo || 'Partner NGO',
          role: userDoc.role || 'Admin'
        };
        saveSession(sessionUser);
        if (callback) callback(sessionUser);
      } else {
        await firebaseSignOut(auth);
        clearSession();
        if (callback) callback(null);
      }
    } else {
      clearSession();
      if (callback) callback(null);
    }
  });
}
