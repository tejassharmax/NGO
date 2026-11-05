/**
 * auditLog.js
 * Security audit trail: ID reveals, deletions, role refusals and other
 * sensitive actions. Entries go to the top-level `auditLogs` collection, which
 * the Firestore rules give no client access to (nothing in firestore.rules
 * matches it, so it is denied), and which /api/sync never reads.
 * A failed write is logged to the console and never blocks the request.
 */

const { isFirestoreEnabled, getDb } = require('./firebaseAdmin');

/**
 * @param {import('express').Request} req
 * @param {string} action e.g. 'reveal-id', 'delete-child', 'denied'
 * @param {object} [details] what was acted on; never the revealed value itself
 */
function audit(req, action, details = {}) {
  const entry = {
    at: new Date().toISOString(),
    action,
    email: (req && req.user && req.user.email) || null,
    role: (req && req.user && req.user.role) || null,
    ngo: (req && req.tenantSlug) || null,
    ip: (req && req.ip) || null,
    path: (req && req.originalUrl) || null,
    ...details
  };
  console.log('[audit] %s %s %j', entry.action, entry.email, details);
  if (!isFirestoreEnabled()) return;
  try {
    const db = getDb();
    if (db) db.collection('auditLogs').add(entry).catch(err => console.warn('[audit] write failed:', err.message));
  } catch (err) {
    console.warn('[audit] write failed:', err.message);
  }
}

module.exports = { audit };
