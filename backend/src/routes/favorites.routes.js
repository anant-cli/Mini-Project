import { Router } from 'express';
import {
  listFavorites, listFavoriteIds, saveFavorite, deleteFavorite,
} from '../controllers/favorites.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireRole('driver'), listFavorites);
router.get('/ids', requireAuth, requireRole('driver'), listFavoriteIds);
router.post('/:locationId', requireAuth, requireRole('driver'), saveFavorite);
router.delete('/:locationId', requireAuth, requireRole('driver'), deleteFavorite);

export default router;
