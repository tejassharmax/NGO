/**
 * rateLimiter.js
 * In-memory rate limiting middleware for sensitive API endpoints.
 * Protects against brute-force, scraping, and endpoint abuse.
 */

/**
 * Creates an Express rate-limiting middleware.
 * @param {object} options
 * @param {number} options.windowMs Time frame in milliseconds (e.g. 60000 = 1 min)
 * @param {number} options.max Maximum requests per windowMs
 * @param {string} [options.message] Custom error message
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000; // 1 min default
  const max = options.max || 30; // 30 requests default
  const message = options.message || 'Too many requests. Please try again later.';

  // One counter map per limiter. A shared map made every limiter count every
  // limited request, so routine syncs used up the document-upload allowance.
  const requestCounts = new Map();

  // Housekeeping interval to clear expired entries every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requestCounts.entries()) {
      if (now > data.resetTime) {
        requestCounts.delete(ip);
      }
    }
  }, 120000).unref();

  return (req, res, next) => {
    // req.ip honours the app's `trust proxy` setting, so behind one proxy it is the
    // real client address. The raw X-Forwarded-For header is client-controlled
    // and let anyone reset their own limit by sending a different value.
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let record = requestCounts.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      requestCounts.set(ip, record);
    }

    record.count++;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      console.warn(`[RateLimit] IP ${ip} exceeded request limit (${record.count}/${max})`);
      return res.status(429).json({ error: message, retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000) });
    }

    next();
  };
}

module.exports = { createRateLimiter };
