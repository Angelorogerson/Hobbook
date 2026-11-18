import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import protect from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimits.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validation/authSchemas.js';

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', protect, getMe);

export default router;
