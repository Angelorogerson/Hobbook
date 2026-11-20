import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { makeEvent } from '@/test/fixtures'
import type { Group } from '@/api/groupApi'

const api = { getEvent: vi.fn(), getGroup: vi.fn() }
vi.mock('@/api/eventApi', async (orig) => ({
  ...(await orig<typeof import('@/api/eventApi')>()),
  getEvent: (...a: unknown[]) => api.getEvent(...a),
}))
vi.mock('@/api/groupApi', async (orig) => ({
  ...(await orig<typeof import('@/api/groupApi')>()),
  getGroup: (...a: unknown[]) => api.getGroup(...a),
}))
vi.mock('@/store/AuthContext', () => ({
  useAuthContext: () => ({ authState: { isLoggedIn: false, isLoading: false, user: null } }),
}))

import PosterPage from './PosterPage'

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/events/:id/aushang" element={<PosterPage />} />
        <Route path="/stammspiel/:key/aushang" element={<PosterPage />} />
      </Routes>
    </MemoryRouter>
  )

const group = (over: Partial<Group> = {}): Group => ({
  _id: 'g1',
  name: 'Basketball am Uni-Platz',
  sport: 'basketball',
  description: '',
  bring: '',
  level: 'intermediate',
  location: { placeName: 'Uni-Platz', address: 'Gottlieb-Daimler-Str. 1', city: 'Kaiserslautern', lat: 49.42, lng: 7.75 },
  weekday: 4,
  startTime: '19:00',
  durationMin: 120,
  timezone: 'Europe/Berlin',
  maxParticipants: 12,
  minPlayers: 6,
  deadlineHours: 3,
  openDaysBefore: 5,
  rsvpMode: 'ask',
  visibility: 'public',
  active: true,
  organizer: { _id: 'o1', displayName: 'Olga O.' },
  memberCount: 8,
  isMember: false,
  isHost: false,
  isOrganizer: false,
  muted: false,
  ...over,
})

describe('PosterPage', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders title, time, place and a QR code for an event', async () => {
    api.getEvent.mockResolvedValue(
      makeEvent({
        startAt: '2026-11-21T17:00:00.000Z',
        endAt: '2026-11-21T19:00:00.000Z',
        location: { placeName: 'Volkspark', address: 'Volkspark 1', city: 'Berlin', lat: 52.5, lng: 13.4 },
      })
    )
    renderAt('/events/e1/aushang')

    expect(await screen.findByRole('heading', { level: 1, name: 'Kick im Park' })).toBeInTheDocument()
    expect(api.getEvent).toHaveBeenCalledWith('e1')
    expect(screen.getByText('Samstag, 21. November 2026')).toBeInTheDocument()
    expect(screen.getByText(/18:00–20:00 Uhr/)).toBeInTheDocument()
    expect(screen.getByText('Volkspark')).toBeInTheDocument()
    expect(screen.getByText('Volkspark 1, Berlin')).toBeInTheDocument()
    expect(screen.getByText('Kostenlos · Einfach vorbeikommen oder online zusagen')).toBeInTheDocument()
    expect(screen.getByText('Scannen und mitmachen')).toBeInTheDocument()
    expect(screen.getByText('Hobbook')).toBeInTheDocument()
    // Level "all" is not worth a line.
    expect(screen.queryByText(/Niveau/)).not.toBeInTheDocument()

    const url = `${window.location.origin}/events/e1`
    const qr = screen.getByRole('img', { name: `QR-Code: ${url}` })
    expect(qr.tagName.toLowerCase()).toBe('svg')
    // Version 1 has 21 modules per side; real data needs at least that many dark squares.
    const d = qr.querySelector('path')?.getAttribute('d') || ''
    expect(d.match(/M/g)!.length).toBeGreaterThan(100)
    expect(screen.getByText(url.replace(/^https?:\/\//, ''))).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Zurück' })).toHaveAttribute('href', '/events/e1')
  })

  it('prints with the Drucken button', async () => {
    api.getEvent.mockResolvedValue(makeEvent())
    const print = vi.fn()
    vi.stubGlobal('print', print)
    const user = userEvent.setup()
    renderAt('/events/e1/aushang')
    await user.click(await screen.findByRole('button', { name: 'Drucken' }))
    expect(print).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('shows the weekly rhythm and the invite link for a Stammspiel', async () => {
    api.getGroup.mockResolvedValue(group({ isHost: true, inviteCode: 'abc12345' }))
    renderAt('/stammspiel/g1/aushang')

    expect(await screen.findByRole('heading', { level: 1, name: 'Basketball am Uni-Platz' })).toBeInTheDocument()
    expect(api.getGroup).toHaveBeenCalledWith('g1')
    expect(screen.getByText('Jeden Donnerstag, 19:00 Uhr')).toBeInTheDocument()
    expect(screen.getByText('Uni-Platz')).toBeInTheDocument()
    expect(screen.getByText('Gottlieb-Daimler-Str. 1, Kaiserslautern')).toBeInTheDocument()
    expect(screen.getByText('Niveau: Fortgeschritten')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `QR-Code: ${window.location.origin}/s/abc12345` })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zurück' })).toHaveAttribute('href', '/stammspiel/g1')
  })

  it('falls back to the public Stammspiel page without an invite code', async () => {
    api.getGroup.mockResolvedValue(group())
    renderAt('/stammspiel/g1/aushang')
    expect(await screen.findByRole('img', { name: `QR-Code: ${window.location.origin}/stammspiel/g1` })).toBeInTheDocument()
  })

  it('shows a not-found state', async () => {
    api.getEvent.mockRejectedValue(
      Object.assign(new Error('404'), { isAxiosError: true, response: { status: 404, data: { message: 'Event nicht gefunden' } } })
    )
    renderAt('/events/nope/aushang')
    expect(await screen.findByRole('heading', { name: 'Nicht gefunden' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows other errors with their message', async () => {
    api.getEvent.mockRejectedValue(
      Object.assign(new Error('500'), { isAxiosError: true, response: { status: 500, data: { message: 'Interner Serverfehler' } } })
    )
    renderAt('/events/e1/aushang')
    expect(await screen.findByRole('heading', { name: 'Fehler' })).toBeInTheDocument()
    expect(screen.getByText('Interner Serverfehler')).toBeInTheDocument()
  })
})
