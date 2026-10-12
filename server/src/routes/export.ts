import { Router } from 'express';
import { exportData, importData } from '../controllers/exportController';

const router = Router();

router.get('/export', exportData);
router.post('/import', importData);

export default router;
