import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { makeEvent } from '@/test/fixtures'
import type { SportEvent } from '@/api/eventApi'

// The card has its own tests; here only the actions under it matter.
vi.mock('@/components/events/EventCard', () => ({ default: ({ event }: { event: SportEvent }) => <h3>{event.title}</h3> }))

const api = { getMyEvents: vi.fn(), getMyGroups: vi.fn() }
vi.mock('@/api/eventApi', async (orig) => ({
  ...(await orig<typeof import('@/api/eventApi')>()),
  getMyEvents: (...a: unknown[]) => api.getMyEvents(...a),
}))
vi.mock('@/api/groupApi', async (orig) => ({
  ...(await orig<typeof import('@/api/groupApi')>()),
  getMyGroups: (...a: unknown[]) => api.getMyGroups(...a),
}))

import MyEventsPage from './MyEventsPage'

const row = (title: string) => screen.getByRole('heading', { name: title }).closest('li')!

describe('MyEventsPage: Nochmal veranstalten', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    api.getMyGroups.mockResolvedValue([])
  })

  it('offers it for past and cancelled one-off games in "Erstellt" only', async () => {
    api.getMyEvents.mockResolvedValue({
      created: [
        makeEvent({ _id: 'up', title: 'Kommt noch', isOrganizer: true }),
        makeEvent({ _id: 'past', title: 'Schon gespielt', status: 'completed', isOrganizer: true }),
        makeEvent({ _id: 'off', title: 'Fiel aus', status: 'cancelled', isOrganizer: true }),
        makeEvent({
          _id: 'series',
          title: 'Stammspiel-Termin',
          status: 'completed',
          isOrganizer: true,
          series: { _id: 'g1', name: 'Mittwochskick', memberCount: 8, isMember: true },
        }),
      ],
      joined: [makeEvent({ _id: 'j1', title: 'War dabei', status: 'completed' })],
      saved: [],
    })
    render(
      <MemoryRouter>
        <MyEventsPage />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Schon gespielt' })).toBeInTheDocument()
    expect(within(row('Schon gespielt')).getByRole('link', { name: 'Nochmal veranstalten' })).toHaveAttribute('href', '/events/neu?kopie=past')
    expect(within(row('Fiel aus')).getByRole('link', { name: 'Nochmal veranstalten' })).toHaveAttribute('href', '/events/neu?kopie=off')
    // Upcoming games keep their usual actions; Stammspiel games repeat by themselves.
    expect(within(row('Kommt noch')).queryByRole('link', { name: 'Nochmal veranstalten' })).not.toBeInTheDocument()
    expect(within(row('Kommt noch')).getByRole('link', { name: 'Bearbeiten' })).toBeInTheDocument()
    expect(within(row('Stammspiel-Termin')).queryByRole('link', { name: 'Nochmal veranstalten' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Nochmal veranstalten' })).toHaveLength(2)
  })

  it('does not offer it for games the person only joined', async () => {
    api.getMyEvents.mockResolvedValue({
      created: [],
      joined: [makeEvent({ _id: 'j1', title: 'War dabei', status: 'completed' })],
      saved: [],
    })
    render(
      <MemoryRouter>
        <MyEventsPage />
      </MemoryRouter>
    )

    // The page opens on the first tab with content: "Dabei".
    expect(await screen.findByRole('heading', { name: 'War dabei' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Nochmal veranstalten' })).not.toBeInTheDocument()
  })
})
