import { ConnectEvent, Report } from '../models/index.js';
import { serializeEvent } from '../utils/serializeEvent.js';
import { cityKey, escapeRegex } from '../utils/text.js';

const CREATOR_FIELDS = 'name';
const PARTICIPANT_FIELDS = 'name';

const notFound = (res) => res.status(404).json({ message: 'Event nicht gefunden' });

const isOwnerOrAdmin = (event, user) =>
  user.role === 'admin' || event.creator.toString() === user._id.toString();

function toLocationDoc(loc) {
  return {
    placeName: loc.placeName,
    address: loc.address,
    city: loc.city,
    cityKey: cityKey(loc.city),
    countryCode: loc.countryCode,
    point: { type: 'Point', coordinates: [loc.lng, loc.lat] },
  };
}

async function loadForResponse(id) {
  return ConnectEvent.findById(id)
    .populate('creator', CREATOR_FIELDS)
    .populate('participants', PARTICIPANT_FIELDS)
    .lean();
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
    ConnectEvent.find({ creator: uid }).sort({ startAt: 1 }).populate('creator', CREATOR_FIELDS).lean(),
    ConnectEvent.find({ participants: uid, creator: { $ne: uid } })
      .sort({ startAt: 1 })
      .populate('creator', CREATOR_FIELDS)
      .lean(),
  ]);
  res.json({
    created: created.map((e) => serializeEvent(e, { viewer: req.user })),
    joined: joined.map((e) => serializeEvent(e, { viewer: req.user })),
  });
};

/** GET /api/events/:id — public; unlisted events are reachable by id. */
export const getEventById = async (req, res) => {
  const event = await loadForResponse(req.params.id);
  if (!event) return notFound(res);
  res.json({ event: serializeEvent(event, { viewer: req.user, detail: true }) });
};

/** POST /api/events */
export const createEvent = async (req, res) => {
  const body = req.validated.body;
  const event = await ConnectEvent.create({
    title: body.title,
    sport: body.sport,
    description: body.description || '',
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
  for (const key of ['title', 'sport', 'description', 'timezone', 'level', 'visibility']) {
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

  const full = await loadForResponse(updated._id);
  res.json({ event: serializeEvent(full, { viewer: req.user, detail: true }) });
};

/** POST /api/events/:id/cancel — visible cancelled state. */
export const cancelEvent = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id);
  if (!event) return notFound(res);
  if (!isOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ message: 'Nur der Organisator darf dieses Event absagen' });
  }
  const updated = await ConnectEvent.findOneAndUpdate(
    { _id: event._id, status: { $in: ['open', 'full'] }, endAt: { $gte: new Date() } },
    { $set: { status: 'cancelled', cancelledAt: new Date(), cancelledReason: req.validated.body.reason || '' } },
    { new: true }
  );
  if (!updated) return res.status(409).json({ message: 'Event ist bereits abgesagt oder vorbei' });
  const full = await loadForResponse(updated._id);
  res.json({ event: serializeEvent(full, { viewer: req.user, detail: true }) });
};

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
  await Report.updateMany({ event: event._id, status: 'open' }, { $set: { status: 'resolved', note: 'Event gelöscht' } });
  res.json({ message: 'Event gelöscht' });
};

/** POST /api/events/:id/join — atomic, idempotent. */
export const joinEvent = async (req, res) => {
  const uid = req.user._id;
  const now = new Date();

  // Single atomic update: condition (open, future, not joined, capacity left) + push + status.
  const updated = await ConnectEvent.findOneAndUpdate(
    {
      _id: req.params.id,
      status: 'open',
      startAt: { $gt: now },
      participants: { $ne: uid },
      $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] },
    },
    [
      { $set: { participants: { $concatArrays: ['$participants', [uid]] } } },
      {
        $set: {
          status: { $cond: [{ $gte: [{ $size: '$participants' }, '$maxParticipants'] }, 'full', 'open'] },
        },
      },
    ],
    { new: true }
  );

  if (!updated) {
    const event = await ConnectEvent.findById(req.params.id).lean();
    if (!event) return notFound(res);
    if (event.participants.some((p) => p.toString() === uid.toString())) {
      const full = await loadForResponse(event._id);
      return res.json({ event: serializeEvent(full, { viewer: req.user, detail: true }), alreadyJoined: true });
    }
    if (event.status === 'cancelled') return res.status(409).json({ message: 'Dieses Event wurde abgesagt' });
    if (event.startAt <= now || event.status === 'completed') {
      return res.status(409).json({ message: 'Dieses Event hat bereits begonnen oder ist vorbei' });
    }
    return res.status(409).json({ message: 'Dieses Event ist leider voll' });
  }

  const full = await loadForResponse(updated._id);
  res.json({ event: serializeEvent(full, { viewer: req.user, detail: true }) });
};

/** POST /api/events/:id/leave — atomic; the organizer cannot leave (must cancel). */
export const leaveEvent = async (req, res) => {
  const uid = req.user._id;
  const now = new Date();

  const updated = await ConnectEvent.findOneAndUpdate(
    {
      _id: req.params.id,
      participants: uid,
      creator: { $ne: uid },
      status: { $in: ['open', 'full'] },
      startAt: { $gt: now },
    },
    [
      { $set: { participants: { $filter: { input: '$participants', cond: { $ne: ['$$this', uid] } } } } },
      {
        $set: {
          status: { $cond: [{ $lt: [{ $size: '$participants' }, '$maxParticipants'] }, 'open', 'full'] },
        },
      },
    ],
    { new: true }
  );

  if (!updated) {
    const event = await ConnectEvent.findById(req.params.id).lean();
    if (!event) return notFound(res);
    if (event.creator.toString() === uid.toString()) {
      return res.status(409).json({ message: 'Als Organisator kannst du nicht austreten. Sage das Event stattdessen ab.' });
    }
    if (!event.participants.some((p) => p.toString() === uid.toString())) {
      const full = await loadForResponse(event._id);
      return res.json({ event: serializeEvent(full, { viewer: req.user, detail: true }), alreadyLeft: true });
    }
    return res.status(409).json({ message: 'Austreten ist nach Beginn oder bei abgesagten Events nicht möglich' });
  }

  const full = await loadForResponse(updated._id);
  res.json({ event: serializeEvent(full, { viewer: req.user, detail: true }) });
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
