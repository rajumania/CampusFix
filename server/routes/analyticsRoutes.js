import { Router } from 'express';
import {
  dashboard,
  complaintsByCategory,
  monthlyStats,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/dashboard', dashboard);
router.get('/complaints-by-category', complaintsByCategory);
router.get('/monthly-statistics', monthlyStats);

export default router;
