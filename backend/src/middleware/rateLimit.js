import rateLimit from 'express-rate-limit';

// Throttles brute-force / credential-stuffing attempts against login & signup.
// 10 requests per 15 minutes per IP is generous for real users, punishing for scripts.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});
