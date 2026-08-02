import { Router } from 'express';
import { getPaymentForBooking, raiseDispute } from '../controllers/payments.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/booking/:bookingId', requireAuth, getPaymentForBooking);
router.post('/disputes', requireAuth, raiseDispute);

export default router;
