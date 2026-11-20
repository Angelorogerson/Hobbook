import express from 'express';
import { createFeedback, deleteFeedback, listFeedback, updateFeedback } from '../controllers/feedbackController.js';
import protect from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import isAdmin from '../middleware/isAdmin.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { reportLimiter } from '../middleware/rateLimits.js';
import { createFeedbackSchema, listFeedbackQuerySchema, updateFeedbackSchema } from '../validation/feedbackSchemas.js';

// Feedback to the operators: mounted at /api/feedback.
const router = express.Router();

router.post('/', optionalAuth, reportLimiter, validate(createFeedbackSchema), createFeedback);
router.get('/', protect, isAdmin, validate(listFeedbackQuerySchema, 'query'), listFeedback);
router.patch('/:id', validateObjectId(), protect, isAdmin, validate(updateFeedbackSchema), updateFeedback);
router.delete('/:id', validateObjectId(), protect, isAdmin, deleteFeedback);

export default router;
