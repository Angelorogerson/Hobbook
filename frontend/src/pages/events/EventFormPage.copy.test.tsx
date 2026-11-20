import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { makeEvent } from '@/test/fixtures'
import type { PickedLocation } from '@/components/map/LocationPicker'

// The real picker needs WebGL: show what the form hands it instead.
vi.mock('@/components/map/LocationPicker', () => ({
  default: ({ value }: { value: PickedLocation }) => (
    <div data-testid="picker">
      {value.placeName}|{value.address}|{value.city}|{String(value.lat)}|{String(value.lng)}
    </div>
  ),
}))

const api = { getEvent: vi.fn(), createEvent: vi.fn(), getMyPlaces: vi.fn() }
vi.mock('@/api/eventApi', async (orig) => ({
  ...(await orig<typeof import('@/api/eventApi')>()),
  getEvent: (...a: unknown[]) => api.getEvent(...a),
  createEvent: (...a: unknown[]) => api.createEvent(...a),
}))
vi.mock('@/api/placesApi', () => ({ getMyPlaces: (...a: unknown[]) => api.getMyPlaces(...a) }))
vi.mock('@/store/AuthContext', () => ({
  useAuthContext: () => ({ authState: { isLoggedIn: true, isLoading: false, user: { _id: 'u1', role: 'user', name: 'U' } } }),
}))

import EventFormPage, { fromCopy, nextWeeklyStart } from './EventFormPage'

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min)

describe('nextWeeklyStart (Nochmal veranstalten)', () => {
  it('skips whole weeks until the start lies in the future', () => {
    // Wed 11 Nov 18:30, today is Fri 20 Nov: the next Wednesday is 25 Nov.
    const next = nextWeeklyStart(local(2026, 11, 11, 18, 30).toISOString(), local(2026, 11, 20, 10, 0))
    expect(next).toEqual(local(2026, 11, 25, 18, 30))
    expect(next.getDay()).toBe(3)
  })

  it('takes the following week for a game that was yesterday', () => {
    expect(nextWeeklyStart(local(2026, 11, 19, 20, 0).toISOString(), local(2026, 11, 20, 10, 0))).toEqual(local(2026, 11, 26, 20, 0))
  })

  it('can land on today when the time of day is still ahead', () => {
    // Last Friday 20:00, now Friday 10:00: tonight.
    expect(nextWeeklyStart(local(2026, 11, 13, 20, 0).toISOString(), local(2026, 11, 20, 10, 0))).toEqual(local(2026, 11, 20, 20, 0))
  })

  it('never returns the present moment or the past', () => {
    // Exactly one week ago to the minute: not "in the future" yet.
    expect(nextWeeklyStart(local(2026, 11, 13, 10, 0).toISOString(), local(2026, 11, 20, 10, 0))).toEqual(local(2026, 11, 27, 10, 0))
    // Earlier today.
    expect(nextWeeklyStart(local(2026, 11, 20, 9, 0).toISOString(), local(2026, 11, 20, 10, 0))).toEqual(local(2026, 11, 27, 9, 0))
  })

  it('moves an upcoming game one week on', () => {
    expect(nextWeeklyStart(local(2026, 11, 22, 11, 0).toISOString(), local(2026, 11, 20, 10, 0))).toEqual(local(2026, 11, 29, 11, 0))
  })

  it('works for games from long ago and keeps weekday and time', () => {
    const start = local(2025, 1, 1, 9, 15) // a Wednesday
    const next = nextWeeklyStart(start.toISOString(), local(2026, 11, 20, 10, 0))
    expect(next).toEqual(local(2026, 11, 25, 9, 15))
    expect(next.getDay()).toBe(start.getDay())
  })

  it('keeps the time of day across a clock change', () => {
    // Europe switches to summer time on 29 Mar 2026; other zones are unaffected by this check.
    const next = nextWeeklyStart(local(2026, 3, 22, 10, 0).toISOString(), local(2026, 3, 23, 8, 0))
    expect(next).toEqual(local(2026, 3, 29, 10, 0))
    expect(next.getHours()).toBe(10)
  })

  it('falls back to next week for a broken date', () => {
    expect(nextWeeklyStart('kaputt', local(2026, 11, 20, 10, 0))).toEqual(local(2026, 11, 27, 18, 0))
  })
})

describe('fromCopy', () => {
  it('takes everything over except the date', () => {
    const e = makeEvent({
      title: 'Feierabend-Kick',
      sport: 'football',
      startAt: local(2026, 11, 11, 18, 30).toISOString(),
      endAt: local(2026, 11, 11, 20, 0).toISOString(),
      maxParticipants: 14,
      level: 'beginner',
      description: 'Locker',
      bring: 'Wasser',
      visibility: 'unlisted',
      location: { placeName: 'Mauerpark', address: 'Gleimstr. 55', city: 'Berlin', countryCode: 'DE', lat: 52.5437, lng: 13.4022 },
    })
    expect(fromCopy(e, local(2026, 11, 20, 10, 0))).toMatchObject({
      title: 'Feierabend-Kick',
      sport: 'football',
      date: '2026-11-25',
      startTime: '18:30',
      endTime: '20:00',
      maxParticipants: '14',
      level: 'beginner',
      description: 'Locker',
      bring: 'Wasser',
      visibility: 'unlisted',
      location: { placeName: 'Mauerpark', address: 'Gleimstr. 55', city: 'Berlin', countryCode: 'DE', lat: 52.5437, lng: 13.4022 },
      weekly: false,
      weekday: 3,
    })
  })
})

const pad = (n: number) => String(n).padStart(2, '0')
const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** A game eight days ago at 19:00 for 90 minutes: the copy lands six days ahead. */
function pastEvent() {
  const start = new Date()
  start.setDate(start.getDate() - 8)
  start.setHours(19, 0, 0, 0)
  const end = new Date(start.getTime() + 90 * 60 * 1000)
  const expected = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 14, 19, 0)
  const event = makeEvent({
    _id: 'e1',
    title: 'Feierabend-Kick',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    maxParticipants: 12,
    level: 'beginner',
    description: 'Locker, alle willkommen',
    bring: 'Wasser',
    visibility: 'unlisted',
    status: 'completed',
    isOrganizer: true,
    location: { placeName: 'Mauerpark', address: 'Gleimstr. 55', city: 'Berlin', countryCode: 'DE', lat: 52.5437, lng: 13.4022 },
  })
  return { event, expected }
}

const renderForm = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/events/neu" element={<EventFormPage />} />
        <Route path="/events/:id/bearbeiten" element={<EventFormPage />} />
        <Route path="/events/:id" element={<p>EVENT PAGE</p>} />
      </Routes>
    </MemoryRouter>
  )

describe('EventFormPage with ?kopie=', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    api.getMyPlaces.mockResolvedValue([])
  })

  it('prefills the form from the copied event and suggests the next free week', async () => {
    const { event, expected } = pastEvent()
    api.getEvent.mockResolvedValue(event)
    const user = userEvent.setup()
    renderForm('/events/neu?kopie=e1')

    expect(await screen.findByText('Kopie von „Feierabend-Kick“ – prüfe Datum und Uhrzeit.')).toBeInTheDocument()
    expect(api.getEvent).toHaveBeenCalledWith('e1')
    expect(screen.getByRole('heading', { name: 'Event erstellen' })).toBeInTheDocument()
    expect(screen.getByLabelText('Titel *')).toHaveValue('Feierabend-Kick')
    expect(screen.getByLabelText('Datum *')).toHaveValue(dateInput(expected))
    expect(screen.getByLabelText('Beginn *')).toHaveValue('19:00')
    expect(screen.getByLabelText('Ende *')).toHaveValue('20:30')
    expect(screen.getByLabelText('Maximale Teilnehmende *')).toHaveValue(12)
    expect(screen.getByLabelText('Niveau')).toHaveValue('beginner')
    expect(screen.getByLabelText('Mitbringen')).toHaveValue('Wasser')
    expect(screen.getByLabelText('Beschreibung')).toHaveValue('Locker, alle willkommen')
    expect(screen.getByLabelText('Nur über den Link')).toBeChecked()
    expect(screen.getByLabelText('Fußball')).toBeChecked()
    expect(screen.getByTestId('picker')).toHaveTextContent('Mauerpark|Gleimstr. 55|Berlin|52.5437|13.4022')
    expect(screen.getByRole('switch')).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Hinweis schließen' }))
    expect(screen.queryByText(/Kopie von/)).not.toBeInTheDocument()
    // Closing the hint keeps the copied values.
    expect(screen.getByLabelText('Titel *')).toHaveValue('Feierabend-Kick')
  })

  it('publishes the copy as a new event at the suggested time', async () => {
    const { event, expected } = pastEvent()
    api.getEvent.mockResolvedValue(event)
    api.createEvent.mockResolvedValue(makeEvent({ _id: 'e2' }))
    const user = userEvent.setup()
    renderForm('/events/neu?kopie=e1')

    await user.click(await screen.findByRole('button', { name: /Veröffentlichen/ }))
    expect(await screen.findByText('EVENT PAGE')).toBeInTheDocument()
    expect(api.createEvent).toHaveBeenCalledTimes(1)
    expect(api.createEvent.mock.calls[0][0]).toMatchObject({
      title: 'Feierabend-Kick',
      sport: 'football',
      startAt: expected.toISOString(),
      endAt: new Date(expected.getTime() + 90 * 60 * 1000).toISOString(),
      maxParticipants: 12,
      level: 'beginner',
      bring: 'Wasser',
      description: 'Locker, alle willkommen',
      visibility: 'unlisted',
      location: { placeName: 'Mauerpark', address: 'Gleimstr. 55', city: 'Berlin', countryCode: 'DE', lat: 52.5437, lng: 13.4022 },
    })
  })

  it('shows the empty form with a notice when the event cannot be loaded', async () => {
    api.getEvent.mockRejectedValue(new Error('weg'))
    renderForm('/events/neu?kopie=e404')

    expect(await screen.findByText(/Die Vorlage konnte nicht geladen werden/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Event erstellen' })).toBeInTheDocument()
    expect(screen.getByLabelText('Titel *')).toHaveValue('')
    expect(screen.getByLabelText('Beginn *')).toHaveValue('18:00')
    expect(screen.queryByText(/Kopie von/)).not.toBeInTheDocument()
  })

  it('does not load a copy without the parameter', async () => {
    renderForm('/events/neu')
    expect(await screen.findByRole('heading', { name: 'Event erstellen' })).toBeInTheDocument()
    expect(api.getEvent).not.toHaveBeenCalled()
    expect(screen.queryByText(/Kopie von/)).not.toBeInTheDocument()
  })
})

describe('EventFormPage: recently used places', () => {
  const places = [
    { placeName: 'Mauerpark', address: 'Gleimstr. 55', city: 'Berlin', countryCode: 'DE', lat: 52.5437, lng: 13.4022 },
    { placeName: 'Volkspark', address: 'Volkspark 1', city: 'Berlin', lat: 52.53, lng: 13.38 },
  ]

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
  })

  it('fills the place with one tap', async () => {
    api.getMyPlaces.mockResolvedValue(places)
    const user = userEvent.setup()
    renderForm('/events/neu')

    expect(await screen.findByText('Zuletzt genutzt:')).toBeInTheDocument()
    const group = screen.getByRole('group', { name: 'Zuletzt genutzt:' })
    expect(group).toBeInTheDocument()
    const chip = screen.getByRole('button', { name: 'Mauerpark' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')

    await user.click(chip)
    expect(screen.getByTestId('picker')).toHaveTextContent('Mauerpark|Gleimstr. 55|Berlin|52.5437|13.4022')
    expect(screen.getByRole('button', { name: 'Mauerpark' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Volkspark' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Volkspark' }))
    expect(screen.getByTestId('picker')).toHaveTextContent('Volkspark|Volkspark 1|Berlin|52.53|13.38')
  })

  it('stays out of the way when there are none or the request fails', async () => {
    api.getMyPlaces.mockRejectedValue(new Error('offline'))
    renderForm('/events/neu')
    expect(await screen.findByRole('heading', { name: 'Event erstellen' })).toBeInTheDocument()
    await waitFor(() => expect(api.getMyPlaces).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Zuletzt genutzt:')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('is not offered when editing', async () => {
    api.getMyPlaces.mockResolvedValue(places)
    api.getEvent.mockResolvedValue(makeEvent({ _id: 'e1', isOrganizer: true }))
    renderForm('/events/e1/bearbeiten?kopie=e9')

    expect(await screen.findByRole('heading', { name: 'Event bearbeiten' })).toBeInTheDocument()
    expect(api.getMyPlaces).not.toHaveBeenCalled()
    expect(screen.queryByText('Zuletzt genutzt:')).not.toBeInTheDocument()
    // The copy parameter means nothing in edit mode.
    expect(api.getEvent).toHaveBeenCalledTimes(1)
    expect(api.getEvent).toHaveBeenCalledWith('e1')
    expect(screen.queryByText(/Kopie von/)).not.toBeInTheDocument()
  })
})
