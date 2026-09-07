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

// Tighter limit for OTP-related endpoints (verify, resend, forgot/reset
// password) — these guard a 6-digit code, so they need to resist rapid
// guessing far more than ordinary login traffic does.
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});
