import { Router } from 'express';
import {
  createComplaint,
  listComplaints,
  getComplaint,
  updateComplaint,
  deleteComplaint,
  assignComplaint,
  updateStatus,
} from '../controllers/complaintController.js';
import { addComment, listComments } from '../controllers/commentController.js';
import { submitFeedback } from '../controllers/feedbackController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadComplaintImages } from '../middleware/upload.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(listComplaints)
  .post(authorize(ROLES.STUDENT), uploadComplaintImages, createComplaint);

// Specific paths are declared before "/:id" so "assign" is never read as an id.
router.patch('/:id/assign', authorize(ROLES.ADMIN), assignComplaint);
router.patch('/:id/status', updateStatus);
router.route('/:id/comments')
  .get(listComments)
  .post(addComment);
router.post('/:id/feedback', authorize(ROLES.STUDENT), submitFeedback);

router.route('/:id')
  .get(getComplaint)
  .patch(updateComplaint)
  .delete(authorize(ROLES.ADMIN), deleteComplaint);

export default router;
