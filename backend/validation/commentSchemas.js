import { z } from 'zod';
import { COMMENT_KINDS } from '../models/Comment.js';
import { cleanText } from '../utils/text.js';

export const COMMENT_MAX_LENGTH = 500;

/** Strip HTML, normalise line endings and squeeze runs of blank lines. */
const tidy = (value) => {
  const cleaned = cleanText(value);
  if (typeof cleaned !== 'string') return cleaned;
  return cleaned.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};

export const createCommentSchema = z.object({
  text: z.preprocess(
    tidy,
    z
      .string({ required_error: 'Bitte schreib eine Nachricht', invalid_type_error: 'Nachricht ist ungültig' })
      .min(1, 'Bitte schreib eine Nachricht')
      .max(COMMENT_MAX_LENGTH, `Die Nachricht darf höchstens ${COMMENT_MAX_LENGTH} Zeichen haben`)
  ),
  kind: z.enum(COMMENT_KINDS, { errorMap: () => ({ message: 'Art der Nachricht ist ungültig' }) }).optional(),
});
