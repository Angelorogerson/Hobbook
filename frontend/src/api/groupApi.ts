import api from './axiosInstance'
import type { EventLevel, EventVisibility, PublicPerson, SportEvent } from './eventApi'

export type RsvpMode = 'ask' | 'autoIn'

/** A "Stammspiel": the weekly game with members. Each week one SportEvent is generated from it. */
export interface Group {
  _id: string
  name: string
  sport: string
  description: string
  bring: string
  level: EventLevel
  location: { placeName: string; address: string; city: string; lat: number | null; lng: number | null }
  /** ISO weekday: 1 = Monday … 7 = Sunday */
  weekday: number
  startTime: string
  durationMin: number
  timezone: string
  maxParticipants: number
  minPlayers: number
  deadlineHours: number
  openDaysBefore: number
  rsvpMode: RsvpMode
  visibility: EventVisibility
  active: boolean
  organizer: PublicPerson
  memberCount: number
  isMember: boolean
  isHost: boolean
  isOrganizer: boolean
  /** The viewer was removed and blocked by a host. */
  isBlocked?: boolean
  muted: boolean
  inviteCode?: string
  members?: (PublicPerson & { joinedAt: string })[]
  coHosts?: PublicPerson[]
  /** Hosts only. */
  blocked?: PublicPerson[]
  upcoming?: SportEvent | null
  nextPlanned?: { startAt: string; opensAt: string }
  history?: { _id: string; startAt: string; happened: boolean; participantCount: number }[]
}

export interface GroupInput {
  name: string
  sport: string
  description?: string
  bring?: string
  level?: EventLevel
  visibility?: EventVisibility
  location: { placeName: string; address: string; city: string; countryCode?: string; lat: number; lng: number }
  weekday: number
  startTime: string
  durationMin: number
  timezone?: string
  maxParticipants: number
  minPlayers: number
  deadlineHours?: number
  openDaysBefore?: number
  rsvpMode?: RsvpMode
}

export const WEEKDAYS = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
export const WEEKDAYS_SHORT = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** "jeden Donnerstag, 19:00" */
export const rhythmText = (g: Pick<Group, 'weekday' | 'startTime'>, short = false) =>
  `${short ? 'jeden' : 'Jeden'} ${short ? WEEKDAYS_SHORT[g.weekday] : WEEKDAYS[g.weekday]}${short ? '.' : ''}, ${g.startTime} Uhr`

export const inviteUrl = (code: string) => `${window.location.origin}/s/${code}`

export async function createGroup(input: GroupInput): Promise<Group> {
  const { data } = await api.post('/groups', input)
  return data.group
}

export async function getGroup(key: string): Promise<Group> {
  const { data } = await api.get(`/groups/${encodeURIComponent(key)}`)
  return data.group
}

export async function getMyGroups(): Promise<Group[]> {
  const { data } = await api.get('/groups/mine')
  return data.groups || []
}

/** `applyToUpcoming`: also change the game that is already open (otherwise from next week on). */
export async function updateGroup(id: string, input: Partial<GroupInput> & { applyToUpcoming?: boolean }): Promise<Group> {
  const { data } = await api.patch(`/groups/${id}`, input)
  return data.group
}

/** Public Stammspiele in a city or around a point, each with its next game. */
export async function listGroups(q: { city?: string; sport?: string; near?: { lat: number; lng: number }; limit?: number }): Promise<Group[]> {
  const params: Record<string, string> = {}
  if (q.city?.trim()) params.city = q.city.trim()
  if (q.sport) params.sport = q.sport
  if (q.near) params.near = `${q.near.lng.toFixed(2)},${q.near.lat.toFixed(2)}`
  if (q.limit) params.limit = String(q.limit)
  const { data } = await api.get('/groups', { params })
  return data.groups || []
}

const post = async (path: string, body?: unknown): Promise<Group> => {
  const { data } = await api.post(path, body)
  return data.group
}

export const joinGroup = (id: string) => post(`/groups/${id}/join`)
export const leaveGroup = (id: string) => post(`/groups/${id}/leave`)
export const muteGroup = (id: string, muted: boolean) => post(`/groups/${id}/mute`, { muted })
export const skipNextGame = (id: string) => post(`/groups/${id}/skip`)
export const transferGroup = (id: string, userId: string) => post(`/groups/${id}/transfer`, { userId })
export const removeMember = (id: string, userId: string, block = false) => post(`/groups/${id}/members/${userId}/remove`, { block })
export const unblockMember = (id: string, userId: string) => post(`/groups/${id}/members/${userId}/unblock`)
export const setCoHost = (id: string, userId: string, add: boolean) => post(`/groups/${id}/cohosts`, { userId, add })

export async function remindNonResponders(id: string): Promise<{ group: Group; reminded: number }> {
  const { data } = await api.post(`/groups/${id}/remind`)
  return { group: data.group, reminded: data.reminded }
}

export async function endGroup(id: string, reason?: string): Promise<Group> {
  const { data } = await api.delete(`/groups/${id}`, { data: { reason } })
  return data.group
}
