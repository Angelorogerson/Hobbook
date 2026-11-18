import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { ConnectEvent, Group, Notification, User } from '../models/index.js';
import { verifyLink } from '../utils/linkToken.js';
import { serializeEvent } from '../utils/serializeEvent.js';
import { displayName } from '../utils/text.js';
import { joinOrWait, leaveAndPromote, isLate } from '../services/attendance.js';
import { runJobs } from '../services/stammspiel.js';
import { afterPromotion, confirmSpot } from '../services/promotion.js';
import { isBlocked } from '../services/groupAdmin.js';
import { pushPublicKey } from '../services/push.js';
import { reliabilityFor } from '../services/reliability.js';

// ── Notifications (in-app bell) ─────────────────────────────────────────────

const serializeNotification = (n) => ({
  _id: String(n._id),
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  read: !!n.readAt,
  createdAt: n.createdAt,
});

/** GET /api/notifications */
export const listNotifications = async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(60).lean(),
    Notification.countDocuments({ user: req.user._id, readAt: null }),
  ]);
  res.json({ notifications: items.map(serializeNotification), unread });
};

/** GET /api/notifications/unread-count — cheap poll for the bell. */
export const unreadCount = async (req, res) => {
  res.json({ unread: await Notification.countDocuments({ user: req.user._id, readAt: null }) });
};

/** POST /api/notifications/read — { ids? } marks the given (or all) as read. */
export const markRead = async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => mongoose.isValidObjectId(id)) : null;
  const filter = { user: req.user._id, readAt: null, ...(ids && { _id: { $in: ids } }) };
  await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  return unreadCount(req, res);
};

// ── One-tap email links (no sign-in) ────────────────────────────────────────

async function loadLinkTarget(req, res, type) {
  const payload = verifyLink(req.validated.body.token);
  if (!payload || payload.t !== type) {
    res.status(410).json({ message: 'Dieser Link ist abgelaufen oder ungültig. Antworte bitte direkt in Hobbook.' });
    return null;
  }
  return payload;
}

const linkEventView = async (eventId, user) => {
  const fresh = await ConnectEvent.findById(eventId).populate('group', 'name weekday startTime rsvpMode members').lean();
  return serializeEvent(fresh, { viewer: user });
};

/** POST /api/links/preview — { token }: what an email answer link is about; changes nothing. */
export const previewLink = async (req, res) => {
  const payload = await loadLinkTarget(req, res, 'answer');
  if (!payload) return undefined;
  const user = await User.findById(payload.u).lean();
  const exists = await ConnectEvent.exists({ _id: payload.e });
  if (!user || !exists || user.isActive === false) return res.status(404).json({ message: 'Termin nicht gefunden' });
  const event = await linkEventView(payload.e, user);
  return res.json({ event, suggested: payload.a, name: user.name.split(' ')[0] });
};

/**
 * POST /api/links/answer — { token, answer? }: answer a game from an email.
 * The page only calls this after a tap (see /links/preview), so link scanners never answer for anyone.
 */
export const answerFromLink = async (req, res) => {
  const payload = await loadLinkTarget(req, res, 'answer');
  if (!payload) return undefined;
  const answer = req.validated.body.answer || payload.a;
  const user = await User.findById(payload.u).lean();
  const event = await ConnectEvent.findById(payload.e).lean();
  if (!user || !event || user.isActive === false) return res.status(404).json({ message: 'Termin nicht gefunden' });
  const now = new Date();
  const uid = user._id;
  const group = event.group ? await Group.findById(event.group).select('blocked').lean() : null;

  let after;
  if (answer === 'in') {
    if (isBlocked(group, uid)) return res.status(403).json({ message: 'Du kannst diesem Stammspiel nicht beitreten.' });
    after = await joinOrWait(event._id, uid, { now, waitIfFull: true, record: true });
    if (after) {
      if (event.group) {
        await Group.updateOne({ _id: event.group, active: true, 'members.user': { $ne: uid } }, { $push: { members: { user: uid } } });
      }
      await confirmSpot(event._id, uid);
    }
  } else {
    const r = await leaveAndPromote(event._id, uid, {
      now,
      record: true,
      requireMember: !event.group,
      late: isLate(event, now),
      allowCreator: !!event.group,
    });
    after = r?.after;
    if (r) await afterPromotion(r.after, r.promoted, now);
  }
  if (!after) {
    return res.status(409).json({ message: 'Dieser Termin hat schon begonnen oder fällt aus.' });
  }
  res.json({ event: await linkEventView(event._id, user), answer });
};

/** POST /api/links/mute — { token, muted? }: without `muted` it only shows the state; with it, it sets it. */
export const muteFromLink = async (req, res) => {
  const payload = await loadLinkTarget(req, res, 'mute');
  if (!payload) return undefined;
  const group = await Group.findOne({ _id: payload.g, 'members.user': payload.u }).lean();
  if (!group) return res.status(404).json({ message: 'Stammspiel nicht gefunden' });
  if (typeof req.body?.muted !== 'boolean') {
    const m = group.members.find((x) => String(x.user) === String(payload.u));
    return res.json({ group: { _id: String(group._id), name: group.name }, muted: !!m?.muted, preview: true });
  }
  await Group.updateOne({ _id: group._id, 'members.user': payload.u }, { $set: { 'members.$.muted': req.body.muted } });
  res.json({ group: { _id: String(group._id), name: group.name }, muted: req.body.muted });
};

// ── Scheduled jobs ──────────────────────────────────────────────────────────

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** POST /api/jobs/run — called by an external cron (header x-job-secret). */
export const runJobsHandler = async (req, res) => {
  const secret = process.env.JOB_SECRET;
  if (!secret) return res.status(503).json({ message: 'Jobs sind nicht eingerichtet (JOB_SECRET fehlt)' });
  if (!safeEqual(req.get('x-job-secret') || '', secret)) return res.status(401).json({ message: 'Nicht autorisiert' });
  // Tests and E2E may simulate time; never in production.
  const testable = ['test', 'e2e'].includes(process.env.NODE_ENV);
  const now = testable && req.body?.now ? new Date(req.body.now) : new Date();
  const summary = await runJobs(now);
  res.json({ ok: true, at: now.toISOString(), ...summary });
};

// ── Web push ────────────────────────────────────────────────────────────────

export const pushKey = (req, res) => res.json({ publicKey: pushPublicKey() });

/** POST /api/push/subscribe — store this device's subscription (max 5 devices). */
export const pushSubscribe = async (req, res) => {
  if (!pushPublicKey()) return res.status(503).json({ message: 'Push ist nicht eingerichtet' });
  const sub = req.validated.body;
  await User.updateOne({ _id: req.user._id }, { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } });
  await User.updateOne(
    { _id: req.user._id },
    { $push: { pushSubscriptions: { $each: [{ endpoint: sub.endpoint, keys: sub.keys, createdAt: new Date() }], $slice: -5 } } }
  );
  res.json({ ok: true });
};

/** POST /api/push/unsubscribe — { endpoint } */
export const pushUnsubscribe = async (req, res) => {
  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
  await User.updateOne({ _id: req.user._id }, { $pull: { pushSubscriptions: { endpoint } } });
  res.json({ ok: true });
};

// ── Profiles and reliability ────────────────────────────────────────────────

/** GET /api/users/:id/profile — public mini profile (no city, no email). */
export const publicProfile = async (req, res) => {
  const user = await User.findById(req.params.id).select('name sports createdAt isActive').lean();
  if (!user || user.isActive === false) return res.status(404).json({ message: 'Person nicht gefunden' });
  const isSelf = !!req.user && String(req.user._id) === String(user._id);
  const [eventsHosted, groupsHosted, reliability] = await Promise.all([
    ConnectEvent.countDocuments({ creator: user._id, status: { $ne: 'cancelled' } }),
    Group.countDocuments({ organizer: user._id, active: true }),
    reliabilityFor(user._id),
  ]);
  res.json({
    profile: {
      _id: String(user._id),
      displayName: displayName(user.name),
      memberSince: new Date(user.createdAt).getUTCFullYear(),
      sports: user.sports || [],
      eventsHosted,
      groupsHosted,
      gamesPlayed: reliability.games,
      // Others see reliability only with enough data; you always see your own.
      reliability: reliability.enoughData || isSelf ? reliability : null,
      isSelf,
    },
  });
};

// ── Admin: pilot metrics ───────────────────────────────────────────────────

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** GET /api/admin/metrics — the pilot's success numbers (last 28 days). */
export const adminMetrics = async (req, res) => {
  const now = new Date();
  const since = new Date(now - 28 * 24 * 3600 * 1000);
  const [users, groups, games, notifications] = await Promise.all([
    User.countDocuments(),
    Group.find({ active: true }).select('members organizer createdAt').lean(),
    ConnectEvent.find({ group: { $ne: null }, startAt: { $gte: since, $lte: now } })
      .select('group responses invitedAt deadlineAt decision participants noShows')
      .lean(),
    Notification.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$emailStatus', n: { $sum: 1 } } },
    ]),
  ]);
  const membersByGroup = new Map(groups.map((g) => [String(g._id), g.members.length]));
  let answeredBefore = 0;
  let possible = 0;
  const answerHours = [];
  let noShows = 0;
  let attendees = 0;
  for (const g of games) {
    const members = membersByGroup.get(String(g.group)) || 0;
    possible += Math.max(0, members - 1); // the organizer is in by default
    for (const r of g.responses || []) {
      if (g.deadlineAt && r.at <= g.deadlineAt) answeredBefore += 1;
      if (g.invitedAt && r.at >= g.invitedAt) answerHours.push((r.at - g.invitedAt) / 3600000);
    }
    attendees += g.participants.length;
    noShows += (g.noShows || []).filter((n) => !n.disputed).length;
  }
  const organizers = new Set(groups.map((g) => String(g.organizer)));
  res.json({
    users,
    activeGroups: groups.length,
    organizers: organizers.size,
    members: groups.reduce((a, g) => a + g.members.length, 0),
    last28Days: {
      games: games.length,
      decidedOn: games.filter((g) => g.decision === 'on').length,
      decidedOff: games.filter((g) => g.decision === 'off').length,
      answerRateBeforeDeadline: possible ? Math.round((Math.min(answeredBefore, possible) / possible) * 100) : null,
      medianHoursToAnswer: answerHours.length ? Math.round(median(answerHours) * 10) / 10 : null,
      noShowRate: attendees ? Math.round((noShows / attendees) * 1000) / 10 : null,
      emails: Object.fromEntries(notifications.map((n) => [n._id, n.n])),
    },
  });
};
