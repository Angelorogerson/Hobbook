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
}

export interface SportEvent {
  _id: string
  title: string
  sport: string
  description: string
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
  isOrganizer: boolean
  participants?: PublicPerson[]
  createdAt: string
  updatedAt: string
}

export interface EventInput {
  title: string
  sport: string
  description?: string
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
  page?: number
  limit?: number
  includePast?: boolean
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
  if (q.page) p.page = String(q.page)
  if (q.limit) p.limit = String(q.limit)
  if (q.includePast) p.includePast = 'true'
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

export async function getMyEvents(): Promise<{ created: SportEvent[]; joined: SportEvent[] }> {
  const { data } = await api.get('/events/me')
  return data
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

// ─── Admin ───
export async function listAllEventsAdmin(page = 1): Promise<EventListResult> {
  const { data } = await api.get('/events/admin/all', { params: { page, limit: 100 } })
  return data
}
