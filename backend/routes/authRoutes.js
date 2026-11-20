import express from 'express';
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '../controllers/authController.js';
import protect from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import { authLimiter } from '../middleware/rateLimits.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validation/authSchemas.js';

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', protect, getMe);

// Password reset by email
router.post('/forgot', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset', authLimiter, validate(resetPasswordSchema), resetPassword);

// Email confirmation (soft: nothing is blocked without it)
router.post('/verify', authLimiter, validate(verifyEmailSchema), optionalAuth, verifyEmail);
router.post('/verify/resend', authLimiter, protect, resendVerification);

export default router;
