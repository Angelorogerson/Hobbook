import type { SportEvent } from '@/api/eventApi'

export function makeEvent(over: Partial<SportEvent> = {}): SportEvent {
  const start = new Date(Date.now() + 24 * 3600 * 1000)
  const end = new Date(start.getTime() + 2 * 3600 * 1000)
  return {
    _id: 'e1',
    title: 'Kick im Park',
    sport: 'football',
    description: '',
    bring: '',
    location: { placeName: 'Volkspark', address: 'Volkspark 1', city: 'Berlin', lat: 52.5, lng: 13.4 },
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    timezone: 'Europe/Berlin',
    maxParticipants: 10,
    participantCount: 3,
    spotsLeft: 7,
    level: 'all',
    visibility: 'public',
    status: 'open',
    changedAt: null,
    organizer: { _id: 'o1', displayName: 'Olga O.' },
    joined: false,
    saved: false,
    isOrganizer: false,
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
    ...over,
  }
}
