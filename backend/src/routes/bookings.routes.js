import { Router } from 'express';
import {
  createBooking, listMyBookings, listHostedBookings, listHostBookings,
  checkin, checkout, cancel, getQrPass, quoteBooking,
} from '../controllers/bookings.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, requireRole('driver'), createBooking);
router.get('/quote', requireAuth, requireRole('driver'), quoteBooking);
router.post('/quote', requireAuth, requireRole('driver'), quoteBooking);
router.get('/mine', requireAuth, listMyBookings);
router.get('/hosted', requireAuth, requireRole('host', 'business_host'), listHostedBookings);
router.get('/host', requireAuth, requireRole('host', 'business_host', 'admin'), listHostBookings);
router.post('/checkin', requireAuth, requireRole('host', 'business_host', 'admin'), checkin);
router.post('/checkout', requireAuth, requireRole('host', 'business_host', 'admin'), checkout);
router.patch('/:id/cancel', requireAuth, cancel);
router.get('/:id/pass', requireAuth, getQrPass);

export default router;
