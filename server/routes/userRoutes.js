import { Router } from 'express';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(protect);

// Only administrators may enumerate accounts; everyone else reads their own
// profile through /auth/me.
router.get('/', authorize(ROLES.ADMIN), listUsers);
router.post('/', authorize(ROLES.ADMIN), createUser);
router.get('/:id', getUser);
router.patch('/:id', updateUser);
router.delete('/:id', authorize(ROLES.ADMIN), deleteUser);

export default router;
