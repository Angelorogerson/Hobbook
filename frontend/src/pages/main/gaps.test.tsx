import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { makeEvent } from '@/test/fixtures'

const loop = { previewLink: vi.fn(), answerFromLink: vi.fn(), muteFromLink: vi.fn() }
vi.mock('@/api/loopApi', async (orig) => ({
  ...(await orig<typeof import('@/api/loopApi')>()),
  previewLink: (...a: unknown[]) => loop.previewLink(...a),
  answerFromLink: (...a: unknown[]) => loop.answerFromLink(...a),
  muteFromLink: (...a: unknown[]) => loop.muteFromLink(...a),
}))
const ev = { confirmSpot: vi.fn(), answerEvent: vi.fn(), leaveEvent: vi.fn() }
vi.mock('@/api/eventApi', async (orig) => ({
  ...(await orig<typeof import('@/api/eventApi')>()),
  confirmSpot: (...a: unknown[]) => ev.confirmSpot(...a),
  answerEvent: (...a: unknown[]) => ev.answerEvent(...a),
  leaveEvent: (...a: unknown[]) => ev.leaveEvent(...a),
}))
const groupApi = { getGroup: vi.fn() }
vi.mock('@/api/groupApi', async (orig) => ({
  ...(await orig<typeof import('@/api/groupApi')>()),
  getGroup: (...a: unknown[]) => groupApi.getGroup(...a),
}))
const updateUser = vi.fn()
vi.mock('@/store/AuthContext', () => ({
  useAuthContext: () => ({
    authState: { isLoggedIn: true, isLoading: false, user: { _id: 'u1', role: 'user', name: 'Paula Neu', city: '', sports: [] } },
    updateUser,
  }),
}))

import { AnswerLinkPage, MuteLinkPage } from './LinkActionPages'
import PendingSpot from '@/components/series/PendingSpot'
import WelcomePage, { groupKeyFrom } from '@/pages/auth/WelcomePage'

const game = makeEvent({
  title: 'Basketball am Uni-Platz',
  series: { _id: 'g1', name: 'Basketball am Uni-Platz', memberCount: 3, isMember: true },
  counts: { in: 3, out: 0, waiting: 0, noAnswer: 1 },
  minPlayers: 4,
  myAnswer: null,
})

beforeEach(() => {
  ;[...Object.values(loop), ...Object.values(ev), ...Object.values(groupApi), updateUser].forEach((f) => f.mockReset())
  localStorage.clear()
})

describe('email answer link', () => {
  const open = () =>
    render(
      <MemoryRouter initialEntries={['/antwort/tok-123']}>
        <Routes>
          <Route path="/antwort/:token" element={<AnswerLinkPage />} />
        </Routes>
      </MemoryRouter>
    )

  it('opening the link changes nothing; one tap answers', async () => {
    loop.previewLink.mockResolvedValue({ event: game, suggested: 'in', name: 'Paul' })
    loop.answerFromLink.mockResolvedValue({ event: { ...game, myAnswer: 'in', counts: { ...game.counts!, in: 4 } }, answer: 'in' })
    open()
    expect(await screen.findByRole('heading', { name: 'Paul, bist du dabei?' })).toBeInTheDocument()
    expect(loop.answerFromLink).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('button', { name: /Ich bin dabei/ }))
    expect(loop.answerFromLink).toHaveBeenCalledWith('tok-123', 'in')
    expect(await screen.findByRole('heading', { name: 'Du bist dabei!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rückgängig – doch nicht' })).toBeInTheDocument()
  })

  it('the mute link asks first', async () => {
    loop.muteFromLink.mockResolvedValueOnce({ group: { _id: 'g1', name: 'Kick' }, muted: false }).mockResolvedValueOnce({ group: { _id: 'g1', name: 'Kick' }, muted: true })
    render(
      <MemoryRouter initialEntries={['/stumm/tok-9']}>
        <Routes>
          <Route path="/stumm/:token" element={<MuteLinkPage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(await screen.findByRole('heading', { name: '„Kick“ stummschalten?' })).toBeInTheDocument()
    expect(loop.muteFromLink).toHaveBeenCalledWith('tok-9', undefined)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Stummschalten' }))
    expect(loop.muteFromLink).toHaveBeenLastCalledWith('tok-9', true)
    expect(await screen.findByRole('heading', { name: 'Stummgeschaltet' })).toBeInTheDocument()
  })
})

describe('pending spot', () => {
  it('asks to confirm a spot shortly before kick-off', async () => {
    const pending = makeEvent({ joined: true, myPendingPromotion: { confirmBy: new Date(Date.now() + 25 * 60 * 1000).toISOString() } })
    const onChange = vi.fn()
    ev.confirmSpot.mockResolvedValue({ ...pending, myPendingPromotion: null })
    render(<PendingSpot event={pending} onChange={onChange} />)
    expect(screen.getByText(/Du bist nachgerückt/)).toBeInTheDocument()
    expect(screen.getByText(/in 25 Min\./)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /Ich komme/ }))
    expect(ev.confirmSpot).toHaveBeenCalledWith('e1')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ myPendingPromotion: null }))
  })
})

describe('welcome after sign-up', () => {
  it('suggests the Stammspiel city and sport, saves, and continues where the visitor was going', async () => {
    groupApi.getGroup.mockResolvedValue({ location: { city: 'Kaiserslautern' }, sport: 'basketball' })
    updateUser.mockResolvedValue(undefined)
    render(
      <MemoryRouter initialEntries={[{ pathname: '/willkommen', state: { from: '/s/uniplatz', intent: 'group' } }]}>
        <Routes>
          <Route path="/willkommen" element={<WelcomePage />} />
          <Route path="/s/:key" element={<p>STAMMSPIEL</p>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: 'Willkommen, Paula!' })).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Kaiserslautern')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Basketball/ })).toBeChecked()
    await userEvent.setup().click(screen.getByRole('button', { name: /Weiter/ }))
    expect(updateUser).toHaveBeenCalledWith({ city: 'Kaiserslautern', sports: ['basketball'] })
    expect(await screen.findByText('STAMMSPIEL')).toBeInTheDocument()
  })

  it('can be skipped', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/willkommen', state: { from: '/meine-events' } }]}>
        <Routes>
          <Route path="/willkommen" element={<WelcomePage />} />
          <Route path="/meine-events" element={<p>MEINE</p>} />
        </Routes>
      </MemoryRouter>
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Überspringen' }))
    expect(await screen.findByText('MEINE')).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('recognises Stammspiel paths', () => {
    expect(groupKeyFrom('/s/uniplatz')).toBe('uniplatz')
    expect(groupKeyFrom('/stammspiel/0123456789abcdef01234567')).toBe('0123456789abcdef01234567')
    expect(groupKeyFrom('/events/abc')).toBeNull()
  })
})
