import express from 'express';
import rateLimit from 'express-rate-limit';
import protect from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimits.js';
import { getCalendarLink, resetCalendarLink, getCalendarFeed } from '../controllers/calendarController.js';

// Personal calendar feed (.ics subscription): mounted at /api/calendar.
const router = express.Router();

// Calendar apps fetch the feed every few hours; guessing keys has to stay hopeless.
const feedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Zu viele Anfragen. Bitte versuche es später erneut.' },
});

router.get('/link', protect, getCalendarLink);
router.post('/link/reset', protect, writeLimiter, resetCalendarLink);
// Public: the address is `/feed/<token>.ics`.
router.get('/feed/:file', feedLimiter, getCalendarFeed);

export default router;
