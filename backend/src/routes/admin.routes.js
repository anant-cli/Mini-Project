import { Router } from 'express';
import {
  platformReport, listDisputes, resolveDispute, suspendUser, unsuspendUser,
  listUsers, deleteUserByAdmin, listAllListings,
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import adminTablesRoutes from './adminTables.routes.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// Generic "browse/edit any table" + dashboard analytics engine — see
// adminTables.routes.js / adminTables.controller.js / config/adminTables.js.
router.use('/', adminTablesRoutes);

router.get('/report', platformReport);
router.get('/disputes', listDisputes);
router.patch('/disputes/:id/resolve', resolveDispute);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/unsuspend', unsuspendUser);
router.get('/users', listUsers);
router.delete('/users/:id', deleteUserByAdmin);
router.get('/listings', listAllListings);

export default router;
