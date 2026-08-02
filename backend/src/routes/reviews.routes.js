import { Router } from 'express';
import { reviewLocation, reviewDriver, listLocationReviews } from '../controllers/reviews.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/location/:locationId', listLocationReviews);
router.post('/location', requireAuth, requireRole('driver'), reviewLocation);
router.post('/driver', requireAuth, requireRole('host', 'business_host'), reviewDriver);

export default router;
