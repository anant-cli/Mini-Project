import { Router } from 'express';
import { platformReport, listDisputes, resolveDispute, suspendUser, unsuspendUser, listUsers } from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/report', platformReport);
router.get('/disputes', listDisputes);
router.patch('/disputes/:id/resolve', resolveDispute);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/unsuspend', unsuspendUser);
router.get('/users', listUsers);

export default router;
