import api from './axiosInstance'
import type { SportEvent } from './eventApi'

// The bell, one-tap email links, push, public profiles and pilot metrics.

export interface AppNotification {
  _id: string
  type: string
  title: string
  body: string
  link: string
  read: boolean
  createdAt: string
}

export async function listNotifications(): Promise<{ notifications: AppNotification[]; unread: number }> {
  const { data } = await api.get('/notifications')
  return data
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get('/notifications/unread-count')
  return data.unread
}

export async function markNotificationsRead(ids?: string[]): Promise<number> {
  const { data } = await api.post('/notifications/read', ids ? { ids } : {})
  return data.unread
}

export async function answerFromLink(token: string, answer?: 'in' | 'out'): Promise<{ event: SportEvent; answer: 'in' | 'out' }> {
  const { data } = await api.post('/links/answer', { token, ...(answer && { answer }) })
  return data
}

/** Without `muted` it only reads the state (nothing changes on open). */
export async function muteFromLink(token: string, muted?: boolean): Promise<{ group: { _id: string; name: string }; muted: boolean }> {
  const { data } = await api.post('/links/mute', { token, ...(muted !== undefined && { muted }) })
  return data
}

/** What an email answer link is about. Changes nothing. */
export async function previewLink(token: string): Promise<{ event: SportEvent; suggested: 'in' | 'out'; name: string }> {
  const { data } = await api.post('/links/preview', { token })
  return data
}

export async function getPushKey(): Promise<string | null> {
  const { data } = await api.get('/push/key')
  return data.publicKey
}

export async function savePushSubscription(sub: PushSubscriptionJSON): Promise<void> {
  await api.post('/push/subscribe', sub)
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await api.post('/push/unsubscribe', { endpoint })
}

export interface Reliability {
  games: number
  attended: number
  noShows: number
  lateCancels: number
  enoughData: boolean
}

export interface PublicProfile {
  _id: string
  displayName: string
  memberSince: number
  sports: string[]
  eventsHosted: number
  groupsHosted: number
  gamesPlayed: number
  reliability: Reliability | null
  isSelf: boolean
}

export async function getProfile(id: string): Promise<PublicProfile> {
  const { data } = await api.get(`/users/${id}/profile`)
  return data.profile
}

export interface PilotMetrics {
  users: number
  activeGroups: number
  organizers: number
  members: number
  last28Days: {
    games: number
    decidedOn: number
    decidedOff: number
    answerRateBeforeDeadline: number | null
    medianHoursToAnswer: number | null
    noShowRate: number | null
    emails: Record<string, number>
  }
}

export async function getMetrics(): Promise<PilotMetrics> {
  const { data } = await api.get('/admin/metrics')
  return data
}
