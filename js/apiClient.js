/**
 * apiClient.js
 * Single entry point for all calls to the app's own backend.
 *
 * Two things every /api call needs and used to lack:
 *  1. A RELATIVE URL. Absolute http://localhost:3000 URLs were compiled into the
 *     production bundle, so deployed browsers called their own machine and every
 *     save silently failed.
 *  2. A Firebase ID token. The server verifies this and re-checks the allowlist,
 *     so authorization no longer depends on client-side checks alone.
 */

import { auth } from './firebase-config.js';

/**
 * Current user's Firebase ID token, or null when signed out.
 *
 * Waits for Firebase to restore the persisted session first. On a page load
 * `auth.currentUser` is null for a moment while the SDK rehydrates from browser
 * storage; without this wait the app's startup sync would fire unauthenticated
 * and get a 401 even though the user is signed in.
 *
 * Firebase refreshes the token automatically when it is close to expiring.
 * @returns {Promise<string|null>}
 */
async function getIdToken() {
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (e) {
    console.warn('Could not obtain ID token:', e?.message || e);
    return null;
  }
}

/**
 * fetch() wrapper for backend endpoints.
 * @param {string} path Root-relative path, e.g. '/api/sync'
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  const token = await getIdToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(path, { ...options, headers });
}

/**
 * apiFetch for JSON request/response pairs.
 * Returns null when the request fails or the user is not authorized, so callers
 * can degrade gracefully instead of throwing.
 * @param {string} path
 * @param {any} body
 * @returns {Promise<any|null>}
 */
export async function apiPostJSON(path, body) {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      console.warn(`[api] ${path} rejected: not authorized.`);
    }
    return null;
  }

  return res.json();
}
