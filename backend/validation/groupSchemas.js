import { z } from 'zod';
import { SPORT_KEYS } from '../config/sports.js';
import { EVENT_LEVELS, EVENT_VISIBILITIES, ANSWERS } from '../models/ConnectEvent.js';
import { RSVP_MODES } from '../models/Group.js';
import { cleanText } from '../utils/text.js';
import { locationSchema } from './eventSchemas.js';

const text = (min, max, label) =>
  z.preprocess(
    cleanText,
    z
      .string({ required_error: `${label} ist erforderlich`, invalid_type_error: `${label} ist ungültig` })
      .min(min, min === 1 ? `${label} ist erforderlich` : `${label} muss mindestens ${min} Zeichen haben`)
      .max(max, `${label} darf höchstens ${max} Zeichen haben`)
  );

const int = (min, max, label) =>
  z.coerce
    .number({ invalid_type_error: `${label} ist ungültig` })
    .int(`${label} muss eine ganze Zahl sein`)
    .min(min, `${label}: mindestens ${min}`)
    .max(max, `${label}: höchstens ${max}`);

const timezone = z
  .string()
  .max(64)
  .refine((tz) => {
    try {
      Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Zeitzone ist ungültig');

const fields = {
  name: text(3, 100, 'Name'),
  sport: z.enum(SPORT_KEYS, { errorMap: () => ({ message: 'Sportart ist ungültig' }) }),
  description: text(0, 2000, 'Beschreibung').optional(),
  bring: text(0, 200, 'Mitbringen').optional(),
  level: z.enum(EVENT_LEVELS).optional(),
  visibility: z.enum(EVENT_VISIBILITIES).optional(),
  location: locationSchema,
  weekday: int(1, 7, 'Wochentag'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Uhrzeit ist ungültig'),
  durationMin: int(30, 480, 'Dauer'),
  timezone: timezone.optional(),
  maxParticipants: int(2, 100, 'Teilnehmerzahl'),
  minPlayers: int(2, 100, 'Mindestzahl'),
  deadlineHours: int(1, 48, 'Antwortfrist').optional(),
  openDaysBefore: int(1, 6, 'Einladung').optional(),
  rsvpMode: z.enum(RSVP_MODES).optional(),
};

const minNotAboveMax = (d, ctx) => {
  if (d.minPlayers !== undefined && d.maxParticipants !== undefined && d.minPlayers > d.maxParticipants) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['minPlayers'], message: 'Mindestens darf nicht über dem Maximum liegen' });
  }
};

export const createGroupSchema = z.object(fields).superRefine(minNotAboveMax);

export const updateGroupSchema = z
  .object({
    ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.optional()])),
    // Also change the game that is already open (otherwise only from next week on).
    applyToUpcoming: z.boolean().optional(),
  })
  .superRefine(minNotAboveMax)
  .refine((d) => Object.keys(d).length > 0, 'Keine Änderungen angegeben');

export const muteSchema = z.object({ muted: z.boolean() });
export const coHostSchema = z.object({ userId: z.string().regex(/^[a-f\d]{24}$/i, 'Person ist ungültig'), add: z.boolean() });
export const endGroupSchema = z.object({ reason: text(0, 300, 'Grund').optional() });

export const answerSchema = z.object({ answer: z.enum(ANSWERS, { errorMap: () => ({ message: 'Antwort ist ungültig' }) }) });
export const decideSchema = z.object({ decision: z.enum(['on', 'off']), reason: text(0, 300, 'Grund').optional() });
export const noShowsSchema = z.object({ userIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100) });
export const disputeSchema = z.object({ note: text(0, 300, 'Notiz').optional() });
export const linkActionSchema = z.object({ token: z.string().min(10).max(600), answer: z.enum(ANSWERS).optional() });
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Person ist ungültig');
export const transferSchema = z.object({ userId: objectId });
export const removeMemberSchema = z.object({ block: z.boolean().optional() });
export const listGroupsQuerySchema = z.object({
  city: z.string().max(100).optional(),
  sport: z.enum(SPORT_KEYS).optional(),
  near: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const [lng, lat] = v.split(',').map(Number);
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Position ist ungültig' });
        return z.NEVER;
      }
      return { lng, lat };
    }),
  radiusKm: z.coerce.number().min(0.1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
