import { Router } from 'express';
import { listFeedback } from '../controllers/feedbackController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, listFeedback);

export default router;
