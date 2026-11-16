import express from 'express';
import { updateMe, updatePassword, deleteMe, getAllUsers } from '../controllers/userController.js';
import protect from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';
import { authLimiter } from '../middleware/rateLimits.js';

const router = express.Router();

router.put('/me', protect, updateMe);
router.put('/me/password', protect, authLimiter, updatePassword);
router.delete('/me', protect, authLimiter, deleteMe);

// Admin only
router.get('/', protect, isAdmin, getAllUsers);

export default router;
