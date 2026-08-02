import { Router } from 'express';
import { createBooking, listMyBookings, checkin, checkout, cancel } from '../controllers/bookings.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, requireRole('driver'), createBooking);
router.get('/mine', requireAuth, listMyBookings);
router.post('/checkin', requireAuth, requireRole('host', 'business_host'), checkin);
router.post('/checkout', requireAuth, requireRole('host', 'business_host'), checkout);
router.patch('/:id/cancel', requireAuth, cancel);

export default router;
