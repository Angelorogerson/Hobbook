import crypto from 'node:crypto';
import { ConnectEvent, Group } from '../models/index.js';
import { ACTIVE } from './attendance.js';
import { notify, answerButtons } from './notify.js';
import { appUrl } from '../utils/linkToken.js';
import { forecastFor } from './weather.js';
import { expirePromotions } from './promotion.js';
import { addDays, formatClock, formatWhen, isoWeekday, localDateKey, zonedTimeToUtc } from '../utils/time.js';

// The weekly loop of a Stammspiel:
//   generate next game → invite → nudge non-responders → decide at the deadline
//   → remind 2 h before → (weather check) → next week.
// Every step is idempotent: it claims its work with an atomic update, so the
// job can run every few minutes from several triggers without double messages.

const H = 3600 * 1000;
const D = 24 * H;

export const newInviteCode = () => crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8);

const routeUrl = (e) => {
  const c = e.location?.point?.coordinates;
  return Array.isArray(c) ? `https://www.google.com/maps/dir/?api=1&destination=${c[1]},${c[0]}` : null;
};
const placeOf = (e) => e.location?.placeName || e.location?.city || '';
const memberIds = (group) => (group.members || []).map((m) => String(m.user));
const hostIds = (group) => [String(group.organizer), ...(group.coHosts || []).map(String)];
export const isHost = (group, user) => !!user && (user.role === 'admin' || hostIds(group).includes(String(user._id)));

/** The next date (start after `now`) on the group's weekday that isn't skipped. */
export function nextOccurrence(group, now = new Date()) {
  const tz = group.timezone || 'Europe/Berlin';
  const today = localDateKey(now, tz);
  for (let i = 0; i < 28; i += 1) {
    const key = addDays(today, i);
    if (isoWeekday(key) !== group.weekday || (group.skipDates || []).includes(key)) continue;
    const startAt = zonedTimeToUtc(key, group.startTime, tz);
    if (startAt <= now) continue;
    return { dateKey: key, startAt, endAt: new Date(startAt.getTime() + group.durationMin * 60 * 1000) };
  }
  return null;
}

async function createOccurrence(group, occ, now) {
  const key = `${group._id}:${occ.dateKey}`;
  const ids = (group.members || []).map((m) => m.user);
  const max = group.maxParticipants;
  let participants;
  let waitlist = [];
  let responses = [];
  if (group.rsvpMode === 'autoIn') {
    // Everyone is in unless they say no; the organizer always first.
    const ordered = [group.organizer, ...ids.filter((id) => String(id) !== String(group.organizer))];
    participants = ordered.slice(0, max);
    waitlist = ordered.slice(max);
  } else {
    participants = [group.organizer];
    responses = [{ user: group.organizer, answer: 'in', at: now, late: false }];
  }
  const deadline = Math.min(occ.startAt.getTime(), Math.max(occ.startAt.getTime() - group.deadlineHours * H, now.getTime() + H));
  try {
    return await ConnectEvent.create({
      creator: group.organizer,
      title: group.name,
      sport: group.sport,
      description: group.description || '',
      bring: group.bring || '',
      level: group.level,
      location: group.location,
      startAt: occ.startAt,
      endAt: occ.endAt,
      timezone: group.timezone,
      maxParticipants: max,
      minPlayers: Math.min(group.minPlayers, max),
      visibility: group.visibility,
      participants,
      waitlist,
      responses,
      status: participants.length >= max ? 'full' : 'open',
      group: group._id,
      occurrenceKey: key,
      deadlineAt: new Date(deadline),
      decision: 'open',
    });
  } catch (err) {
    if (err?.code === 11000) return ConnectEvent.findOne({ occurrenceKey: key });
    throw err;
  }
}

/**
 * Make sure the group's next game exists once its invite window is open
 * (`force` creates it right away, e.g. when the Stammspiel is created).
 */
export async function ensureOccurrence(group, now = new Date(), { force = false } = {}) {
  const upcoming = await ConnectEvent.findOne({ group: group._id, endAt: { $gt: now } }).sort({ startAt: 1 }).lean();
  if (upcoming) return upcoming;
  if (!group.active) return null;
  const occ = nextOccurrence(group, now);
  if (!occ) return null;
  if (!force && now.getTime() < occ.startAt.getTime() - group.openDaysBefore * D) return null;
  const created = await createOccurrence(group, occ, now);
  return created?.toObject ? created.toObject() : created;
}

export async function generateOccurrences(now = new Date()) {
  let n = 0;
  for await (const group of Group.find({ active: true }).lean().cursor()) {
    const before = await ConnectEvent.exists({ group: group._id, endAt: { $gt: now } });
    if (before) continue;
    if (await ensureOccurrence(group, now)) n += 1;
  }
  return n;
}

// ── Messages ────────────────────────────────────────────────────────────────

const answerLine = (event) => `Antworten bis ${formatWhen(event.deadlineAt, event.timezone)}.`;

async function sendInvite(event, group) {
  const others = memberIds(group).filter((id) => id !== String(group.organizer));
  const when = formatWhen(event.startAt, event.timezone);
  const link = `/events/${event._id}`;
  if (group.rsvpMode === 'autoIn') {
    const inSet = new Set(event.participants.map(String));
    const planned = others.filter((id) => inSet.has(id));
    const waiting = others.filter((id) => !inSet.has(id));
    await notify({
      users: planned,
      type: 'invite',
      title: `${group.name}: Du bist eingeplant`,
      body: `${when} · ${placeOf(event)}. Falls du nicht kannst, sag kurz ab.`,
      link,
      event,
      group,
      email: (u) => ({ lines: [`${when} · ${placeOf(event)}`, 'Du bist automatisch dabei. Falls du nicht kannst, sag bitte ab.', answerLine(event)], buttons: answerButtons(u._id, event, { onlyOut: true }) }),
    });
    await notify({
      users: waiting,
      type: 'invite',
      title: `${group.name}: Du stehst auf der Warteliste`,
      body: `${when} · Wir sagen dir Bescheid, wenn ein Platz frei wird.`,
      link,
      event,
      group,
    });
    return;
  }
  await notify({
    users: others,
    type: 'invite',
    title: `${group.name}: Bist du dabei?`,
    body: `${when} · ${placeOf(event)}. ${answerLine(event)}`,
    link,
    event,
    group,
    email: (u) => ({ lines: [`${when} · ${placeOf(event)}`, answerLine(event)], buttons: answerButtons(u._id, event) }),
  });
}

/** Members who haven't answered yet (not in, not waiting, not out). */
export function nonResponders(event, group) {
  const answered = new Set([
    ...(event.participants || []).map(String),
    ...(event.waitlist || []).map(String),
    ...(event.responses || []).map((r) => String(r.user)),
  ]);
  return memberIds(group).filter((id) => !answered.has(id));
}

export async function nudge(event, group) {
  const users = nonResponders(event, group);
  if (!users.length) return 0;
  const when = formatWhen(event.startAt, event.timezone);
  return notify({
    users,
    type: 'nudge',
    title: `${group.name}: Kommst du ${formatClock(event.startAt, event.timezone)}?`,
    body: `${when}. Bisher ${event.participants.length} Zusagen, ab ${event.minPlayers} findet's statt. ${answerLine(event)}`,
    link: `/events/${event._id}`,
    event,
    group,
    email: (u) => ({
      lines: [`${when} · ${placeOf(event)}`, `Bisher ${event.participants.length} Zusagen, ab ${event.minPlayers} findet's statt.`, answerLine(event)],
      buttons: answerButtons(u._id, event),
    }),
  });
}

async function claim(eventId, field, now, extra = {}) {
  return ConnectEvent.findOneAndUpdate({ _id: eventId, [field]: null, ...extra }, { $set: { [field]: now } }, { new: true }).lean();
}

export async function sendInvites(now = new Date()) {
  let n = 0;
  const events = await ConnectEvent.find({ group: { $ne: null }, invitedAt: null, status: { $in: ACTIVE }, startAt: { $gt: now } }).lean();
  for (const e of events) {
    const claimed = await claim(e._id, 'invitedAt', now);
    if (!claimed) continue;
    const group = await Group.findById(e.group).lean();
    if (!group) continue;
    await sendInvite(claimed, group);
    n += 1;
  }
  return n;
}

export async function sendNudges(now = new Date()) {
  let n = 0;
  const events = await ConnectEvent.find({
    group: { $ne: null },
    decision: 'open',
    nudgedAt: null,
    invitedAt: { $ne: null },
    deadlineAt: { $gt: now },
    status: { $in: ACTIVE },
  }).lean();
  for (const e of events) {
    const span = e.deadlineAt - e.invitedAt;
    const at = Math.max(e.deadlineAt.getTime() - D, e.invitedAt.getTime() + span / 2);
    if (now.getTime() < at) continue;
    const claimed = await claim(e._id, 'nudgedAt', now);
    if (!claimed) continue;
    const group = await Group.findById(e.group).lean();
    if (!group || group.rsvpMode === 'autoIn') continue;
    await nudge(claimed, group);
    n += 1;
  }
  return n;
}

/** Announce a decided game. `reason` only for "off". */
export async function announceDecision(event, group, on, reason = '') {
  const when = formatWhen(event.startAt, event.timezone);
  const link = `/events/${event._id}`;
  if (on) {
    return notify({
      users: event.participants,
      type: 'decision_on',
      title: `${event.title} findet statt ✓`,
      body: `${when} · ${placeOf(event)} · ${event.participants.length} Zusagen.`,
      link,
      event,
      group,
      email: () => ({
        lines: [`${when} · ${placeOf(event)}`, `${event.participants.length} Leute sind dabei. Bis gleich!`],
        buttons: [
          { label: 'Zum Spiel', href: `${appUrl()}${link}`, primary: true },
          ...(routeUrl(event) ? [{ label: 'Route', href: routeUrl(event) }] : []),
        ],
      }),
    });
  }
  return notify({
    users: [...event.participants, ...(event.waitlist || [])],
    type: 'decision_off',
    title: `${event.title} fällt aus`,
    body: `${when}. ${reason}`.trim(),
    link,
    event,
    group,
    important: true,
  });
}

export async function decideGames(now = new Date()) {
  let n = 0;
  const due = await ConnectEvent.find({ group: { $ne: null }, decision: 'open', deadlineAt: { $lte: now }, status: { $in: ACTIVE } }).lean();
  for (const e of due) {
    const on = await ConnectEvent.findOneAndUpdate(
      { _id: e._id, decision: 'open', $expr: { $gte: [{ $size: '$participants' }, '$minPlayers'] } },
      { $set: { decision: 'on', decidedAt: now } },
      { new: true }
    ).lean();
    const group = await Group.findById(e.group).lean();
    if (on) {
      await announceDecision(on, group, true);
      n += 1;
      continue;
    }
    const reason = `Zu wenige Zusagen (${e.participants.length} von mindestens ${e.minPlayers}).`;
    const off = await ConnectEvent.findOneAndUpdate(
      { _id: e._id, decision: 'open', $expr: { $lt: [{ $size: '$participants' }, '$minPlayers'] } },
      { $set: { decision: 'off', decidedAt: now, status: 'cancelled', cancelledAt: now, cancelledReason: reason } },
      { new: true }
    ).lean();
    if (off) {
      await announceDecision(off, group, false, reason);
      n += 1;
    }
  }
  return n;
}

export async function sendReminders(now = new Date()) {
  let n = 0;
  const events = await ConnectEvent.find({
    startAt: { $gt: now, $lte: new Date(now.getTime() + 2 * H) },
    reminderSentAt: null,
    status: { $in: ACTIVE },
    decision: { $ne: 'off' },
  }).lean();
  for (const e of events) {
    const claimed = await claim(e._id, 'reminderSentAt', now);
    if (!claimed) continue;
    // Nobody needs a reminder for a game they set up minutes ago.
    if (now - new Date(e.createdAt) < 60 * 60 * 1000 && !e.group) continue;
    const weather = e.weather?.summary ? ` · ${e.weather.summary}` : '';
    await notify({
      users: e.participants,
      type: 'reminder',
      title: `Gleich geht's los: ${e.title}`,
      body: `${formatClock(e.startAt, e.timezone)} Uhr · ${placeOf(e)}${weather}`,
      link: `/events/${e._id}`,
      event: e,
      group: e.group || undefined,
      email: () => ({
        lines: [`${formatWhen(e.startAt, e.timezone)} · ${placeOf(e)}`, ...(e.weather?.summary ? [`Wetter: ${e.weather.summary}`] : []), ...(e.bring ? [`Mitbringen: ${e.bring}`] : [])],
        buttons: routeUrl(e) ? [{ label: 'Route öffnen', href: routeUrl(e), primary: true }] : undefined,
      }),
    });
    n += 1;
  }
  return n;
}

export async function updateWeather(now = new Date()) {
  let n = 0;
  const events = await ConnectEvent.find({
    startAt: { $gt: now, $lte: new Date(now.getTime() + 2 * D) },
    status: { $in: ACTIVE },
    'location.point': { $exists: true },
    $or: [{ 'weather.fetchedAt': null }, { 'weather.fetchedAt': { $lt: new Date(now.getTime() - 3 * H) } }],
  })
    .limit(25)
    .lean();
  for (const e of events) {
    const forecast = await forecastFor(e);
    if (!forecast) continue;
    await ConnectEvent.updateOne({ _id: e._id }, { $set: { weather: { ...forecast, fetchedAt: now } } });
    n += 1;
    if (forecast.severe && !e.weatherWarnedAt) {
      const claimed = await claim(e._id, 'weatherWarnedAt', now);
      if (!claimed) continue;
      const group = e.group ? await Group.findById(e.group).lean() : null;
      await notify({
        users: group ? hostIds(group) : [e.creator],
        type: 'weather',
        title: `Wetterwarnung: ${e.title}`,
        body: `${forecast.summary} um ${formatClock(e.startAt, e.timezone)} Uhr. Du kannst das Spiel mit einem Tipp absagen.`,
        link: `/events/${e._id}`,
        event: e,
        group: group || undefined,
        important: true,
      });
    }
  }
  return n;
}

/** One pass of every step, in order. Safe to run concurrently and repeatedly. */
export async function runJobs(now = new Date()) {
  const summary = {};
  summary.generated = await generateOccurrences(now);
  summary.invited = await sendInvites(now);
  summary.nudged = await sendNudges(now);
  summary.decided = await decideGames(now);
  summary.spotsPassed = await expirePromotions(now);
  summary.reminded = await sendReminders(now);
  summary.weather = await updateWeather(now);
  return summary;
}
