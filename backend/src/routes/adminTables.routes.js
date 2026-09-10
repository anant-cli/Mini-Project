import { Router } from 'express';
import {
  listTableDefs, listRows, createRow, updateRow, deleteRow,
  analyticsOptions, analyticsSeries,
} from '../controllers/adminTables.controller.js';

const router = Router();

router.get('/analytics/options', analyticsOptions);
router.get('/analytics/series', analyticsSeries);

router.get('/tables', listTableDefs);
router.get('/tables/:table', listRows);
router.post('/tables/:table', createRow);
router.patch('/tables/:table/:id', updateRow);
router.delete('/tables/:table/:id', deleteRow);

export default router;
