import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { makeEvent } from '@/test/fixtures'

vi.mock('@/components/map/EventMap', () => ({ default: () => <div data-testid="fake-map" /> }))

const api = { getEvent: vi.fn(), joinEvent: vi.fn(), leaveEvent: vi.fn() }
vi.mock('@/api/eventApi', async (orig) => ({
  ...(await orig<typeof import('@/api/eventApi')>()),
  getEvent: (...a: unknown[]) => api.getEvent(...a),
  joinEvent: (...a: unknown[]) => api.joinEvent(...a),
  leaveEvent: (...a: unknown[]) => api.leaveEvent(...a),
}))

let loggedIn = false
vi.mock('@/store/AuthContext', () => ({
  useAuthContext: () => ({
    authState: { isLoggedIn: loggedIn, isLoading: false, user: loggedIn ? { _id: 'u1', role: 'user', name: 'U' } : null },
  }),
}))

import EventDetailPage from './EventDetailPage'

const renderPage = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/events/e1', state }]}>
      <Routes>
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/login" element={<p>LOGIN PAGE</p>} />
      </Routes>
    </MemoryRouter>
  )

describe('EventDetailPage join/leave', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    loggedIn = false
  })

  it('asks visitors to sign in only when joining', async () => {
    api.getEvent.mockResolvedValue(makeEvent())
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Kick im Park' })).toBeInTheDocument()
    expect(screen.getByText('Volkspark')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Anmelden & mitmachen' }))
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument()
  })

  it('finishes the join by itself after the visitor signed in for it', async () => {
    loggedIn = true
    api.getEvent.mockResolvedValue(makeEvent())
    api.joinEvent.mockResolvedValue(makeEvent({ joined: true, participantCount: 4, spotsLeft: 6 }))
    renderPage({ resume: 'join' })
    expect(await screen.findByText('Du bist dabei!')).toBeInTheDocument()
    expect(api.joinEvent).toHaveBeenCalledTimes(1)
  })

  it('updates only after the server confirmed the join', async () => {
    loggedIn = true
    api.getEvent.mockResolvedValue(makeEvent())
    api.joinEvent.mockResolvedValue(makeEvent({ joined: true, participantCount: 4, spotsLeft: 6 }))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Mitmachen' }))
    expect(await screen.findByText('Du bist dabei!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /austreten/ })).toBeInTheDocument()
    expect(screen.getByText(/4 von 10/)).toBeInTheDocument()
  })

  it('shows the server error truthfully and refreshes state when the event filled up', async () => {
    loggedIn = true
    api.getEvent.mockResolvedValueOnce(makeEvent()).mockResolvedValue(makeEvent({ status: 'full', spotsLeft: 0, participantCount: 10 }))
    const err = Object.assign(new Error('409'), { isAxiosError: true, response: { status: 409, data: { message: 'Dieses Event ist leider voll' } } })
    api.joinEvent.mockRejectedValue(err)
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Mitmachen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Dieses Event ist leider voll')
    expect(await screen.findByRole('button', { name: 'Event ist voll' })).toBeDisabled()
  })

  it('shows cancelled state with reason and no join button', async () => {
    api.getEvent.mockResolvedValue(makeEvent({ status: 'cancelled', cancelledReason: 'Platz gesperrt' }))
    renderPage()
    expect(await screen.findByText('Dieses Event wurde abgesagt.')).toBeInTheDocument()
    expect(screen.getByText('Grund: Platz gesperrt')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mitmachen/i })).not.toBeInTheDocument()
  })

  it('warns participants about material changes', async () => {
    loggedIn = true
    api.getEvent.mockResolvedValue(makeEvent({ joined: true, changedAt: new Date().toISOString() }))
    renderPage()
    expect(await screen.findByText(/Termin oder Ort wurde geändert/)).toBeInTheDocument()
  })

  it('renders 404 state', async () => {
    api.getEvent.mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { status: 404, data: { message: 'Event nicht gefunden' } } }))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Event nicht gefunden' })).toBeInTheDocument()
  })
})
