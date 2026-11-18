import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { makeEvent } from '@/test/fixtures'

const listEvents = vi.fn()
vi.mock('@/api/eventApi', async (orig) => ({
  ...(await orig<typeof import('@/api/eventApi')>()),
  // A spy result may be a factory: lets a test reject without the spy itself
  // tracking (and reporting) the rejected promise.
  listEvents: (...args: unknown[]) => {
    const r = listEvents(...args)
    return typeof r === 'function' ? r() : r
  },
}))

import LandingPage from './LandingPage'

function Where() {
  const loc = useLocation()
  return <output data-testid="where">{loc.pathname + loc.search}</output>
}

const renderLanding = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  )

describe('LandingPage', () => {
  beforeEach(() => listEvents.mockReset())

  it('explains Hobbook with one H1 and clear primary/secondary actions', async () => {
    listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 6 })
    renderLanding()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Finde dein nächstes Spiel.')
    expect(screen.getAllByRole('link', { name: /Events entdecken/ })[0]).toHaveAttribute('href', '/entdecken')
    expect(screen.getAllByRole('link', { name: /Event erstellen/ })[0]).toHaveAttribute('href', '/events/neu')
    // Each section has its own heading; the three steps are spelled out as text
    for (const name of [/Das läuft gerade/, /In drei Schritten/, /Worauf hast du Lust/, /Starte dein eigenes Event/, /Fair und sicher dabei/, /Wo spielst du als Nächstes/]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    for (const name of ['Finden', 'Mitmachen', 'Hingehen']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument()
    }
    await screen.findByText('Noch keine Events.')
  })

  it('shows real upcoming events as real cards', async () => {
    listEvents.mockResolvedValue({
      events: [makeEvent({ _id: 'a', title: 'Echtes Event A' }), makeEvent({ _id: 'b', title: 'Echtes Event B', sport: 'running' })],
      total: 2,
      page: 1,
      limit: 6,
    })
    renderLanding()
    const rail = await screen.findByRole('list', { name: 'Aktuelle Events' })
    expect(within(rail).getAllByTestId('event-card')).toHaveLength(2)
    expect(within(rail).getByRole('link', { name: 'Echtes Event A' })).toHaveAttribute('href', '/events/a')
    expect(listEvents).toHaveBeenCalledWith({ limit: 6 }, expect.anything())
  })

  it('is honest when there are no events (no invented content)', async () => {
    listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 6 })
    renderLanding()
    expect(await screen.findByText('Noch keine Events.')).toBeInTheDocument()
    expect(screen.queryAllByTestId('event-card')).toHaveLength(0)
  })

  it('says so when events cannot be loaded, and stays usable', async () => {
    listEvents.mockReturnValue(() => Promise.reject(new Error('offline')))
    renderLanding()
    expect(await screen.findByText('Events konnten gerade nicht geladen werden.')).toBeInTheDocument()
    expect(screen.queryByText('Noch keine Events.')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Events entdecken/ }).length).toBeGreaterThan(0)
  })

  it('hands the city search over to Discover', async () => {
    listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 6 })
    const user = userEvent.setup()
    renderLanding()
    const hero = screen.getAllByRole('search')[0]
    await user.type(within(hero).getByLabelText('Wo willst du spielen?'), 'Köln')
    await user.click(within(hero).getByRole('button', { name: 'Events in dieser Stadt suchen' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/entdecken?stadt=K%C3%B6ln')
  })

  it('links every real sport to a filtered Discover view', async () => {
    listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 6 })
    renderLanding()
    const sports = screen.getByRole('list', { name: 'Direkt zur Sportart' })
    const links = within(sports).getAllByRole('link')
    expect(links).toHaveLength(12)
    expect(within(sports).getByRole('link', { name: 'Basketball' })).toHaveAttribute('href', '/entdecken?sport=basketball')
    await screen.findByText('Noch keine Events.')
  })
})
