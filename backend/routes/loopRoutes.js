import express from 'express';
import {
  listNotifications,
  unreadCount,
  markRead,
  answerFromLink,
  previewLink,
  muteFromLink,
  runJobsHandler,
  pushKey,
  pushSubscribe,
  pushUnsubscribe,
  adminMetrics,
} from '../controllers/loopController.js';
import protect from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter, authLimiter } from '../middleware/rateLimits.js';
import { linkActionSchema, pushSubscriptionSchema } from '../validation/groupSchemas.js';

// Everything around the weekly loop that isn't a group or an event:
// the notification bell, one-tap email links, the job trigger, push and metrics.
export const notificationRoutes = express.Router();
notificationRoutes.get('/', protect, listNotifications);
notificationRoutes.get('/unread-count', protect, unreadCount);
notificationRoutes.post('/read', protect, writeLimiter, markRead);

export const linkRoutes = express.Router();
linkRoutes.post('/preview', authLimiter, validate(linkActionSchema), previewLink);
linkRoutes.post('/answer', authLimiter, validate(linkActionSchema), answerFromLink);
linkRoutes.post('/mute', authLimiter, validate(linkActionSchema), muteFromLink);

export const jobRoutes = express.Router();
jobRoutes.post('/run', runJobsHandler);

export const pushRoutes = express.Router();
pushRoutes.get('/key', pushKey);
pushRoutes.post('/subscribe', protect, writeLimiter, validate(pushSubscriptionSchema), pushSubscribe);
pushRoutes.post('/unsubscribe', protect, writeLimiter, pushUnsubscribe);

export const adminRoutes = express.Router();
adminRoutes.get('/metrics', protect, isAdmin, adminMetrics);
