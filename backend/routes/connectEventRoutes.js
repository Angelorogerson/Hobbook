import express from 'express';
import {
  getEvents,
  getMyEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
  saveEvent,
  unsaveEvent,
  getAllEventsAdmin,
  joinWaitlist,
  answerEvent,
  decideEvent,
  markNoShows,
  disputeNoShow,
  confirmPromotion,
} from '../controllers/connectEventController.js';
import protect from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import isAdmin from '../middleware/isAdmin.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimits.js';
import {
  createEventSchema,
  updateEventSchema,
  cancelEventSchema,
  listEventsQuerySchema,
} from '../validation/eventSchemas.js';
import { answerSchema, decideSchema, noShowsSchema, disputeSchema } from '../validation/groupSchemas.js';

const router = express.Router();

// Public reads (optionalAuth marks joined/isOrganizer for signed-in viewers)
router.get('/', optionalAuth, validate(listEventsQuerySchema, 'query'), getEvents);

// Signed-in
router.get('/me', protect, getMyEvents);

// Admin
router.get('/admin/all', protect, isAdmin, getAllEventsAdmin);

router.get('/:id', validateObjectId(), optionalAuth, getEventById);
router.post('/', protect, writeLimiter, validate(createEventSchema), createEvent);
router.patch('/:id', validateObjectId(), protect, writeLimiter, validate(updateEventSchema), updateEvent);
router.post('/:id/cancel', validateObjectId(), protect, writeLimiter, validate(cancelEventSchema), cancelEvent);
router.delete('/:id', validateObjectId(), protect, writeLimiter, deleteEvent);
router.post('/:id/join', validateObjectId(), protect, writeLimiter, joinEvent);
router.post('/:id/leave', validateObjectId(), protect, writeLimiter, leaveEvent);
router.post('/:id/waitlist', validateObjectId(), protect, writeLimiter, joinWaitlist);
router.post('/:id/answer', validateObjectId(), protect, writeLimiter, validate(answerSchema), answerEvent);
router.post('/:id/confirm-spot', validateObjectId(), protect, writeLimiter, confirmPromotion);
router.post('/:id/decide', validateObjectId(), protect, writeLimiter, validate(decideSchema), decideEvent);
router.put('/:id/no-shows', validateObjectId(), protect, writeLimiter, validate(noShowsSchema), markNoShows);
router.post('/:id/dispute', validateObjectId(), protect, writeLimiter, validate(disputeSchema), disputeNoShow);
router.post('/:id/save', validateObjectId(), protect, writeLimiter, saveEvent);
router.delete('/:id/save', validateObjectId(), protect, writeLimiter, unsaveEvent);

export default router;
