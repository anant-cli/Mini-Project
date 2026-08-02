import { Router } from 'express';
import { addCharger, getChargersForLocation, setChargerStatus } from '../controllers/ev.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/location/:locationId', getChargersForLocation);
router.post('/', requireAuth, requireRole('host', 'business_host'), addCharger);
router.patch('/:id/status', requireAuth, requireRole('host', 'business_host'), setChargerStatus);

export default router;
