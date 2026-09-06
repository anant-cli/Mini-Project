import { Router } from 'express';
import {
  createListing, searchListings, getListing, myListings,
  pendingListings, reviewListing,
} from '../controllers/listings.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireVerifiedIdentity } from '../middleware/kyc.js';

const router = Router();

router.get('/search', requireAuth, searchListings);
router.get('/mine', requireAuth, requireRole('host', 'business_host'), myListings);
router.get('/admin/pending', requireAuth, requireRole('admin'), pendingListings);
router.patch('/admin/:id/review', requireAuth, requireRole('admin'), reviewListing);
router.get('/:id', requireAuth, getListing);
router.post('/', requireAuth, requireRole('host', 'business_host'), requireVerifiedIdentity, createListing);

export default router;
