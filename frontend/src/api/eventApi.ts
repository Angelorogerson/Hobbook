import api from './axiosInstance'

export type EventStatus = 'open' | 'full' | 'cancelled' | 'completed'
export type EventLevel = 'all' | 'beginner' | 'intermediate' | 'advanced'
export type EventVisibility = 'public' | 'unlisted'

export interface EventLocation {
  placeName: string
  address: string
  city: string
  countryCode?: string
  lat: number | null
  lng: number | null
}

export interface PublicPerson {
  _id: string | null
  displayName: string
  /** Detail view only: year the organizer joined and events they have run. */
  memberSince?: number
  eventsHosted?: number
}

export interface SportEvent {
  _id: string
  title: string
  sport: string
  description: string
  /** Optional one-liner: what to bring. */
  bring?: string
  location: EventLocation
  startAt: string
  endAt: string
  timezone: string
  maxParticipants: number
  participantCount: number
  spotsLeft: number
  level: EventLevel
  visibility: EventVisibility
  status: EventStatus
  cancelledReason?: string
  changedAt: string | null
  organizer: PublicPerson
  joined: boolean
  /** Bookmarked by the viewer (private). */
  saved?: boolean
  isOrganizer: boolean
  participants?: PublicPerson[]
  createdAt: string
  updatedAt: string

  /** Waiting list (all events): size, and the viewer's place in it (1-based). */
  waitlistCount?: number
  waitlistPosition?: number | null
  weather?: { summary: string; severe: boolean; tempC?: number; code?: number }
  /** Organizer, co-host or admin. */
  isHost?: boolean

  // Stammspiel games only
  series?: {
    _id: string
    name: string
    weekday?: number
    startTime?: string
    rsvpMode?: 'ask' | 'autoIn'
    memberCount: number
    isMember: boolean
    inviteCode?: string
  }
  minPlayers?: number | null
  deadlineAt?: string | null
  decision?: Decision
  counts?: { in: number; out: number; waiting: number; noAnswer: number | null }
  myAnswer?: MyAnswer
  /** Members and hosts only. */
  roster?: { out: PublicPerson[]; waiting: PublicPerson[]; noAnswer: PublicPerson[] }

  // After the game
  noShows?: { _id: string; disputed: boolean }[]
  canMarkNoShows?: boolean
  myNoShow?: { markedAt: string; disputed: boolean }
  /** Moved up shortly before kick-off: confirm by then, or the spot passes on. */
  myPendingPromotion?: { confirmBy: string } | null
}

export type Decision = 'open' | 'on' | 'off'
export type MyAnswer = 'in' | 'out' | 'waiting' | null

export interface EventInput {
  title: string
  sport: string
  description?: string
  bring?: string
  startAt: string
  endAt: string
  timezone?: string
  maxParticipants: number
  level?: EventLevel
  visibility?: EventVisibility
  location: {
    placeName: string
    address: string
    city: string
    countryCode?: string
    lat: number
    lng: number
  }
}

export interface BBox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export interface EventQuery {
  city?: string
  sport?: string
  from?: string
  to?: string
  bbox?: BBox
  /** Search around a point (see radiusKm). */
  near?: { lat: number; lng: number }
  radiusKm?: number
  page?: number
  limit?: number
  includePast?: boolean
  /** Only games of weekly Stammspiele. */
  series?: boolean
  /** Text search in title and place name (2–60 characters). */
  q?: string
  /** Events with this level or for everyone. */
  level?: Exclude<EventLevel, 'all'>
}

export interface EventListResult {
  events: SportEvent[]
  total: number
  page: number
  limit: number
}

export function toQueryParams(q: EventQuery): Record<string, string> {
  const p: Record<string, string> = {}
  if (q.city?.trim()) p.city = q.city.trim()
  if (q.sport) p.sport = q.sport
  if (q.from) p.from = q.from
  if (q.to) p.to = q.to
  if (q.bbox) {
    const { minLng, minLat, maxLng, maxLat } = q.bbox
    p.bbox = [minLng, minLat, maxLng, maxLat].map((n) => n.toFixed(5)).join(',')
  }
  if (q.near && !q.bbox) {
    // Two decimals (about 1 km) are enough for a radius search and keep the position coarse.
    p.near = `${q.near.lng.toFixed(2)},${q.near.lat.toFixed(2)}`
    if (q.radiusKm) p.radiusKm = String(q.radiusKm)
  }
  if (q.page) p.page = String(q.page)
  if (q.limit) p.limit = String(q.limit)
  if (q.includePast) p.includePast = 'true'
  if (q.series) p.series = 'true'
  if (q.q?.trim()) p.q = q.q.trim()
  if (q.level) p.level = q.level
  return p
}

export async function listEvents(q: EventQuery, signal?: AbortSignal): Promise<EventListResult> {
  const { data } = await api.get('/events', { params: toQueryParams(q), signal })
  return data
}

export async function getEvent(id: string): Promise<SportEvent> {
  const { data } = await api.get(`/events/${id}`)
  return data.event
}

export async function getMyEvents(): Promise<{ created: SportEvent[]; joined: SportEvent[]; saved: SportEvent[] }> {
  const { data } = await api.get('/events/me')
  return { created: data.created || [], joined: data.joined || [], saved: data.saved || [] }
}

export async function saveEvent(id: string): Promise<void> {
  await api.post(`/events/${id}/save`)
}

export async function unsaveEvent(id: string): Promise<void> {
  await api.delete(`/events/${id}/save`)
}

export async function createEvent(input: EventInput): Promise<SportEvent> {
  const { data } = await api.post('/events', input)
  return data.event
}

export async function updateEvent(id: string, input: Partial<EventInput>): Promise<SportEvent> {
  const { data } = await api.patch(`/events/${id}`, input)
  return data.event
}

export async function cancelEvent(id: string, reason?: string): Promise<SportEvent> {
  const { data } = await api.post(`/events/${id}/cancel`, { reason })
  return data.event
}

export async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/events/${id}`)
}

export async function joinEvent(id: string): Promise<SportEvent> {
  const { data } = await api.post(`/events/${id}/join`)
  return data.event
}

export async function leaveEvent(id: string): Promise<SportEvent> {
  const { data } = await api.post(`/events/${id}/leave`)
  return data.event
}

/** Queue for a full event; the first in line moves up automatically. */
export async function joinWaitlist(id: string): Promise<SportEvent> {
  const { data } = await api.post(`/events/${id}/waitlist`)
  return data.event
}

/** Stammspiel games: "Ich bin dabei" / "Diesmal nicht". */
export async function answerEvent(id: string, answer: 'in' | 'out'): Promise<SportEvent> {
  const { data } = await api.post(`/events/${id}/answer`, { answer })
  return data.event
}

/** "Ich komme" after moving up from the waiting list shortly before kick-off. */
export async function confirmSpot(id: string): Promise<SportEvent> {
  const { data } = await api.post(`/events/${id}/confirm-spot`)
  return data.event
}

/** Hosts call a game early. */
export async function decideEvent(id: string, decision: 'on' | 'off', reason?: string): Promise<SportEvent> {
  const { data } = await api.post(`/events/${id}/decide`, { decision, reason })
  return data.event
}

export async function markNoShows(id: string, userIds: string[]): Promise<SportEvent> {
  const { data } = await api.put(`/events/${id}/no-shows`, { userIds })
  return data.event
}

export async function disputeNoShow(id: string, note?: string): Promise<SportEvent> {
  const { data } = await api.post(`/events/${id}/dispute`, { note })
  return data.event
}

// ─── Admin ───
export async function listAllEventsAdmin(page = 1): Promise<EventListResult> {
  const { data } = await api.get('/events/admin/all', { params: { page, limit: 100 } })
  return data
}
