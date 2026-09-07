import { Router } from 'express';
import {
  signup, login, me, deleteMyAccount,
  verifyEmail, resendOtp, forgotPassword, resetPassword,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.get('/me', requireAuth, me);
router.delete('/me', requireAuth, deleteMyAccount);

router.post('/verify-email', requireAuth, otpRateLimiter, verifyEmail);
router.post('/resend-otp', requireAuth, otpRateLimiter, resendOtp);
router.post('/forgot-password', otpRateLimiter, forgotPassword);
router.post('/reset-password', otpRateLimiter, resetPassword);

export default router;
