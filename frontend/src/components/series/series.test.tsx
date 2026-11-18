import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { makeEvent } from '@/test/fixtures'
import type { SportEvent } from '@/api/eventApi'

const api = { answerEvent: vi.fn() }
vi.mock('@/api/eventApi', async (orig) => ({
  ...(await orig<typeof import('@/api/eventApi')>()),
  answerEvent: (...a: unknown[]) => api.answerEvent(...a),
}))
const loop = { getUnreadCount: vi.fn() }
vi.mock('@/api/loopApi', async (orig) => ({
  ...(await orig<typeof import('@/api/loopApi')>()),
  getUnreadCount: (...a: unknown[]) => loop.getUnreadCount(...a),
}))

import AnswerCard, { decisionLabel } from './AnswerCard'
import NotificationBell, { useUnreadCount } from '@/components/layout/NotificationBell'
import { whatsappStatus } from '@/pages/groups/GroupPage'
import type { Group } from '@/api/groupApi'

const game = (over: Partial<SportEvent> = {}) =>
  makeEvent({
    title: 'Basketball am Uni-Platz',
    maxParticipants: 12,
    participantCount: 5,
    minPlayers: 6,
    deadlineAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
    decision: 'open',
    counts: { in: 5, out: 1, waiting: 0, noAnswer: 4 },
    series: { _id: 'g1', name: 'Basketball am Uni-Platz', weekday: 4, startTime: '19:00', memberCount: 10, isMember: true },
    participants: [{ _id: 'u2', displayName: 'Paul S.' }],
    roster: { out: [], waiting: [], noAnswer: [{ _id: 'u1', displayName: 'Ulla U.' }] },
    myAnswer: null,
    ...over,
  })

describe('AnswerCard', () => {
  beforeEach(() => api.answerEvent.mockReset())

  it('shows the state of the game in words', () => {
    expect(decisionLabel(game())).toBe('Offen')
    expect(decisionLabel(game({ decision: 'on' }))).toBe('Findet statt')
    expect(decisionLabel(game({ decision: 'off', status: 'cancelled' }))).toBe('Fällt aus')
  })

  it('answers with one tap and moves you into "Dabei"', async () => {
    const onChange = vi.fn()
    const after = game({
      myAnswer: 'in',
      participantCount: 6,
      counts: { in: 6, out: 1, waiting: 0, noAnswer: 3 },
      participants: [
        { _id: 'u2', displayName: 'Paul S.' },
        { _id: 'u1', displayName: 'Ulla U.' },
      ],
      roster: { out: [], waiting: [], noAnswer: [] },
    })
    api.answerEvent.mockResolvedValue(after)
    const { rerender } = render(<AnswerCard event={game()} viewerId="u1" onChange={onChange} />)
    expect(screen.getByRole('meter', { name: 'Zusagen' })).toHaveAttribute('aria-valuetext', '5 von 12 dabei, ab 6 findet es statt')
    expect(screen.getByText(/ab 6 findet's statt/)).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: /Ich bin dabei/ }))
    expect(api.answerEvent).toHaveBeenCalledWith('e1', 'in')
    expect(onChange).toHaveBeenCalledWith(after)

    rerender(<AnswerCard event={after} viewerId="u1" onChange={onChange} />)
    expect(screen.getByRole('button', { name: /Ich bin dabei/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Minimum erreicht/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Dabei: 2' })).toHaveTextContent('Du')
    expect(screen.getByText(/Wir sagen dir .* Bescheid, ob's stattfindet/)).toBeInTheDocument()
  })

  it('tells you your place on the waiting list', () => {
    render(<AnswerCard event={game({ myAnswer: 'waiting', waitlistPosition: 2 })} viewerId="u1" onChange={() => {}} />)
    expect(screen.getByText(/Warteliste \(Platz 2\)/)).toBeInTheDocument()
  })

  it('asks guests to sign in instead of answering', async () => {
    const onNeedLogin = vi.fn()
    render(<AnswerCard event={game()} onChange={() => {}} onNeedLogin={onNeedLogin} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Diesmal nicht/ }))
    expect(onNeedLogin).toHaveBeenCalled()
    expect(api.answerEvent).not.toHaveBeenCalled()
  })

  it('shows no answer buttons for a called-off game', () => {
    render(<AnswerCard event={game({ decision: 'off', status: 'cancelled', cancelledReason: 'Zu wenige Zusagen' })} viewerId="u1" onChange={() => {}} />)
    expect(screen.getByText('Fällt aus')).toBeInTheDocument()
    expect(screen.getByText(/Zu wenige Zusagen/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ich bin dabei/ })).toBeNull()
  })
})

describe('WhatsApp status line', () => {
  it('says date, count, status and link in one paste', () => {
    const g = { name: 'Basketball am Uni-Platz', weekday: 4, startTime: '19:00', inviteCode: 'uniplatz' } as Group
    const text = whatsappStatus(g, game({ decision: 'on', counts: { in: 9, out: 0, waiting: 0, noAnswer: 0 } }))
    expect(text).toMatch(/^Basketball am Uni-Platz .* · 9\/12 dabei · findet statt ✅/)
    expect(text).toContain('/s/uniplatz')
    expect(whatsappStatus(g, game())).toContain("ab 6 findet's statt – bist du dabei?")
  })
})

describe('Notification bell', () => {
  function Bell({ enabled }: { enabled: boolean }) {
    const unread = useUnreadCount(enabled)
    return <NotificationBell unread={unread} />
  }

  it('shows the unread count and clears it when notices are read', async () => {
    loop.getUnreadCount.mockResolvedValue(3)
    render(
      <MemoryRouter>
        <Bell enabled />
      </MemoryRouter>
    )
    expect(await screen.findByRole('link', { name: 'Benachrichtigungen, 3 ungelesen' })).toBeInTheDocument()
    act(() => {
      window.dispatchEvent(new CustomEvent('hobbook:notifications-read', { detail: 0 }))
    })
    expect(await screen.findByRole('link', { name: 'Benachrichtigungen' })).toBeInTheDocument()
  })

  it('does not ask the server for guests', () => {
    loop.getUnreadCount.mockReset()
    render(
      <MemoryRouter>
        <Bell enabled={false} />
      </MemoryRouter>
    )
    expect(loop.getUnreadCount).not.toHaveBeenCalled()
  })
})
