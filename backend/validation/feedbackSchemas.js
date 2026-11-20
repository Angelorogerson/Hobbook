import { z } from 'zod';
import { FEEDBACK_KINDS, FEEDBACK_STATUSES } from '../models/Feedback.js';
import { cleanText } from '../utils/text.js';

const PAGE_MAX = 200;

/**
 * Keep only the app path of the page the form was opened from: no query
 * string, no hash, no host. Anything that is not a path becomes ''.
 */
export function pagePath(value) {
  if (typeof value !== 'string') return '';
  let path = cleanText(value);
  // A full URL: drop scheme and host.
  path = path.replace(/^[a-z][a-z\d+.-]*:\/\/[^/?#]*/i, '');
  path = path.split(/[?#]/)[0].trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '';
  return path.slice(0, PAGE_MAX);
}

export const createFeedbackSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS, { errorMap: () => ({ message: 'Bitte wähle, worum es geht' }) }),
  text: z.preprocess(
    cleanText,
    z
      .string({ required_error: 'Bitte schreib uns ein paar Worte', invalid_type_error: 'Text ist ungültig' })
      .min(5, 'Dein Text braucht mindestens 5 Zeichen')
      .max(2000, 'Dein Text darf höchstens 2000 Zeichen haben')
  ),
  page: z
    .string({ invalid_type_error: 'Seite ist ungültig' })
    .max(2000, 'Seite ist ungültig')
    .transform(pagePath)
    .optional(),
  // Honeypot: people never see this field. Anything goes, so bots learn nothing.
  website: z.unknown().optional(),
});

export const updateFeedbackSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES, { errorMap: () => ({ message: 'Status ist ungültig' }) }),
});

export const listFeedbackQuerySchema = z.object({
  status: z.enum(FEEDBACK_STATUSES, { errorMap: () => ({ message: 'Status ist ungültig' }) }).optional(),
});
