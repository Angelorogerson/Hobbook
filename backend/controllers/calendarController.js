import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { User, ConnectEvent } from '../models/index.js';
import { SPORTS } from '../config/sports.js';
import { appUrl } from '../utils/linkToken.js';
import { buildCalendar } from '../services/ics.js';

// Personal calendar feed ("Kalender-Abo"). The address holds the user id and a
// random key; whoever knows it can read that person's games, so the key can be
// replaced at any time ("Link erneuern").

const PAST_DAYS = 30;
const MAX_EVENTS = 200;
const TOKEN_PATTERN = /^([0-9a-f]{24})-([A-Za-z0-9_-]{32,128})$/;
const SPORT_LABELS = Object.fromEntries(SPORTS.map((s) => [s.key, s.label]));

const newKey = () => crypto.randomBytes(24).toString('base64url');
const tokenFor = (userId, key) => `${userId}-${key}`;

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest();
/** Constant-time comparison, also for values of different length. */
const sameKey = (a, b) => crypto.timingSafeEqual(sha256(a), sha256(b));

/** GET /api/calendar/link — the personal feed token; the key is created on first use. */
export const getCalendarLink = async (req, res) => {
  const uid = req.user._id;
  // Only sets a key when there is none, so two first calls at once end with the same key.
  await User.updateOne({ _id: uid, calendarKey: null }, { $set: { calendarKey: newKey() } });
  const user = await User.findById(uid).select('+calendarKey').lean();
  res.set('Cache-Control', 'no-store');
  res.json({ token: tokenFor(uid, user.calendarKey) });
};

/** POST /api/calendar/link/reset — a new key; addresses with the old key stop working. */
export const resetCalendarLink = async (req, res) => {
  const key = newKey();
  await User.updateOne({ _id: req.user._id }, { $set: { calendarKey: key } });
  res.set('Cache-Control', 'no-store');
  res.json({ token: tokenFor(req.user._id, key) });
};

const notFound = (res) => res.status(404).json({ message: 'Nicht gefunden' });

/** One calendar entry for an event. Holds no names of other people. */
export function toCalendarEntry(event, base = appUrl()) {
  const id = event._id.toString();
  const url = `${base}/events/${id}`;
  const cancelled = event.status === 'cancelled';
  const point = event.location?.point?.coordinates;
  const description = [
    `Sportart: ${SPORT_LABELS[event.sport] || event.sport}`,
    event.bring ? `Mitbringen: ${event.bring}` : '',
    `Zum Event: ${url}`,
  ]
    .filter(Boolean)
    .join('\n');

  // Grows with every change of time, place or status; 0 for an unchanged event.
  const changed = Math.max(new Date(event.changedAt || 0).getTime(), new Date(event.cancelledAt || 0).getTime());
  const created = new Date(event.createdAt || 0).getTime();
  const sequence = changed > 0 ? Math.max(1, Math.floor((changed - created) / 1000) + 1) : 0;

  return {
    uid: `${id}@hobbook`,
    start: event.startAt,
    end: event.endAt,
    summary: cancelled ? `Abgesagt: ${event.title}` : event.title,
    location: [event.location?.placeName, event.location?.address].filter(Boolean).join(', '),
    geo: Array.isArray(point) && point.length === 2 ? { lat: point[1], lng: point[0] } : undefined,
    description,
    url,
    // A weekly game that is still collecting answers is not certain yet.
    status: cancelled ? 'CANCELLED' : event.group && event.decision === 'open' ? 'TENTATIVE' : 'CONFIRMED',
    lastModified: event.updatedAt || event.createdAt,
    sequence,
  };
}

/** GET /api/calendar/feed/:file — public .ics feed, protected only by the key in the address. */
export const getCalendarFeed = async (req, res) => {
  const file = String(req.params.file || '');
  if (!file.endsWith('.ics')) return notFound(res);
  const match = TOKEN_PATTERN.exec(file.slice(0, -4));
  if (!match || !mongoose.isValidObjectId(match[1])) return notFound(res);

  const user = await User.findById(match[1]).select('+calendarKey isActive').lean();
  // Compare even when there is no user or key, so the answer takes the same time.
  const matches = sameKey(match[2], user?.calendarKey || newKey());
  if (!user || !user.calendarKey || !matches || user.isActive === false) return notFound(res);

  const now = new Date();
  const from = new Date(now.getTime() - PAST_DAYS * 24 * 3600 * 1000);
  const events = await ConnectEvent.find({ $or: [{ participants: user._id }, { creator: user._id }], startAt: { $gte: from } })
    .select('title sport bring location startAt endAt status group decision changedAt cancelledAt createdAt updatedAt')
    .sort({ startAt: 1 })
    .limit(MAX_EVENTS)
    .lean();

  const base = appUrl();
  const body = buildCalendar({ name: 'Hobbook', entries: events.map((e) => toCalendarEntry(e, base)), now });

  res.set({
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'inline; filename="hobbook.ics"',
    'Cache-Control': 'private, max-age=900',
    'X-Robots-Tag': 'noindex',
  });
  res.send(body);
};
