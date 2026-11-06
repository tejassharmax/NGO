/**
 * rateLimiter.js
 * Per-client request limits, built on express-rate-limit.
 * Protects against brute-force, scraping, and endpoint abuse.
 */

const { rateLimit } = require('express-rate-limit');

/**
 * Creates an Express rate-limiting middleware. Each limiter keeps its own
 * counts, so routine syncs never use up the document-upload allowance.
 *
 * Clients are told apart by req.ip, which honours the app's `trust proxy`
 * setting: behind one proxy it is the real client address. The raw
 * X-Forwarded-For header is client-controlled and is never used directly.
 *
 * @param {object} options
 * @param {number} options.windowMs Time frame in milliseconds (e.g. 60000 = 1 min)
 * @param {number} options.max Maximum requests per windowMs
 * @param {string} [options.message] Custom error message
 * @param {(req) => void} [options.onLimit] Called each time a request is refused
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000; // 1 min default
  const max = options.max || 30; // 30 requests default
  const message = options.message || 'Too many requests. Please try again later.';

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next, opts) => {
      const retryAfterSeconds = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
      console.warn('[RateLimit] %s exceeded request limit (%d/%d)', req.ip, req.rateLimit.used, opts.limit);
      if (typeof options.onLimit === 'function') {
        try { options.onLimit(req); } catch (e) { /* the limit still applies */ }
      }
      res.status(opts.statusCode).json({ error: message, retryAfterSeconds });
    }
  });
}

module.exports = { createRateLimiter };
