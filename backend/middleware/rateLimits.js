import rateLimit from 'express-rate-limit';

const skip = () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    skip,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message },
  });

export const authLimiter = make(15 * 60 * 1000, 20, 'Zu viele Anmeldeversuche. Bitte versuche es später erneut.');
export const writeLimiter = make(60 * 1000, 60, 'Zu viele Anfragen. Bitte warte kurz.');
export const reportLimiter = make(60 * 60 * 1000, 10, 'Zu viele Meldungen. Bitte versuche es später erneut.');
export const geocodeLimiter = make(60 * 1000, 30, 'Zu viele Ortssuchen. Bitte warte kurz.');
