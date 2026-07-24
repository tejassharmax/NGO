/**
 * session.js
 * Session state manager for Firebase Authentication & Firestore User Context.
 */

const SESSION_KEY = 'chm_firebase_user_session';

/**
 * Save active authenticated user session to local storage
 * @param {Object} userData 
 */
export function saveSession(userData) {
  if (!userData) return;
  const sessionPayload = {
    uid: userData.uid,
    displayName: userData.displayName || 'Authorized User',
    email: userData.email,
    photoURL: userData.photoURL || null,
    ngo: userData.ngo || 'Partner NGO',
    role: userData.role || 'Admin',
    loginTimestamp: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
  localStorage.setItem('sample-logged-in', 'true');
  localStorage.setItem('google-user-email', userData.email);
  localStorage.setItem('sample-org-name', userData.ngo || 'Partner NGO');
}

/**
 * Get active user session
 * @returns {Object|null}
 */
export function getSession() {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

/**
 * Clear user session state
 */
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('sample-logged-in');
  localStorage.removeItem('google-user-email');
}

/**
 * Check if a valid session exists
 * @returns {boolean}
 */
export function isSessionActive() {
  return localStorage.getItem('sample-logged-in') === 'true';
}
