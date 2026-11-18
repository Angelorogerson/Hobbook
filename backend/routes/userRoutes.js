import express from 'express';
import { updateMe, updatePassword, deleteMe, getAllUsers } from '../controllers/userController.js';
import protect from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import { publicProfile } from '../controllers/loopController.js';
import isAdmin from '../middleware/isAdmin.js';
import { authLimiter } from '../middleware/rateLimits.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { updatePasswordSchema, deleteAccountSchema } from '../validation/authSchemas.js';

const router = express.Router();

router.put('/me', protect, updateMe);
router.put('/me/password', protect, authLimiter, validate(updatePasswordSchema), updatePassword);
router.delete('/me', protect, authLimiter, validate(deleteAccountSchema), deleteMe);

router.get('/:id/profile', validateObjectId(), optionalAuth, publicProfile);

// Admin only
router.get('/', protect, isAdmin, getAllUsers);

export default router;
