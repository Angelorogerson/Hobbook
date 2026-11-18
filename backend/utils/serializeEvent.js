import { displayName } from './text.js';

const NO_SHOW_WINDOW_MS = 24 * 3600 * 1000;

const idOf = (v) => (v && v._id ? v._id.toString() : v ? v.toString() : null);

/** Status as users should see it: open/full events whose end has passed are "completed". */
export function effectiveStatus(event, now = new Date()) {
  if ((event.status === 'open' || event.status === 'full') && event.endAt && new Date(event.endAt) < now) {
    return 'completed';
  }
  return event.status;
}

/**
 * Public, privacy-preserving representation of an event.
 * - organizer and participants are exposed as "Vorname N." only, never email/phone
 * - participant names only for the organizer, participants and admins (detail view)
 * @param {object} event  lean or hydrated event; creator may be populated with { name }
 * @param {object} [opts]
 * @param {object} [opts.viewer]  req.user or undefined
 * @param {boolean} [opts.detail] include participant list when allowed
 * @param {{ eventsHosted: number }} [opts.organizerStats] detail view only
 */
export function serializeEvent(event, { viewer, detail = false, organizerStats } = {}) {
  const viewerId = viewer ? viewer._id.toString() : null;
  const creatorId = idOf(event.creator);
  const participantIds = (event.participants || []).map(idOf);
  const isOrganizer = !!viewerId && viewerId === creatorId;
  const joined = !!viewerId && participantIds.includes(viewerId);
  const isAdmin = viewer?.role === 'admin';
  const eventId = event._id.toString();
  // Private to the viewer: whether they bookmarked this event.
  const saved = !!viewer && (viewer.savedEvents || []).some((id) => id.toString() === eventId);
  const point = event.location?.point?.coordinates;

  const out = {
    _id: eventId,
    title: event.title,
    sport: event.sport,
    description: event.description || '',
    bring: event.bring || '',
    location: {
      placeName: event.location?.placeName || '',
      address: event.location?.address || '',
      city: event.location?.city || '',
      countryCode: event.location?.countryCode || undefined,
      lat: Array.isArray(point) && point.length === 2 ? point[1] : null,
      lng: Array.isArray(point) && point.length === 2 ? point[0] : null,
    },
    startAt: event.startAt,
    endAt: event.endAt,
    timezone: event.timezone || 'Europe/Berlin',
    maxParticipants: event.maxParticipants,
    participantCount: participantIds.length,
    spotsLeft: Math.max(0, event.maxParticipants - participantIds.length),
    level: event.level || 'all',
    visibility: event.visibility || 'public',
    status: effectiveStatus(event),
    cancelledReason: event.status === 'cancelled' ? event.cancelledReason || '' : undefined,
    changedAt: event.changedAt || null,
    organizer: {
      _id: creatorId,
      displayName: event.creator && event.creator.name ? displayName(event.creator.name) : 'Organisator',
    },
    joined,
    saved,
    isOrganizer,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };

  // Lightweight trust signals for the detail view: year of sign-up and events organised.
  if (detail) {
    if (event.creator && event.creator.createdAt) {
      out.organizer.memberSince = new Date(event.creator.createdAt).getUTCFullYear();
    }
    if (organizerStats) out.organizer.eventsHosted = organizerStats.eventsHosted;
  }

  // Waiting list (all events)
  const waitIds = (event.waitlist || []).map(idOf);
  out.waitlistCount = waitIds.length;
  const pos = viewerId ? waitIds.indexOf(viewerId) : -1;
  out.waitlistPosition = pos >= 0 ? pos + 1 : null;

  const pending = viewerId ? (event.pendingPromotions || []).find((p) => idOf(p.user) === viewerId) : null;
  out.myPendingPromotion = pending ? { confirmBy: pending.confirmBy } : null;

  if (event.weather?.summary) {
    out.weather = { summary: event.weather.summary, severe: !!event.weather.severe, tempC: event.weather.tempC, code: event.weather.code };
  }

  // Stammspiel game ("Spieltermin")
  let isMember = false;
  let isHost = isOrganizer || isAdmin;
  if (event.group) {
    const g = event.group && event.group._id ? event.group : null;
    const members = (g?.members || []).map((m) => idOf(m.user));
    isMember = !!viewerId && members.includes(viewerId);
    if (g && viewerId) isHost = isHost || [idOf(g.organizer), ...(g.coHosts || []).map(idOf)].includes(viewerId);
    const responses = event.responses || [];
    const outIds = responses.filter((r) => r.answer === 'out').map((r) => idOf(r.user)).filter((id) => !participantIds.includes(id));
    const answered = new Set([...participantIds, ...waitIds, ...outIds]);
    const noAnswerIds = members.filter((id) => !answered.has(id));
    out.series = {
      _id: idOf(event.group),
      name: g?.name || event.title,
      weekday: g?.weekday,
      startTime: g?.startTime,
      rsvpMode: g?.rsvpMode,
      memberCount: members.length,
      isMember,
      ...((isMember || isHost) && g?.inviteCode && { inviteCode: g.inviteCode }),
    };
    out.minPlayers = event.minPlayers ?? null;
    out.deadlineAt = event.deadlineAt || null;
    out.decision = event.decision || 'open';
    out.counts = { in: participantIds.length, out: outIds.length, waiting: waitIds.length, noAnswer: g ? noAnswerIds.length : null };
    if (viewerId) {
      out.myAnswer = joined ? 'in' : pos >= 0 ? 'waiting' : outIds.includes(viewerId) ? 'out' : null;
    }
    if (detail && (isMember || isHost)) {
      const nameOf = (list, id) => {
        const hit = list.find((x) => idOf(x) === id);
        return hit && hit.name ? displayName(hit.name) : 'Mitglied';
      };
      const people = [
        ...(event.participants || []),
        ...(event.waitlist || []),
        ...responses.map((r) => r.user),
        ...(g?.members || []).map((m) => m.user),
      ].filter((p) => p && p.name);
      out.roster = {
        out: outIds.map((id) => ({ _id: id, displayName: nameOf(people, id) })),
        waiting: waitIds.map((id) => ({ _id: id, displayName: nameOf(people, id) })),
        noAnswer: noAnswerIds.map((id) => ({ _id: id, displayName: nameOf(people, id) })),
      };
    }
  }
  out.isHost = isHost;

  // After the game: no-shows (hosts see all, everyone else only their own mark)
  const noShows = event.noShows || [];
  if (isHost && detail) {
    out.noShows = noShows.map((n) => ({ _id: idOf(n.user), disputed: !!n.disputed }));
    const end = event.endAt ? new Date(event.endAt).getTime() : 0;
    const now = Date.now();
    out.canMarkNoShows = event.status !== 'cancelled' && now >= end && now <= end + NO_SHOW_WINDOW_MS;
  }
  if (viewerId) {
    const mine = noShows.find((n) => idOf(n.user) === viewerId);
    if (mine) out.myNoShow = { markedAt: mine.markedAt, disputed: !!mine.disputed };
  }

  if (detail && (isOrganizer || joined || isAdmin || isMember || isHost)) {
    out.participants = (event.participants || []).map((p) => ({
      _id: idOf(p),
      displayName: p && p.name ? displayName(p.name) : 'Teilnehmer:in',
    }));
  }

  return out;
}
