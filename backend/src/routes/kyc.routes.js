import { Router } from 'express';
import { submitKyc, myKycStatus, adminPendingKyc, adminReviewKyc } from '../controllers/kyc.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireEmailVerified } from '../middleware/kyc.js';

const router = Router();

router.post('/', requireAuth, requireEmailVerified, submitKyc);
router.get('/me', requireAuth, myKycStatus);
router.get('/admin/pending', requireAuth, requireRole('admin'), adminPendingKyc);
router.patch('/admin/:id/review', requireAuth, requireRole('admin'), adminReviewKyc);

export default router;
