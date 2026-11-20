import mongoose from 'mongoose';
import { ConnectEvent, Group } from '../models/index.js';
import { serializeEvent } from '../utils/serializeEvent.js';
import { displayName } from '../utils/text.js';
import { addDays, isoWeekday, localDateKey, zonedTimeToUtc } from '../utils/time.js';
import { cityKey, escapeRegex } from '../utils/text.js';
import { ACTIVE, joinOrWait, leaveAndPromote } from '../services/attendance.js';
import { ensureOccurrence, isHost, newInviteCode, nextOccurrence, nudge } from '../services/stammspiel.js';
import { notify } from '../services/notify.js';
import { cancelWithNotice, notifyChanged, toLocationDoc } from './connectEventController.js';
import { afterPromotion } from '../services/promotion.js';
import { isBlocked, removeMember, transferGroup } from '../services/groupAdmin.js';
import { notifyAlertsForGroup } from '../services/alerts.js';

const H = 3600 * 1000;

const D = 24 * 3600 * 1000;
const MANUAL_NUDGE_GAP_MS = 6 * 3600 * 1000;
const notFound = (res) => res.status(404).json({ message: 'Stammspiel nicht gefunden' });
const idOf = (v) => (v && v._id ? String(v._id) : v ? String(v) : null);

const EVENT_POPULATE = [
  { path: 'creator', select: 'name createdAt' },
  { path: 'participants', select: 'name' },
  { path: 'waitlist', select: 'name' },
  { path: 'responses.user', select: 'name' },
  {
    path: 'group',
    select: 'name weekday startTime rsvpMode organizer coHosts members inviteCode visibility active',
    populate: { path: 'members.user', select: 'name' },
  },
];

const loadUpcoming = (groupId, now = new Date()) =>
  ConnectEvent.findOne({ group: groupId, endAt: { $gt: now } }).sort({ startAt: 1 }).populate(EVENT_POPULATE).lean();

async function findGroup(key) {
  if (mongoose.isValidObjectId(key)) {
    const byId = await Group.findById(key).populate('organizer', 'name').populate('coHosts', 'name').populate('members.user', 'name').populate('blocked', 'name').lean();
    if (byId) return { group: byId, viaCode: false };
  }
  if (typeof key === 'string' && /^[A-Za-z0-9]{6,12}$/.test(key)) {
    const byCode = await Group.findOne({ inviteCode: key }).populate('organizer', 'name').populate('coHosts', 'name').populate('members.user', 'name').populate('blocked', 'name').lean();
    if (byCode) return { group: byCode, viaCode: true };
  }
  return { group: null, viaCode: false };
}

const membership = (group, user) => {
  const uid = user ? String(user._id) : null;
  const m = uid ? (group.members || []).find((x) => idOf(x.user) === uid) : null;
  const host = !!user && (user.role === 'admin' || [idOf(group.organizer), ...(group.coHosts || []).map(idOf)].includes(uid));
  return {
    isMember: !!m,
    muted: !!m?.muted,
    isHost: host,
    isOrganizer: !!uid && idOf(group.organizer) === uid,
    isBlocked: !!uid && isBlocked(group, uid),
  };
};

async function serializeGroup(group, viewer, { viaCode = false, withEvents = true } = {}) {
  const me = membership(group, viewer);
  const insider = me.isMember || me.isHost;
  const point = group.location?.point?.coordinates;
  const out = {
    _id: String(group._id),
    name: group.name,
    sport: group.sport,
    description: group.description || '',
    bring: group.bring || '',
    level: group.level,
    location: {
      placeName: group.location?.placeName || '',
      address: group.location?.address || '',
      city: group.location?.city || '',
      lat: Array.isArray(point) ? point[1] : null,
      lng: Array.isArray(point) ? point[0] : null,
    },
    weekday: group.weekday,
    startTime: group.startTime,
    durationMin: group.durationMin,
    timezone: group.timezone,
    maxParticipants: group.maxParticipants,
    minPlayers: group.minPlayers,
    deadlineHours: group.deadlineHours,
    openDaysBefore: group.openDaysBefore,
    rsvpMode: group.rsvpMode,
    visibility: group.visibility,
    active: group.active,
    organizer: { _id: idOf(group.organizer), displayName: group.organizer?.name ? displayName(group.organizer.name) : 'Organisator' },
    memberCount: (group.members || []).length,
    ...me,
  };
  if (insider || viaCode) out.inviteCode = group.inviteCode;
  if (insider) {
    out.members = (group.members || []).map((m) => ({
      _id: idOf(m.user),
      displayName: m.user?.name ? displayName(m.user.name) : 'Mitglied',
      joinedAt: m.joinedAt,
    }));
    out.coHosts = (group.coHosts || []).map((c) => ({ _id: idOf(c), displayName: c?.name ? displayName(c.name) : 'Mitglied' }));
  }
  if (me.isHost) {
    out.blocked = (group.blocked || []).map((b) => ({ _id: idOf(b), displayName: b?.name ? displayName(b.name) : 'Gesperrt' }));
  }

  if (withEvents) {
    const now = new Date();
    const upcoming = await loadUpcoming(group._id, now);
    out.upcoming = upcoming ? serializeEvent(upcoming, { viewer, detail: true }) : null;
    if (!upcoming && group.active) {
      const occ = nextOccurrence(group, now);
      if (occ) out.nextPlanned = { startAt: occ.startAt, opensAt: new Date(occ.startAt.getTime() - group.openDaysBefore * D) };
    }
    const past = await ConnectEvent.find({ group: group._id, endAt: { $lte: now } })
      .sort({ startAt: -1 })
      .limit(6)
      .select('startAt status decision participants')
      .lean();
    out.history = past.map((e) => ({
      _id: String(e._id),
      startAt: e.startAt,
      happened: e.status !== 'cancelled',
      participantCount: e.participants.length,
    }));
  }
  return out;
}

const reply = async (res, req, groupId, extra = {}) => {
  const { group } = await findGroup(String(groupId));
  return res.json({ group: await serializeGroup(group, req.user), ...extra });
};

async function loadForHost(req, res) {
  const group = await Group.findById(req.params.id).lean();
  if (!group) {
    notFound(res);
    return null;
  }
  if (!isHost(group, req.user)) {
    res.status(403).json({ message: 'Nur Organisator:innen dieses Stammspiels können das' });
    return null;
  }
  return group;
}

/** POST /api/groups — create a Stammspiel and its first game right away. */
export const createGroup = async (req, res) => {
  const b = req.validated.body;
  let group;
  for (let attempt = 0; attempt < 5 && !group; attempt += 1) {
    try {
      group = await Group.create({
        name: b.name,
        sport: b.sport,
        description: b.description || '',
        bring: b.bring || '',
        level: b.level || 'all',
        visibility: b.visibility || 'public',
        location: toLocationDoc(b.location),
        organizer: req.user._id,
        weekday: b.weekday,
        startTime: b.startTime,
        durationMin: b.durationMin,
        timezone: b.timezone || 'Europe/Berlin',
        maxParticipants: b.maxParticipants,
        minPlayers: Math.min(b.minPlayers, b.maxParticipants),
        deadlineHours: b.deadlineHours ?? 3,
        openDaysBefore: b.openDaysBefore ?? 5,
        rsvpMode: b.rsvpMode || 'ask',
        inviteCode: newInviteCode(),
        members: [{ user: req.user._id, joinedAt: new Date() }],
      });
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }
  await ensureOccurrence(group.toObject(), new Date(), { force: true });
  // Search alerts: not awaited, never throws into the request.
  void notifyAlertsForGroup(group.toObject());
  const { group: full } = await findGroup(String(group._id));
  res.status(201).json({ group: await serializeGroup(full, req.user) });
};

/** GET /api/groups/mine — the Stammspiele I belong to, each with its next game. */
export const getMyGroups = async (req, res) => {
  const groups = await Group.find({ 'members.user': req.user._id, active: true })
    .populate('organizer', 'name')
    .sort({ weekday: 1, startTime: 1 })
    .lean();
  const out = await Promise.all(
    groups.map(async (g) => {
      const s = await serializeGroup(g, req.user, { withEvents: false });
      const upcoming = await loadUpcoming(g._id);
      s.upcoming = upcoming ? serializeEvent(upcoming, { viewer: req.user, detail: false }) : null;
      return s;
    })
  );
  res.json({ groups: out });
};

/** GET /api/groups?city=&sport=&near=lng,lat&radiusKm= — public Stammspiele, each with its next game. */
export const listGroups = async (req, res) => {
  const q = req.validated.query;
  const filter = { active: true, visibility: 'public' };
  if (q.sport) filter.sport = q.sport;
  if (q.city) {
    const key = cityKey(q.city);
    if (key) filter['location.cityKey'] = { $regex: `^${escapeRegex(key)}` };
  } else if (q.near) {
    filter['location.point'] = { $geoWithin: { $centerSphere: [[q.near.lng, q.near.lat], (q.radiusKm ?? 25) / 6378.1] } };
  }
  const groups = await Group.find(filter).populate('organizer', 'name').sort({ weekday: 1, startTime: 1 }).limit(q.limit).lean();
  const out = await Promise.all(
    groups.map(async (g) => {
      const s = await serializeGroup(g, req.user, { withEvents: false });
      const upcoming = await loadUpcoming(g._id);
      s.upcoming = upcoming ? serializeEvent(upcoming, { viewer: req.user, detail: false }) : null;
      return s;
    })
  );
  res.json({ groups: out });
};

/** GET /api/groups/:key — by id (public or members) or by invite code (anyone with the link). */
export const getGroup = async (req, res) => {
  const { group, viaCode } = await findGroup(req.params.key);
  if (!group) return notFound(res);
  const me = membership(group, req.user);
  if (!viaCode && group.visibility !== 'public' && !me.isMember && !me.isHost) return notFound(res);
  res.json({ group: await serializeGroup(group, req.user, { viaCode }) });
};

/** POST /api/groups/:id/join — become a member (from the invite link). */
export const joinGroup = async (req, res) => {
  const uid = req.user._id;
  const target = await Group.findById(req.params.id).select('blocked').lean();
  if (target && isBlocked(target, uid)) return res.status(403).json({ message: 'Du kannst diesem Stammspiel nicht beitreten.' });
  const updated = await Group.findOneAndUpdate(
    { _id: req.params.id, active: true, 'members.user': { $ne: uid } },
    { $push: { members: { user: uid, joinedAt: new Date() } } },
    { new: true }
  ).lean();
  if (!updated) {
    const group = await Group.findById(req.params.id).lean();
    if (!group) return notFound(res);
    if (!group.active) return res.status(409).json({ message: 'Dieses Stammspiel wurde beendet' });
    return reply(res, req, group._id, { alreadyMember: true });
  }
  // Auto-in groups: a new member is planned for the next game straight away.
  const upcoming = await ConnectEvent.findOne({ group: updated._id, status: { $in: ACTIVE }, startAt: { $gt: new Date() } }).lean();
  if (upcoming && updated.rsvpMode === 'autoIn') await joinOrWait(upcoming._id, uid, { waitIfFull: true });
  await notify({
    users: [updated.organizer, ...(updated.coHosts || [])],
    type: 'joined_group',
    title: `${displayName(req.user.name)} ist jetzt bei ${updated.name}`,
    link: `/stammspiel/${updated._id}`,
    group: updated,
    email: false,
  });
  return reply(res, req, updated._id);
};

/** POST /api/groups/:id/leave — leave the Stammspiel (and free a spot in the next game). */
export const leaveGroup = async (req, res) => {
  const uid = req.user._id;
  const group = await Group.findById(req.params.id).lean();
  if (!group) return notFound(res);
  if (String(group.organizer) === String(uid)) {
    return res.status(409).json({ message: 'Als Organisator:in kannst du nicht austreten. Beende das Stammspiel stattdessen.' });
  }
  await Group.updateOne({ _id: group._id }, { $pull: { members: { user: uid }, coHosts: uid } });
  const upcoming = await ConnectEvent.findOne({ group: group._id, status: { $in: ACTIVE }, startAt: { $gt: new Date() } }).lean();
  if (upcoming) {
    const r = await leaveAndPromote(upcoming._id, uid, { requireMember: true });
    if (r) await afterPromotion(r.after, r.promoted);
  }
  return reply(res, req, group._id);
};

/** POST /api/groups/:id/mute — { muted } no email or push for this Stammspiel (cancellations still arrive). */
export const muteGroup = async (req, res) => {
  const r = await Group.updateOne(
    { _id: req.params.id, 'members.user': req.user._id },
    { $set: { 'members.$.muted': req.validated.body.muted } }
  );
  if (!r.matchedCount) return notFound(res);
  return reply(res, req, req.params.id);
};

/**
 * Changes for the open game when the host chose "auch für den offenen Termin".
 * Returns { error } (status 409) or { up, ev, timeChanged, placeChanged } or null.
 */
async function planUpcomingChange(group, set, now) {
  const up = await ConnectEvent.findOne({ group: group._id, status: { $in: ACTIVE }, startAt: { $gt: now } }).lean();
  if (!up) return null;
  const g = { ...group, ...set };
  const max = g.maxParticipants;
  if (up.participants.length > max) {
    return { error: 'Für den offenen Termin haben schon mehr Leute zugesagt als das neue Maximum. Wähle „Nur ab nächster Woche“ oder ein höheres Maximum.' };
  }
  const ev = {
    title: g.name,
    sport: g.sport,
    description: g.description || '',
    bring: g.bring || '',
    level: g.level,
    visibility: g.visibility,
    timezone: g.timezone,
    maxParticipants: max,
    minPlayers: Math.min(g.minPlayers, max),
    status: up.participants.length >= max ? 'full' : 'open',
  };
  if (set.location) ev.location = set.location;

  let start = new Date(up.startAt);
  const timing = ['weekday', 'startTime', 'durationMin', 'timezone'].some((k) => set[k] !== undefined && set[k] !== group[k]);
  if (timing) {
    // Same week, new slot.
    const oldKey = localDateKey(up.startAt, g.timezone);
    const newKey = addDays(oldKey, g.weekday - isoWeekday(oldKey));
    start = zonedTimeToUtc(newKey, g.startTime, g.timezone);
    if (start <= now) {
      return { error: 'Der neue Zeitpunkt läge diese Woche schon in der Vergangenheit. Wähle „Nur ab nächster Woche“.' };
    }
    ev.startAt = start;
    ev.endAt = new Date(start.getTime() + g.durationMin * 60 * 1000);
    ev.occurrenceKey = `${group._id}:${newKey}`;
  }
  if (timing || set.deadlineHours !== undefined) {
    ev.deadlineAt = new Date(Math.min(start.getTime(), Math.max(start.getTime() - g.deadlineHours * H, now.getTime() + H)));
  }
  const timeChanged =
    !!ev.startAt && (+ev.startAt !== +new Date(up.startAt) || +ev.endAt !== +new Date(up.endAt));
  const c = up.location?.point?.coordinates || [];
  const n = set.location?.point?.coordinates || [];
  const placeChanged =
    !!set.location &&
    (set.location.placeName !== up.location?.placeName || set.location.address !== up.location?.address || n[0] !== c[0] || n[1] !== c[1]);
  if (timeChanged || placeChanged) ev.changedAt = now;
  return { up, ev, timeChanged, placeChanged };
}

/**
 * PATCH /api/groups/:id — hosts. Applies to games that aren't open yet; with
 * `applyToUpcoming` also to the open game (participants are told about time/place changes).
 */
export const updateGroup = async (req, res) => {
  const group = await loadForHost(req, res);
  if (!group) return undefined;
  const b = req.validated.body;
  const set = {};
  for (const k of ['name', 'sport', 'description', 'bring', 'level', 'visibility', 'weekday', 'startTime', 'durationMin', 'timezone', 'maxParticipants', 'minPlayers', 'deadlineHours', 'openDaysBefore', 'rsvpMode']) {
    if (b[k] !== undefined) set[k] = b[k];
  }
  if (b.location) set.location = toLocationDoc(b.location);
  const max = set.maxParticipants ?? group.maxParticipants;
  if ((set.minPlayers ?? group.minPlayers) > max) set.minPlayers = max;

  const now = new Date();
  const change = b.applyToUpcoming ? await planUpcomingChange(group, set, now) : null;
  if (change?.error) return res.status(409).json({ message: change.error });

  await Group.updateOne({ _id: group._id }, { $set: set }, { runValidators: true });
  if (change) {
    const updated = await ConnectEvent.findByIdAndUpdate(change.up._id, { $set: change.ev }, { new: true, runValidators: true }).lean();
    await notifyChanged(updated, req.user._id, { timeChanged: change.timeChanged, placeChanged: change.placeChanged });
  }
  return reply(res, req, group._id, { appliedToUpcoming: !!change });
};

/** POST /api/groups/:id/transfer — { userId }: the organizer hands the Stammspiel to a member. */
export const transferOwnership = async (req, res) => {
  const group = await Group.findById(req.params.id).lean();
  if (!group) return notFound(res);
  if (String(group.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Nur die Organisator:in kann das Stammspiel übergeben' });
  }
  const { userId } = req.validated.body;
  if (userId === String(group.organizer)) return res.status(400).json({ message: 'Das Stammspiel gehört schon dieser Person' });
  if (!(group.members || []).some((m) => String(m.user) === userId)) {
    return res.status(400).json({ message: 'Übergeben geht nur an Mitglieder' });
  }
  await transferGroup(group, userId);
  return reply(res, req, group._id);
};

/** POST /api/groups/:id/members/:userId/remove — { block? }: hosts remove (and optionally block) a member. */
export const removeMemberHandler = async (req, res) => {
  const group = await loadForHost(req, res);
  if (!group) return undefined;
  const target = req.params.userId;
  if (target === String(group.organizer)) return res.status(400).json({ message: 'Die Organisator:in kann nicht entfernt werden' });
  if (target === String(req.user._id)) return res.status(400).json({ message: 'Zum Austreten nutze „Stammspiel verlassen“' });
  const isCo = (group.coHosts || []).some((c) => String(c) === target);
  if (isCo && String(group.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Co-Hosts kann nur die Organisator:in entfernen' });
  }
  const isMember = (group.members || []).some((m) => String(m.user) === target);
  if (!isMember && !req.validated.body.block) return res.status(404).json({ message: 'Diese Person ist kein Mitglied' });
  await removeMember(group, target, { block: !!req.validated.body.block });
  return reply(res, req, group._id);
};

/** POST /api/groups/:id/members/:userId/unblock — hosts lift a block. */
export const unblockMember = async (req, res) => {
  const group = await loadForHost(req, res);
  if (!group) return undefined;
  await Group.updateOne({ _id: group._id }, { $pull: { blocked: req.params.userId } });
  return reply(res, req, group._id);
};

/** POST /api/groups/:id/skip — "Diese Woche aussetzen": calls off the next game. */
export const skipNext = async (req, res) => {
  const group = await loadForHost(req, res);
  if (!group) return undefined;
  const now = new Date();
  const upcoming = await ConnectEvent.findOne({ group: group._id, status: { $in: ACTIVE }, startAt: { $gt: now } }).lean();
  if (upcoming) {
    await Group.updateOne({ _id: group._id }, { $addToSet: { skipDates: localDateKey(upcoming.startAt, group.timezone) } });
    await cancelWithNotice(upcoming, 'Diese Woche ausgesetzt', req.user._id);
  } else {
    const occ = nextOccurrence(group, now);
    if (occ) await Group.updateOne({ _id: group._id }, { $addToSet: { skipDates: occ.dateKey } });
  }
  return reply(res, req, group._id);
};

/** POST /api/groups/:id/remind — nudge only those who haven't answered (at most every 6 h). */
export const remindNow = async (req, res) => {
  const group = await loadForHost(req, res);
  if (!group) return undefined;
  const now = new Date();
  const event = await ConnectEvent.findOneAndUpdate(
    {
      group: group._id,
      decision: 'open',
      status: { $in: ACTIVE },
      startAt: { $gt: now },
      $or: [{ manualNudgeAt: null }, { manualNudgeAt: { $lt: new Date(now - MANUAL_NUDGE_GAP_MS) } }],
    },
    { $set: { manualNudgeAt: now } },
    { new: true }
  ).lean();
  if (!event) return res.status(409).json({ message: 'Gerade nicht möglich – du hast vor Kurzem schon erinnert oder der Termin ist entschieden.' });
  const sent = await nudge(event, group);
  return reply(res, req, group._id, { reminded: sent });
};

/** POST /api/groups/:id/cohosts — organizer adds or removes a co-host (must be a member). */
export const setCoHost = async (req, res) => {
  const group = await Group.findById(req.params.id).lean();
  if (!group) return notFound(res);
  if (String(group.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Nur die Organisator:in kann Co-Hosts festlegen' });
  }
  const { userId, add } = req.validated.body;
  if (add && !(group.members || []).some((m) => String(m.user) === userId)) {
    return res.status(400).json({ message: 'Co-Hosts müssen Mitglied sein' });
  }
  await Group.updateOne({ _id: group._id }, add ? { $addToSet: { coHosts: userId } } : { $pull: { coHosts: userId } });
  return reply(res, req, group._id);
};

/** DELETE /api/groups/:id — end the Stammspiel; the next game is called off. */
export const endGroup = async (req, res) => {
  const group = await Group.findById(req.params.id).lean();
  if (!group) return notFound(res);
  if (String(group.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Nur die Organisator:in kann das Stammspiel beenden' });
  }
  await Group.updateOne({ _id: group._id }, { $set: { active: false, endedAt: new Date() } });
  const upcoming = await ConnectEvent.findOne({ group: group._id, status: { $in: ACTIVE }, startAt: { $gt: new Date() } }).lean();
  const reason = req.validated.body.reason || 'Das Stammspiel wurde beendet';
  if (upcoming) await cancelWithNotice(upcoming, reason, req.user._id);
  return reply(res, req, group._id);
};
