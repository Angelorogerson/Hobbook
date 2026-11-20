import express from 'express';
import { listComments, createComment, deleteComment } from '../controllers/commentController.js';
import protect from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimits.js';
import { createCommentSchema } from '../validation/commentSchemas.js';

// Fragen & Infos on an event: mounted at /api/events (paths /:id/comments…).
const router = express.Router();

router.get('/:id/comments', validateObjectId(), optionalAuth, listComments);
router.post('/:id/comments', validateObjectId(), protect, writeLimiter, validate(createCommentSchema), createComment);
router.delete(
  '/:id/comments/:commentId',
  validateObjectId(),
  validateObjectId('commentId'),
  protect,
  writeLimiter,
  deleteComment
);

export default router;
