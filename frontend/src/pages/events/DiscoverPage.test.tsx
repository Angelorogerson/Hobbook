import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { SportEvent } from '@/api/eventApi'
import { makeEvent } from '@/test/fixtures'

// Fake map: renders one button per *mappable* event it receives and exposes the selection.
vi.mock('@/components/map/EventMap', () => ({
  default: (props: { events: SportEvent[]; selectedId?: string | null; onSelect?: (id: string) => void; onSearchArea?: (b: unknown) => void }) => (
    <div data-testid="fake-map" data-selected={props.selectedId || ''}>
      {props.events
        .filter((e) => e.location.lat !== null)
        .map((e) => (
          <button key={e._id} type="button" data-testid={`marker-${e._id}`} onClick={() => props.onSelect?.(e._id)}>
            marker {e.title}
          </button>
        ))}
      <button type="button" onClick={() => props.onSearchArea?.({ minLng: 13, minLat: 52, maxLng: 14, maxLat: 53 })}>
        search-area
      </button>
    </div>
  ),
}))

const listEvents = vi.fn()
vi.mock('@/api/eventApi', async (orig) => ({
  ...(await orig<typeof import('@/api/eventApi')>()),
  listEvents: (...args: unknown[]) => listEvents(...args),
}))

import DiscoverPage from './DiscoverPage'

function LocationProbe() {
  const loc = useLocation()
  return <output data-testid="location">{loc.search}</output>
}

const renderPage = (url = '/') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <DiscoverPage initialView="list" />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )

describe('DiscoverPage', () => {
  beforeEach(() => listEvents.mockReset())

  it('list and map render the same result set and stay in sync', async () => {
    const a = makeEvent({ _id: 'a', title: 'Fußball A' })
    const b = makeEvent({ _id: 'b', title: 'Basketball B', sport: 'basketball' })
    const c = makeEvent({ _id: 'c', title: 'Ohne Ort', location: { placeName: 'Alt', address: 'x', city: 'Berlin', lat: null, lng: null } })
    listEvents.mockResolvedValue({ events: [a, b, c], total: 3, page: 1, limit: 200 })
    const user = userEvent.setup()
    renderPage()

    const cards = await screen.findAllByTestId('event-card')
    expect(cards).toHaveLength(3)
    const map = screen.getByTestId('fake-map')
    expect(within(map).getAllByRole('button', { name: /^marker/ })).toHaveLength(2) // c has no coordinates
    expect(screen.getByText(/1 ohne Kartenposition/)).toBeInTheDocument()

    // Card → map
    await user.click(screen.getByRole('button', { name: 'Basketball B auf der Karte zeigen' }))
    expect(map).toHaveAttribute('data-selected', 'b')

    // Map → card
    await user.click(screen.getByTestId('marker-a'))
    expect(map).toHaveAttribute('data-selected', 'a')
    const selectedCard = cards.find((el) => el.getAttribute('aria-current') === 'true')
    expect(selectedCard).toHaveTextContent('Fußball A')
  })

  it('filters update the URL and the single canonical query', async () => {
    listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Hier ist noch nichts los.')

    await user.type(screen.getByLabelText('Stadt oder Gebiet'), 'Köln')
    await user.click(screen.getByRole('button', { name: 'Stadt suchen' }))
    await user.selectOptions(screen.getByLabelText('Sportart'), 'running')

    await waitFor(() => {
      const last = listEvents.mock.calls[listEvents.mock.calls.length - 1][0]
      expect(last).toMatchObject({ city: 'Köln', sport: 'running', limit: 200 })
    })
    expect(screen.getByTestId('location').textContent).toContain('stadt=K%C3%B6ln')

    // Searching the map area replaces the city with a bbox
    await user.click(screen.getByRole('button', { name: 'search-area' }))
    await waitFor(() => {
      const last = listEvents.mock.calls[listEvents.mock.calls.length - 1][0]
      expect(last.city).toBeUndefined()
      expect(last.bbox).toEqual({ minLng: 13, minLat: 52, maxLng: 14, maxLat: 53 })
    })
    expect(screen.getByRole('button', { name: /Kartenausschnitt/ })).toBeInTheDocument()
  })

  it('shows an honest empty state with a create action', async () => {
    listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
    renderPage('/?stadt=Nirgendwo')
    expect(await screen.findByText(/keine offenen Events/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Event erstellen/ }).length).toBeGreaterThan(0)
  })

  it('shows an error with retry', async () => {
    listEvents.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ events: [makeEvent()], total: 1, page: 1, limit: 200 })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: /Erneut versuchen/ }))
    expect(await screen.findByTestId('event-card')).toBeInTheDocument()
  })
})
