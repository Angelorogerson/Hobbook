import { z } from 'zod';
import { SPORT_KEYS } from '../config/sports.js';
import { cleanText, cityKey } from '../utils/text.js';

export const MAX_ALERTS = 5;

export const createAlertSchema = z.object({
  city: z.preprocess(
    cleanText,
    z
      .string({ required_error: 'Stadt ist erforderlich', invalid_type_error: 'Stadt ist ungültig' })
      .min(1, 'Stadt ist erforderlich')
      .max(100, 'Stadt darf höchstens 100 Zeichen haben')
      // The alert is matched by the normalised city, so it must not be empty.
      .refine((v) => cityKey(v).length > 0, 'Stadt ist ungültig')
  ),
  // "" and null both mean: all sports.
  sport: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.enum(SPORT_KEYS, { errorMap: () => ({ message: 'Sportart ist ungültig' }) }).optional()
  ),
});
