import { displayName } from './text.js';

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

  if (detail && (isOrganizer || joined || isAdmin)) {
    out.participants = (event.participants || []).map((p) => ({
      _id: idOf(p),
      displayName: p && p.name ? displayName(p.name) : 'Teilnehmer:in',
    }));
  }

  return out;
}
