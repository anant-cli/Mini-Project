import { Router } from 'express';
import { signup, login, me, deleteMyAccount } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.get('/me', requireAuth, me);
router.delete('/me', requireAuth, deleteMyAccount);

export default router;
