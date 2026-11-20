import { ConnectEvent, Group, Report, User } from '../models/index.js';
import { serializeEvent } from '../utils/serializeEvent.js';
import { cityKey, escapeRegex } from '../utils/text.js';
import { formatWhen } from '../utils/time.js';
import { joinOrWait, leaveAndPromote, isLate, ACTIVE } from '../services/attendance.js';
import { notify } from '../services/notify.js';
import { announceDecision, isHost } from '../services/stammspiel.js';
import { afterPromotion, confirmSpot } from '../services/promotion.js';
import { isBlocked } from '../services/groupAdmin.js';
import { notifyAlertsForEvent } from '../services/alerts.js';

const CREATOR_FIELDS = 'name';
const CREATOR_DETAIL_FIELDS = 'name createdAt';
const PARTICIPANT_FIELDS = 'name';

const notFound = (res) => res.status(404).json({ message: 'Event nicht gefunden' });

const isOwnerOrAdmin = (event, user) =>
  user.role === 'admin' || event.creator.toString() === user._id.toString();

export function toLocationDoc(loc) {
  return {
    placeName: loc.placeName,
    address: loc.address,
    city: loc.city,
    cityKey: cityKey(loc.city),
    countryCode: loc.countryCode,
    point: { type: 'Point', coordinates: [loc.lng, loc.lat] },
  };
}

const GROUP_FIELDS = 'name weekday startTime rsvpMode organizer coHosts members inviteCode visibility active';
const GROUP_LIST_FIELDS = 'name weekday startTime rsvpMode';

async function loadForResponse(id) {
  return ConnectEvent.findById(id)
    .populate('creator', CREATOR_DETAIL_FIELDS)
    .populate('participants', PARTICIPANT_FIELDS)
    .populate('waitlist', PARTICIPANT_FIELDS)
    .populate('responses.user', PARTICIPANT_FIELDS)
    .populate({ path: 'group', select: GROUP_FIELDS, populate: { path: 'members.user', select: PARTICIPANT_FIELDS } })
    .lean();
}

const respond = async (res, req, id, extra = {}) => {
  const full = await loadForResponse(id);
  return res.json({ event: serializeEvent(full, { viewer: req.user, detail: true }), ...extra });
};

/** Everyone affected by a change, except the person who made it. */
const audience = (event, actorId) =>
  [...(event.participants || []), ...(event.waitlist || [])].map(String).filter((id) => id !== String(actorId));

const notifyPromoted = (event, promoted) => afterPromotion(event, promoted, new Date());

/** Tell participants (and the waiting list) that time or place changed. */
export async function notifyChanged(updated, actorId, { timeChanged, placeChanged }) {
  if (!timeChanged && !placeChanged) return;
  const what = timeChanged && placeChanged ? 'Zeit und Ort wurden' : timeChanged ? 'Die Zeit wurde' : 'Der Ort wurde';
  await notify({
    users: audience(updated, actorId),
    type: 'changed',
    title: `Geändert: ${updated.title}`,
    body: `${what} geändert. Jetzt: ${formatWhen(updated.startAt, updated.timezone)} · ${updated.location?.placeName || ''}`,
    link: `/events/${updated._id}`,
    event: updated,
    group: updated.group || undefined,
    important: true,
  });
}

/**
 * GET /api/events — the single canonical discovery query used by both list and map.
 */
export const getEvents = async (req, res) => {
  const q = req.validated.query;
  const now = new Date();
  const filter = { visibility: 'public' };

  const statuses = q.includeCancelled ? ['open', 'full', 'cancelled'] : ['open', 'full'];
  if (q.includePast) statuses.push('completed');
  filter.status = { $in: statuses };

  // An event is in range if it hasn't ended before `from` (default: now) and starts before `to`.
  const lowerBound = q.includePast ? q.from : new Date(Math.max(+(q.from || 0), +now));
  if (lowerBound) filter.endAt = { $gte: lowerBound };
  if (q.to) filter.startAt = { $lte: q.to };

  if (q.sport?.length) filter.sport = { $in: q.sport };
  if (q.series) filter.group = { $ne: null };
  // Events for everyone ('all') fit every level.
  if (q.level) filter.level = { $in: [q.level, 'all'] };
  if (q.q) {
    const text = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ title: text }, { 'location.placeName': text }];
  }
  if (q.city) {
    const key = cityKey(q.city);
    if (key) filter['location.cityKey'] = { $regex: `^${escapeRegex(key)}` };
  }
  if (q.bbox) {
    const { minLng, minLat, maxLng, maxLat } = q.bbox;
    filter['location.point'] = {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]],
        },
      },
    };
  } else if (q.near) {
    const radiusKm = q.radiusKm ?? 25;
    filter['location.point'] = { $geoWithin: { $centerSphere: [[q.near.lng, q.near.lat], radiusKm / 6378.1] } };
  }

  const skip = (q.page - 1) * q.limit;
  const [docs, total] = await Promise.all([
    ConnectEvent.find(filter)
      .sort({ startAt: 1, _id: 1 })
      .skip(skip)
      .limit(q.limit)
      .populate('creator', CREATOR_FIELDS)
      .populate('group', GROUP_LIST_FIELDS)
      .lean(),
    ConnectEvent.countDocuments(filter),
  ]);

  res.json({
    events: docs.map((e) => serializeEvent(e, { viewer: req.user })),
    total,
    page: q.page,
    limit: q.limit,
  });
};

/** GET /api/events/me — events the user organizes or joined. */
export const getMyEvents = async (req, res) => {
  const uid = req.user._id;
  const [created, joined] = await Promise.all([
    ConnectEvent.find({ creator: uid })
      .sort({ startAt: 1 })
      .populate('creator', CREATOR_FIELDS)
      .populate('group', GROUP_LIST_FIELDS)
      .lean(),
    ConnectEvent.find({ $or: [{ participants: uid }, { waitlist: uid }], creator: { $ne: uid } })
      .sort({ startAt: 1 })
      .populate('creator', CREATOR_FIELDS)
      .populate('group', GROUP_LIST_FIELDS)
      .lean(),
  ]);
  // Bookmarked events in the order they start; deleted events simply drop out.
  const savedIds = req.user.savedEvents || [];
  const saved = savedIds.length
    ? await ConnectEvent.find({ _id: { $in: savedIds } }).sort({ startAt: 1 }).populate('creator', CREATOR_FIELDS).lean()
    : [];
  res.json({
    created: created.map((e) => serializeEvent(e, { viewer: req.user })),
    joined: joined.map((e) => serializeEvent(e, { viewer: req.user })),
    saved: saved.map((e) => serializeEvent(e, { viewer: req.user })),
  });
};

/** GET /api/events/:id — public; unlisted events are reachable by id. */
export const getEventById = async (req, res) => {
  const event = await loadForResponse(req.params.id);
  if (!event) return notFound(res);
  const creatorId = event.creator?._id || event.creator;
  const eventsHosted = creatorId
    ? await ConnectEvent.countDocuments({ creator: creatorId, status: { $ne: 'cancelled' } })
    : 0;
  res.json({ event: serializeEvent(event, { viewer: req.user, detail: true, organizerStats: { eventsHosted } }) });
};

/** POST /api/events/:id/save — bookmark an event (idempotent). */
export const saveEvent = async (req, res) => {
  const event = await loadForResponse(req.params.id);
  if (!event) return notFound(res);
  await User.updateOne({ _id: req.user._id }, { $addToSet: { savedEvents: event._id } });
  const viewer = { _id: req.user._id, role: req.user.role, savedEvents: [...(req.user.savedEvents || []), event._id] };
  res.json({ event: serializeEvent(event, { viewer, detail: true }) });
};

/** DELETE /api/events/:id/save — remove the bookmark (idempotent, also for deleted events). */
export const unsaveEvent = async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { savedEvents: req.params.id } });
  const event = await loadForResponse(req.params.id);
  if (!event) return res.json({ event: null });
  const viewer = {
    _id: req.user._id,
    role: req.user.role,
    savedEvents: (req.user.savedEvents || []).filter((id) => id.toString() !== req.params.id),
  };
  res.json({ event: serializeEvent(event, { viewer, detail: true }) });
};

/** POST /api/events */
export const createEvent = async (req, res) => {
  const body = req.validated.body;
  const event = await ConnectEvent.create({
    title: body.title,
    sport: body.sport,
    description: body.description || '',
    bring: body.bring || '',
    location: toLocationDoc(body.location),
    startAt: body.startAt,
    endAt: body.endAt,
    timezone: body.timezone || 'Europe/Berlin',
    maxParticipants: body.maxParticipants,
    level: body.level || 'all',
    visibility: body.visibility || 'public',
    creator: req.user._id,
    participants: [req.user._id],
    status: 'open',
  });
  // Search alerts: not awaited, never throws into the request.
  void notifyAlertsForEvent(event.toObject());
  const full = await loadForResponse(event._id);
  res.status(201).json({ event: serializeEvent(full, { viewer: req.user, detail: true }) });
};

/** PATCH /api/events/:id — organizer or admin. */
export const updateEvent = async (req, res) => {
  const body = req.validated.body;
  const event = await ConnectEvent.findById(req.params.id);
  if (!event) return notFound(res);
  if (!isOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ message: 'Nur der Organisator darf dieses Event bearbeiten' });
  }

  const now = new Date();
  if (event.status === 'cancelled' || event.endAt < now) {
    return res.status(409).json({ message: 'Abgesagte oder vergangene Events können nicht bearbeitet werden' });
  }

  const startAt = body.startAt ?? event.startAt;
  const endAt = body.endAt ?? event.endAt;
  const errors = {};
  if (body.startAt && body.startAt <= now) errors.startAt = 'Startzeit muss in der Zukunft liegen';
  if (endAt <= startAt) errors.endAt = 'Endzeit muss nach der Startzeit liegen';
  else if (endAt - startAt > 24 * 60 * 60 * 1000) errors.endAt = 'Ein Event darf höchstens 24 Stunden dauern';
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: Object.values(errors)[0], errors });
  }

  const set = {};
  for (const key of ['title', 'sport', 'description', 'bring', 'timezone', 'level', 'visibility']) {
    if (body[key] !== undefined) set[key] = body[key];
  }
  if (body.startAt) set.startAt = body.startAt;
  if (body.endAt) set.endAt = body.endAt;
  if (body.location) set.location = toLocationDoc(body.location);

  const timeChanged =
    (body.startAt && +body.startAt !== +event.startAt) || (body.endAt && +body.endAt !== +event.endAt);
  const placeChanged =
    body.location &&
    (body.location.address !== event.location?.address ||
      body.location.placeName !== event.location?.placeName ||
      body.location.lat !== event.location?.point?.coordinates?.[1] ||
      body.location.lng !== event.location?.point?.coordinates?.[0]);
  if (timeChanged || placeChanged) set.changedAt = now;

  // Capacity change must not drop below current participants; checked atomically.
  const guard = { _id: event._id, status: { $in: ['open', 'full'] } };
  // Pipeline updates evaluate object values as expressions; wrap user values in
  // $literal so strings like "$field" can never be interpreted as field paths.
  const update = [{ $set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, { $literal: v }])) }];
  if (body.maxParticipants !== undefined) {
    guard.$expr = { $lte: [{ $size: '$participants' }, body.maxParticipants] };
    update.push({
      $set: {
        maxParticipants: body.maxParticipants,
        status: { $cond: [{ $gte: [{ $size: '$participants' }, body.maxParticipants] }, 'full', 'open'] },
      },
    });
  }

  const updated = await ConnectEvent.findOneAndUpdate(guard, update, { new: true, runValidators: true });
  if (!updated) {
    if (body.maxParticipants !== undefined) {
      return res.status(409).json({
        message: 'Die Teilnehmerzahl darf nicht unter die Zahl der bereits angemeldeten Personen sinken',
        errors: { maxParticipants: 'Zu niedrig für die aktuellen Anmeldungen' },
      });
    }
    return res.status(409).json({ message: 'Event kann nicht mehr bearbeitet werden' });
  }

  if (set.changedAt) await notifyChanged(updated, req.user._id, { timeChanged: !!timeChanged, placeChanged: !!placeChanged });

  const full = await loadForResponse(updated._id);
  res.json({ event: serializeEvent(full, { viewer: req.user, detail: true }) });
};

/** POST /api/events/:id/cancel — visible cancelled state. */
export const cancelEvent = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id);
  if (!event) return notFound(res);
  const group = event.group ? await Group.findById(event.group).lean() : null;
  if (!(isOwnerOrAdmin(event, req.user) || (group && isHost(group, req.user)))) {
    return res.status(403).json({ message: 'Nur der Organisator darf dieses Event absagen' });
  }
  const updated = await cancelWithNotice(event, req.validated.body.reason || '', req.user._id);
  if (!updated) return res.status(409).json({ message: 'Event ist bereits abgesagt oder vorbei' });
  return respond(res, req, updated._id);
};

/** Cancel an active event and tell everyone affected. Returns the updated event or null. */
export async function cancelWithNotice(event, reason, actorId) {
  const now = new Date();
  const updated = await ConnectEvent.findOneAndUpdate(
    { _id: event._id, status: { $in: ACTIVE }, endAt: { $gte: now } },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: now,
        cancelledReason: reason,
        ...(event.group && { decision: 'off', decidedAt: now }),
      },
    },
    { new: true }
  ).lean();
  if (!updated) return null;
  await notify({
    users: audience(updated, actorId),
    type: event.group ? 'decision_off' : 'cancelled',
    title: event.group ? `${updated.title} fällt aus` : `Abgesagt: ${updated.title}`,
    body: `${formatWhen(updated.startAt, updated.timezone)}.${reason ? ` Grund: ${reason}` : ''}`,
    link: `/events/${updated._id}`,
    event: updated,
    group: updated.group || undefined,
    important: true,
  });
  return updated;
}

/**
 * DELETE /api/events/:id — hard delete only while nobody else has joined;
 * otherwise the organizer must cancel so participants see what happened.
 * Admins may always hard-delete (moderation).
 */
export const deleteEvent = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id);
  if (!event) return notFound(res);
  if (!isOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ message: 'Nur der Organisator darf dieses Event löschen' });
  }
  const others = event.participants.filter((p) => p.toString() !== event.creator.toString()).length;
  if (others > 0 && req.user.role !== 'admin') {
    return res.status(409).json({
      message: 'Es haben sich bereits Personen angemeldet. Bitte sage das Event ab statt es zu löschen.',
    });
  }
  await ConnectEvent.deleteOne({ _id: event._id });
  await User.updateMany({ savedEvents: event._id }, { $pull: { savedEvents: event._id } });
  await Report.updateMany({ event: event._id, status: 'open' }, { $set: { status: 'resolved', note: 'Event gelöscht' } });
  res.json({ message: 'Event gelöscht' });
};

/** Stammspiel games: answering "in" also makes you a member of the Stammspiel. */
async function ensureMember(event, uid) {
  if (!event.group) return;
  await Group.updateOne(
    { _id: event.group, active: true, 'members.user': { $ne: uid } },
    { $push: { members: { user: uid, joinedAt: new Date() } } }
  );
}

async function explainNotJoinable(res, req, id, uid, now) {
  const event = await ConnectEvent.findById(id).lean();
  if (!event) return notFound(res);
  if (event.participants.some((p) => p.toString() === uid.toString())) {
    return respond(res, req, event._id, { alreadyJoined: true });
  }
  if (event.status === 'cancelled') return res.status(409).json({ message: 'Dieses Event wurde abgesagt' });
  if (event.startAt <= now || event.status === 'completed') {
    return res.status(409).json({ message: 'Dieses Event hat bereits begonnen oder ist vorbei' });
  }
  return res.status(409).json({ message: 'Dieses Event ist leider voll' });
}

async function answerIn(req, res, meta) {
  const uid = req.user._id;
  const now = new Date();
  if (meta.group) {
    const group = await Group.findById(meta.group).select('blocked').lean();
    if (isBlocked(group, uid)) return res.status(403).json({ message: 'Du kannst diesem Stammspiel nicht beitreten.' });
  }
  const updated = await joinOrWait(req.params.id, uid, { now, waitIfFull: true, record: true });
  if (!updated) {
    const event = await ConnectEvent.findById(req.params.id).lean();
    if (!event) return notFound(res);
    if (event.status === 'cancelled' || event.decision === 'off') {
      return res.status(409).json({ message: 'Dieser Termin fällt aus' });
    }
    return res.status(409).json({ message: 'Dieser Termin hat bereits begonnen oder ist vorbei' });
  }
  await ensureMember(meta, uid);
  await confirmSpot(updated._id, uid);
  return respond(res, req, updated._id);
}

async function answerOut(req, res, meta) {
  const uid = req.user._id;
  const now = new Date();
  const result = await leaveAndPromote(req.params.id, uid, { now, record: true, late: isLate(meta, now), allowCreator: true });
  if (!result) {
    const event = await ConnectEvent.findById(req.params.id).lean();
    if (!event) return notFound(res);
    return res.status(409).json({ message: 'Dieser Termin hat bereits begonnen oder fällt aus' });
  }
  await notifyPromoted(result.after, result.promoted);
  return respond(res, req, result.after._id);
}

/** POST /api/events/:id/join — atomic, idempotent. Stammspiel games behave like answering "in". */
export const joinEvent = async (req, res) => {
  const uid = req.user._id;
  const now = new Date();
  const meta = await ConnectEvent.findById(req.params.id).select('group').lean();
  if (!meta) return notFound(res);
  if (meta.group) return answerIn(req, res, meta);

  const updated = await joinOrWait(req.params.id, uid, { now, waitIfFull: false, record: true });
  if (!updated || !updated.participants.some((p) => p.toString() === uid.toString())) {
    return explainNotJoinable(res, req, req.params.id, uid, now);
  }
  return respond(res, req, updated._id);
};

/** POST /api/events/:id/waitlist — queue for a full event; the first in line moves up automatically. */
export const joinWaitlist = async (req, res) => {
  const uid = req.user._id;
  const now = new Date();
  const updated = await joinOrWait(req.params.id, uid, { now, waitIfFull: true });
  if (!updated) return explainNotJoinable(res, req, req.params.id, uid, now);
  return respond(res, req, updated._id);
};

/** POST /api/events/:id/answer — { answer: 'in' | 'out' } for Stammspiel games. */
export const answerEvent = async (req, res) => {
  const meta = await ConnectEvent.findById(req.params.id).select('group deadlineAt startAt').lean();
  if (!meta) return notFound(res);
  if (!meta.group) return res.status(400).json({ message: 'Nur für Stammspiele' });
  return req.validated.body.answer === 'in' ? answerIn(req, res, meta) : answerOut(req, res, meta);
};

/** POST /api/events/:id/leave — frees the spot for the waiting list. The organizer of a single event cannot leave. */
export const leaveEvent = async (req, res) => {
  const uid = req.user._id;
  const now = new Date();
  const meta = await ConnectEvent.findById(req.params.id).select('group deadlineAt startAt creator').lean();
  if (!meta) return notFound(res);
  if (meta.group) return answerOut(req, res, meta);

  // Single events also keep the answer history, so late cancellations count for reliability.
  const result = await leaveAndPromote(req.params.id, uid, { now, record: true, requireMember: true, late: isLate(meta, now) });
  if (!result) {
    const event = await ConnectEvent.findById(req.params.id).lean();
    if (event.creator.toString() === uid.toString()) {
      return res.status(409).json({ message: 'Als Organisator kannst du nicht austreten. Sage das Event stattdessen ab.' });
    }
    if (![...event.participants, ...(event.waitlist || [])].some((p) => p.toString() === uid.toString())) {
      return respond(res, req, event._id, { alreadyLeft: true });
    }
    return res.status(409).json({ message: 'Austreten ist nach Beginn oder bei abgesagten Events nicht möglich' });
  }
  await notifyPromoted(result.after, result.promoted);
  return respond(res, req, result.after._id);
};

/** POST /api/events/:id/confirm-spot — "Ich komme" after moving up shortly before kick-off. */
export const confirmPromotion = async (req, res) => {
  const ok = await confirmSpot(req.params.id, req.user._id);
  if (!ok) {
    const event = await ConnectEvent.findById(req.params.id).select('_id').lean();
    if (!event) return notFound(res);
  }
  return respond(res, req, req.params.id, { confirmed: ok });
};

/** POST /api/events/:id/decide — hosts call the game early: { decision: 'on' | 'off', reason? }. */
export const decideEvent = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id).lean();
  if (!event) return notFound(res);
  const group = event.group ? await Group.findById(event.group).lean() : null;
  if (!(isOwnerOrAdmin(event, req.user) || (group && isHost(group, req.user)))) {
    return res.status(403).json({ message: 'Nur Organisator:innen können das entscheiden' });
  }
  const { decision, reason } = req.validated.body;
  if (decision === 'off') {
    const updated = await cancelWithNotice(event, reason || '', req.user._id);
    if (!updated) return res.status(409).json({ message: 'Dieser Termin ist bereits abgesagt oder vorbei' });
    return respond(res, req, updated._id);
  }
  if (!group) return res.status(400).json({ message: 'Nur für Stammspiele' });
  const updated = await ConnectEvent.findOneAndUpdate(
    { _id: event._id, decision: 'open', status: { $in: ACTIVE }, startAt: { $gt: new Date() } },
    { $set: { decision: 'on', decidedAt: new Date() } },
    { new: true }
  ).lean();
  if (!updated) return res.status(409).json({ message: 'Dieser Termin ist bereits entschieden' });
  await announceDecision(updated, group, true);
  return respond(res, req, updated._id);
};

const NO_SHOW_WINDOW_MS = 24 * 3600 * 1000;

/** PUT /api/events/:id/no-shows — hosts mark who didn't come, until 24 h after the end. */
export const markNoShows = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id);
  if (!event) return notFound(res);
  const group = event.group ? await Group.findById(event.group).lean() : null;
  if (!(isOwnerOrAdmin(event, req.user) || (group && isHost(group, req.user)))) {
    return res.status(403).json({ message: 'Nur Organisator:innen können das eintragen' });
  }
  const now = Date.now();
  const end = event.endAt.getTime();
  if (event.status === 'cancelled' || now < end || now > end + NO_SHOW_WINDOW_MS) {
    return res.status(409).json({ message: 'Das geht nur in den 24 Stunden nach dem Spiel' });
  }
  const allowed = new Set(event.participants.map(String).filter((id) => id !== String(req.user._id)));
  const wanted = [...new Set(req.validated.body.userIds)].filter((id) => allowed.has(id));
  const existing = new Map(event.noShows.map((n) => [String(n.user), n]));
  const fresh = wanted.filter((id) => !existing.has(id));
  event.noShows = wanted.map((id) => existing.get(id) || { user: id, markedAt: new Date(now) });
  await event.save();
  await notify({
    users: fresh,
    type: 'no_show',
    title: `Als nicht erschienen eingetragen: ${event.title}`,
    body: 'Stimmt das nicht? Du kannst innerhalb von 24 Stunden widersprechen.',
    link: `/events/${event._id}`,
    event,
    email: false,
  });
  return respond(res, req, event._id);
};

/** POST /api/events/:id/dispute — the marked person disagrees (within 24 h). */
export const disputeNoShow = async (req, res) => {
  const uid = String(req.user._id);
  const event = await ConnectEvent.findById(req.params.id);
  if (!event) return notFound(res);
  const mark = event.noShows.find((n) => String(n.user) === uid);
  if (!mark) return res.status(404).json({ message: 'Kein Eintrag gefunden' });
  if (Date.now() > mark.markedAt.getTime() + NO_SHOW_WINDOW_MS) {
    return res.status(409).json({ message: 'Die Frist zum Widersprechen ist abgelaufen' });
  }
  mark.disputed = true;
  mark.disputeNote = req.validated.body.note || '';
  await event.save();
  return respond(res, req, event._id);
};

// ─── ADMIN ───

/** GET /api/events/admin/all — every event incl. unlisted/cancelled/past. */
export const getAllEventsAdmin = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const [docs, total] = await Promise.all([
    ConnectEvent.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('creator', CREATOR_FIELDS)
      .lean(),
    ConnectEvent.countDocuments(),
  ]);
  res.json({ events: docs.map((e) => serializeEvent(e, { viewer: req.user })), total, page, limit });
};
