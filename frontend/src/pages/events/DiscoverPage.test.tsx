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

const alertApi = { listAlerts: vi.fn(), createAlert: vi.fn(), deleteAlert: vi.fn() }
vi.mock('@/api/alertApi', async (orig) => ({
  ...(await orig<typeof import('@/api/alertApi')>()),
  listAlerts: (...args: unknown[]) => alertApi.listAlerts(...args),
  createAlert: (...args: unknown[]) => alertApi.createAlert(...args),
  deleteAlert: (...args: unknown[]) => alertApi.deleteAlert(...args),
}))

// Guest by default; single tests sign in.
const session = { isLoggedIn: false }
vi.mock('@/store/AuthContext', async (orig) => ({
  ...(await orig<typeof import('@/store/AuthContext')>()),
  useAuthContext: () => ({ authState: { isLoading: false, isLoggedIn: session.isLoggedIn, user: null, token: null } }),
}))

import DiscoverPage from './DiscoverPage'
import { toQueryParams } from '@/api/eventApi'

function LocationProbe() {
  const loc = useLocation()
  return <output data-testid="location">{loc.search}</output>
}

function LoginProbe() {
  const loc = useLocation()
  return <output data-testid="login-from">{(loc.state as { from?: string } | null)?.from}</output>
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
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  )

const lastQuery = () => listEvents.mock.calls[listEvents.mock.calls.length - 1][0]

describe('DiscoverPage', () => {
  beforeEach(() => {
    listEvents.mockReset()
    alertApi.listAlerts.mockReset().mockResolvedValue([])
    alertApi.createAlert.mockReset()
    alertApi.deleteAlert.mockReset()
    session.isLoggedIn = false
    localStorage.clear()
  })

  describe('search alerts', () => {
    it('offers "Sag mir Bescheid" in the empty state of a city search and sends guests to the login page', async () => {
      listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
      const user = userEvent.setup()
      renderPage('/?stadt=Kaiserslautern&sport=basketball')
      await screen.findByText('Hier ist noch nichts los.')
      expect(screen.getByRole('link', { name: /Event erstellen/ })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Sag mir Bescheid bei neuen Basketball-Events in Kaiserslautern' }))
      // After signing in they come back to the same search.
      expect(await screen.findByTestId('login-from')).toHaveTextContent('/?stadt=Kaiserslautern&sport=basketball')
      expect(alertApi.listAlerts).not.toHaveBeenCalled()
      expect(alertApi.createAlert).not.toHaveBeenCalled()
    })

    it('signed in: one tap creates the alert, another removes it', async () => {
      session.isLoggedIn = true
      listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
      const alert = { _id: 'al1', city: 'Kaiserslautern', sport: null }
      alertApi.createAlert.mockResolvedValue({ alert, alerts: [alert] })
      alertApi.deleteAlert.mockResolvedValue([])
      const user = userEvent.setup()
      renderPage('/?stadt=Kaiserslautern')

      await user.click(await screen.findByRole('button', { name: 'Sag mir Bescheid bei neuen Events in Kaiserslautern' }))
      expect(alertApi.createAlert).toHaveBeenCalledWith('Kaiserslautern', undefined)
      const on = await screen.findByRole('button', { name: /^Alarm aktiv/ })

      await user.click(on)
      expect(alertApi.deleteAlert).toHaveBeenCalledWith('al1')
      expect(await screen.findByRole('button', { name: /^Sag mir Bescheid/ })).toBeInTheDocument()
    })

    it('includes the sport filter in the alert', async () => {
      session.isLoggedIn = true
      listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
      // An alert for all sports does not cover the narrower basketball search.
      alertApi.listAlerts.mockResolvedValue([{ _id: 'al0', city: 'Kaiserslautern', sport: 'football' }])
      const alert = { _id: 'al2', city: 'Kaiserslautern', sport: 'basketball' }
      alertApi.createAlert.mockResolvedValue({ alert, alerts: [alert] })
      const user = userEvent.setup()
      renderPage('/?stadt=Kaiserslautern&sport=basketball')

      await user.click(await screen.findByRole('button', { name: /^Sag mir Bescheid bei neuen Basketball-Events/ }))
      expect(alertApi.createAlert).toHaveBeenCalledWith('Kaiserslautern', 'basketball')
    })

    it('shows a quiet line below results and knows an alert that already exists', async () => {
      session.isLoggedIn = true
      listEvents.mockResolvedValue({ events: [makeEvent()], total: 1, page: 1, limit: 200 })
      alertApi.listAlerts.mockResolvedValue([{ _id: 'al1', city: 'köln', sport: null }])
      renderPage('/?stadt=K%C3%B6ln')
      await screen.findByTestId('event-card')
      expect(await screen.findByRole('button', { name: /^Alarm aktiv/ })).toBeInTheDocument()
      expect(screen.queryByText('Hier ist noch nichts los.')).not.toBeInTheDocument()
    })

    it('is not offered without a city (everywhere, map area)', async () => {
      listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
      const first = renderPage()
      await screen.findByText('Hier ist noch nichts los.')
      expect(screen.queryByRole('button', { name: /Sag mir Bescheid/ })).not.toBeInTheDocument()
      first.unmount()

      renderPage('/?bereich=13,52,14,53')
      await screen.findByText('Hier ist noch nichts los.')
      expect(screen.queryByRole('button', { name: /Sag mir Bescheid/ })).not.toBeInTheDocument()
    })
  })

  describe('level and text filters', () => {
    it('reach the query and the URL, and reset clears them', async () => {
      listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
      const user = userEvent.setup()
      renderPage()
      await screen.findByText('Hier ist noch nichts los.')

      await user.selectOptions(screen.getByLabelText('Niveau'), 'beginner')
      await waitFor(() => expect(lastQuery()).toMatchObject({ level: 'beginner' }))
      expect(screen.getByTestId('location').textContent).toContain('niveau=beginner')

      await user.type(screen.getByLabelText('Titel oder Platz'), 'Volkspark{Enter}')
      await waitFor(() => expect(lastQuery()).toMatchObject({ level: 'beginner', q: 'Volkspark' }))
      expect(screen.getByTestId('location').textContent).toContain('suche=Volkspark')
      // Both count as active filters: the empty state says so and reset is offered.
      expect(screen.getByText(/Für diesen Ort und diese Filter/)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
      await waitFor(() => {
        expect(lastQuery().q).toBeUndefined()
        expect(lastQuery().level).toBeUndefined()
      })
      expect(screen.getByTestId('location').textContent).toBe('')
      expect(screen.getByLabelText('Titel oder Platz')).toHaveValue('')
      expect(screen.getByLabelText('Niveau')).toHaveValue('')
    })

    it('searches after a short pause, ignores a single letter and can be cleared', async () => {
      listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
      const user = userEvent.setup()
      renderPage()
      await screen.findByText('Hier ist noch nichts los.')
      const field = screen.getByLabelText('Titel oder Platz')

      await user.type(field, 'k{Enter}')
      expect(screen.getByTestId('location').textContent).toBe('')

      await user.type(field, 'ick')
      await waitFor(() => expect(lastQuery()).toMatchObject({ q: 'kick' }), { timeout: 2000 })
      expect(screen.getByTestId('location').textContent).toContain('suche=kick')

      // Deleting down to one letter ends the text search but keeps the letter in the field.
      await user.type(field, '{Backspace}{Backspace}{Backspace}')
      await waitFor(() => expect(lastQuery().q).toBeUndefined(), { timeout: 2000 })
      expect(field).toHaveValue('k')
      await user.type(field, 'orb')
      await waitFor(() => expect(lastQuery()).toMatchObject({ q: 'korb' }), { timeout: 2000 })

      await user.click(screen.getByRole('button', { name: 'Textsuche löschen' }))
      await waitFor(() => expect(lastQuery().q).toBeUndefined())
      expect(field).toHaveValue('')
      expect(screen.getByTestId('location').textContent).toBe('')
    })

    it('start from a shared link', async () => {
      listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
      renderPage('/?suche=Park&niveau=advanced')
      await screen.findByText('Hier ist noch nichts los.')
      expect(listEvents.mock.calls[0][0]).toMatchObject({ q: 'Park', level: 'advanced' })
      expect(screen.getByLabelText('Titel oder Platz')).toHaveValue('Park')
      expect(screen.getByLabelText('Niveau')).toHaveValue('advanced')
    })

    it('ignores an unknown level in the link', async () => {
      listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
      renderPage('/?niveau=profi')
      await screen.findByText('Hier ist noch nichts los.')
      expect(listEvents.mock.calls[0][0].level).toBeUndefined()
    })

    it('are sent to the API as q and level', () => {
      expect(toQueryParams({ q: '  Kick ', level: 'intermediate' })).toEqual({ q: 'Kick', level: 'intermediate' })
      expect(toQueryParams({ q: '   ' })).toEqual({})
    })
  })

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
    await user.click(screen.getByRole('button', { name: 'Auf Karte zeigen: Basketball B' }))
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

  it('the "Stammspiele" chip shows only weekly games and lives in the URL', async () => {
    listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
    const user = userEvent.setup()
    renderPage('/?stadt=Kaiserslautern')
    await screen.findByText('Hier ist noch nichts los.')
    const chip = screen.getByRole('button', { name: 'Stammspiele' })
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => {
      const last = listEvents.mock.calls[listEvents.mock.calls.length - 1][0]
      expect(last).toMatchObject({ city: 'Kaiserslautern', series: true })
    })
    expect(screen.getByTestId('location').textContent).toContain('stamm=1')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Stammspiele in Kaiserslautern')
  })

  it('shows an honest empty state with a create action', async () => {
    listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
    renderPage('/?stadt=Nirgendwo')
    expect(await screen.findByText(/keine offenen Events/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Event erstellen/ }).length).toBeGreaterThan(0)
  })

  it('searches around the viewer only after a click, and a city search replaces it', async () => {
    listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
    const getCurrentPosition = vi.fn((ok: (p: { coords: { latitude: number; longitude: number } }) => void) =>
      ok({ coords: { latitude: 49.44, longitude: 7.77 } })
    )
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(/Keine Events gefunden/)
    expect(getCurrentPosition).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'In meiner Nähe' }))
    await waitFor(() => {
      const last = listEvents.mock.calls[listEvents.mock.calls.length - 1][0]
      expect(last.near).toEqual({ lat: 49.44, lng: 7.77 })
      expect(last.radiusKm).toBe(25)
    })
    // The position is never written to the shareable URL.
    expect(screen.getByTestId('location').textContent).toBe('')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('in deiner Nähe (25 km)')

    await user.type(screen.getByLabelText('Stadt oder Gebiet'), 'Mannheim')
    await user.click(screen.getByRole('button', { name: 'Stadt suchen' }))
    await waitFor(() => {
      const last = listEvents.mock.calls[listEvents.mock.calls.length - 1][0]
      expect(last.city).toBe('Mannheim')
      expect(last.near).toBeUndefined()
    })
  })

  it('explains a refused location request', async () => {
    listEvents.mockResolvedValue({ events: [], total: 0, page: 1, limit: 200 })
    const getCurrentPosition = vi.fn((_ok: unknown, fail: (e: { code: number; PERMISSION_DENIED: number }) => void) =>
      fail({ code: 1, PERMISSION_DENIED: 1 })
    )
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'In meiner Nähe' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/nicht erlaubt/)
  })

  it('hides full events with one tap and reopens the last searched city', async () => {
    const open = makeEvent({ _id: 'a', title: 'Offen A' })
    const full = makeEvent({ _id: 'b', title: 'Voll B', status: 'full', participantCount: 10, spotsLeft: 0 })
    listEvents.mockResolvedValue({ events: [open, full], total: 2, page: 1, limit: 200 })
    const user = userEvent.setup()
    const first = renderPage()
    expect(await screen.findAllByTestId('event-card')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Plätze frei' }))
    expect(screen.getAllByTestId('event-card')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Plätze frei' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('location').textContent).toContain('frei=1')

    await user.type(screen.getByLabelText('Stadt oder Gebiet'), 'Köln')
    await user.click(screen.getByRole('button', { name: 'Stadt suchen' }))
    first.unmount()

    // A later visit without a place in the link starts in the remembered city
    renderPage()
    await waitFor(() => expect(screen.getByTestId('location').textContent).toContain('stadt=K%C3%B6ln'))
  })

  it('shows an error with retry', async () => {
    listEvents.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ events: [makeEvent()], total: 1, page: 1, limit: 200 })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: /Erneut versuchen/ }))
    expect(await screen.findByTestId('event-card')).toBeInTheDocument()
  })
})
