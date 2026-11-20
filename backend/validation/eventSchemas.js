import { z } from 'zod';
import { SPORT_KEYS } from '../config/sports.js';
import { EVENT_LEVELS, EVENT_VISIBILITIES } from '../models/ConnectEvent.js';
import { REPORT_REASONS, REPORT_STATUSES } from '../models/Report.js';
import { cleanText } from '../utils/text.js';

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

const text = (min, max, label) =>
  z.preprocess(
    cleanText,
    z
      .string({ required_error: `${label} ist erforderlich`, invalid_type_error: `${label} ist ungültig` })
      .min(min, min === 1 ? `${label} ist erforderlich` : `${label} muss mindestens ${min} Zeichen haben`)
      .max(max, `${label} darf höchstens ${max} Zeichen haben`)
  );

const isoDate = (label) =>
  z.coerce.date({ errorMap: () => ({ message: `${label} ist kein gültiges Datum` }) });

export const locationSchema = z.object({
  placeName: text(1, 120, 'Ortsname'),
  address: text(1, 200, 'Adresse'),
  city: text(1, 100, 'Stadt'),
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/, 'Ländercode ist ungültig')
    .transform((v) => v.toUpperCase())
    .optional(),
  lat: z.coerce
    .number({ invalid_type_error: 'Breitengrad fehlt' })
    .min(-90, 'Breitengrad ist ungültig')
    .max(90, 'Breitengrad ist ungültig'),
  lng: z.coerce
    .number({ invalid_type_error: 'Längengrad fehlt' })
    .min(-180, 'Längengrad ist ungültig')
    .max(180, 'Längengrad ist ungültig'),
});

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

const baseEventFields = {
  title: text(3, 100, 'Titel'),
  sport: z.enum(SPORT_KEYS, { errorMap: () => ({ message: 'Sportart ist ungültig' }) }),
  description: text(0, 2000, 'Beschreibung').optional(),
  bring: text(0, 200, 'Mitbringen').optional(),
  startAt: isoDate('Startzeit'),
  endAt: isoDate('Endzeit'),
  timezone: timezone.optional(),
  maxParticipants: z.coerce
    .number({ invalid_type_error: 'Teilnehmerzahl ist ungültig' })
    .int('Teilnehmerzahl muss eine ganze Zahl sein')
    .min(2, 'Mindestens 2 Teilnehmende')
    .max(100, 'Höchstens 100 Teilnehmende'),
  level: z.enum(EVENT_LEVELS).optional(),
  visibility: z.enum(EVENT_VISIBILITIES).optional(),
  location: locationSchema,
};

function checkTimes(data, ctx, now = new Date()) {
  if (data.startAt && data.startAt <= now) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startAt'], message: 'Startzeit muss in der Zukunft liegen' });
  }
  if (data.startAt && data.endAt) {
    if (data.endAt <= data.startAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'Endzeit muss nach der Startzeit liegen' });
    } else if (data.endAt - data.startAt > MAX_DURATION_MS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'Ein Event darf höchstens 24 Stunden dauern' });
    }
  }
}

// Unknown keys (creator, participants, status, …) are stripped by zod's default behaviour.
export const createEventSchema = z.object(baseEventFields).superRefine((d, ctx) => checkTimes(d, ctx));

// Update: every field optional; time rules are checked in the controller against stored values.
export const updateEventSchema = z
  .object(Object.fromEntries(Object.entries(baseEventFields).map(([k, v]) => [k, v.optional()])))
  .refine((d) => Object.keys(d).length > 0, 'Keine Änderungen angegeben');

export const cancelEventSchema = z.object({
  reason: text(0, 300, 'Grund').optional(),
});

export const listEventsQuerySchema = z.object({
  city: z.string().max(100).optional(),
  sport: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined))
    .pipe(z.array(z.enum(SPORT_KEYS)).optional()),
  from: isoDate('Von').optional(),
  to: isoDate('Bis').optional(),
  bbox: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const n = v.split(',').map(Number);
      const [minLng, minLat, maxLng, maxLat] = n;
      const valid =
        n.length === 4 &&
        n.every(Number.isFinite) &&
        minLng >= -180 && maxLng <= 180 && minLat >= -90 && maxLat <= 90 &&
        minLng < maxLng && minLat < maxLat;
      if (!valid) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Kartenausschnitt ist ungültig' });
        return z.NEVER;
      }
      return { minLng, minLat, maxLng, maxLat };
    }),
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
  includePast: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  includeCancelled: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  // Only games of weekly Stammspiele
  series: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  // Text search in title and place name (an empty value means: no search)
  q: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() || undefined : v),
    z
      .string({ invalid_type_error: 'Suche ist ungültig' })
      .min(2, 'Suche muss mindestens 2 Zeichen haben')
      .max(60, 'Suche darf höchstens 60 Zeichen haben')
      .optional()
  ),
  // Events with this level or for everyone ('all')
  level: z.enum(['beginner', 'intermediate', 'advanced'], { errorMap: () => ({ message: 'Niveau ist ungültig' }) }).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// A report is about an event or about a person.
export const createReportSchema = z
  .object({
    eventId: z.string().regex(/^[a-f\d]{24}$/i, 'Event ist ungültig').optional(),
    userId: z.string().regex(/^[a-f\d]{24}$/i, 'Person ist ungültig').optional(),
    reason: z.enum(REPORT_REASONS, { errorMap: () => ({ message: 'Grund ist ungültig' }) }),
    text: text(0, 1000, 'Beschreibung').optional(),
  })
  .refine((d) => !d.eventId !== !d.userId, 'Bitte gib ein Event oder eine Person an');

export const updateReportSchema = z.object({
  status: z.enum(REPORT_STATUSES),
  note: text(0, 1000, 'Notiz').optional(),
  cancelEvent: z.boolean().optional(),
  // Person reports: block the reported account.
  deactivateUser: z.boolean().optional(),
});

export const listReportsQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
});
