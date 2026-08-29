import { Router } from 'express';
import {
  createListing, searchListings, getListing, myListings,
  pendingListings, reviewListing,
} from '../controllers/listings.controller.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/search', searchListings);
router.get('/mine', requireAuth, requireRole('host', 'business_host'), myListings);
router.get('/admin/pending', requireAuth, requireRole('admin'), pendingListings);
router.patch('/admin/:id/review', requireAuth, requireRole('admin'), reviewListing);
router.get('/:id', optionalAuth, getListing);
router.post('/', requireAuth, requireRole('host', 'business_host'), createListing);

export default router;
