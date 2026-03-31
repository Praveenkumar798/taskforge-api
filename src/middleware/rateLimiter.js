const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Strict rate limiter for authentication endpoints.
 * Prevents brute-force attacks on login/register.
 */
const authLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs, // 15 minutes
  max: env.rateLimitMax,           // 10 attempts per window
  message: {
    error: 'Too many requests',
    message: 'Too many authentication attempts. Please try again later.',
    retryAfter: `${Math.ceil(env.rateLimitWindowMs / 60000)} minutes`,
  },
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,   // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => req.ip, // Rate limit per IP
});

/**
 * General API rate limiter — more permissive.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
