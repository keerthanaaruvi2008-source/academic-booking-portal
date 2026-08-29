/**
 * @fileoverview Security and rate limiting middleware.
 * Provides sliding-window IP rate limiters and recursive NoSQL injection sanitizers.
 */

import { HTTP_STATUS } from '../config/constants.js';

/**
 * Creates a configurable in-memory sliding-window rate limiter middleware.
 *
 * @param {object} options
 * @param {number} [options.windowMs=900000] - Window duration in milliseconds (default 15 mins).
 * @param {number} [options.max=100] - Maximum requests allowed per window per IP.
 * @param {string} [options.message='Too many requests. Please try again later.'] - Error message.
 * @param {string} [options.code='RATE_LIMIT_EXCEEDED'] - Error code.
 * @returns {import('express').RequestHandler}
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests. Please try again later.',
  code = 'RATE_LIMIT_EXCEEDED',
} = {}) => {
  const requests = new Map();

  return (req, res, next) => {
    // In test environment, allow bypassing with header or higher limits unless explicitly testing rate limits
    if (process.env.NODE_ENV === 'test' && req.headers['x-bypass-rate-limit']) {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = requests.get(ip) || [];
    // Filter timestamps within the current window
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= max) {
      const retryAfterSeconds = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);

      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        error: {
          message,
          code,
        },
      });
    }

    timestamps.push(now);
    requests.set(ip, timestamps);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - timestamps.length));

    next();
  };
};

/**
 * Strict rate limiter for authentication routes.
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

/**
 * General rate limiter for standard API routes.
 */
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'API rate limit exceeded. Please throttle requests.',
  code: 'API_RATE_LIMIT_EXCEEDED',
});

/**
 * Recursively removes keys starting with '$' or containing '.' to prevent NoSQL operator injection.
 *
 * @param {any} obj - Input object / payload to clean.
 * @returns {any} Sanitized object.
 */
const cleanNoSql = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanNoSql);
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      // Omit prohibited NoSQL operator key
      continue;
    }
    cleaned[key] = cleanNoSql(value);
  }
  return cleaned;
};

/**
 * Middleware to sanitize req.body, req.query, and req.params against NoSQL query operator injection.
 *
 * @type {import('express').RequestHandler}
 */
export const sanitizeNoSql = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanNoSql(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanNoSql(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanNoSql(req.params);
  }
  next();
};
