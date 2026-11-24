import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { EventComment } from '@/api/commentApi'

const api = { listComments: vi.fn(), postComment: vi.fn(), deleteComment: vi.fn() }
vi.mock('@/api/commentApi', async (orig) => ({
  ...(await orig<typeof import('@/api/commentApi')>()),
  listComments: (...a: unknown[]) => api.listComments(...a),
  postComment: (...a: unknown[]) => api.postComment(...a),
  deleteComment: (...a: unknown[]) => api.deleteComment(...a),
}))

let loggedIn = false
vi.mock('@/store/AuthContext', () => ({
  useAuthContext: () => ({
    authState: { isLoggedIn: loggedIn, isLoading: false, user: loggedIn ? { _id: 'u1', role: 'user', name: 'U' } : null },
  }),
}))

import EventComments from './EventComments'

const comment = (over: Partial<EventComment> = {}): EventComment => ({
  _id: 'c1',
  kind: 'comment',
  text: 'Kann man dort parken?',
  createdAt: '2026-11-20T10:00:00.000Z',
  author: { _id: 'u2', displayName: 'Anna F.', isHost: false },
  canDelete: false,
  ...over,
})

const renderComments = (props: { isHost?: boolean; closed?: boolean } = {}) =>
  render(
    <MemoryRouter initialEntries={['/events/e1']}>
      <EventComments eventId="e1" {...props} />
    </MemoryRouter>
  )

const apiFailure = (status: number, message: string) =>
  Object.assign(new Error(String(status)), { isAxiosError: true, response: { status, data: { message } } })

describe('EventComments', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    loggedIn = false
  })

  it('renders questions and announcements as plain text', async () => {
    api.listComments.mockResolvedValue([
      comment({ text: 'Erste Zeile\n<b>kein HTML</b>' }),
      comment({ _id: 'c2', kind: 'announcement', text: 'Heute hinterer Platz', author: { _id: 'o1', displayName: 'Olga O.', isHost: true } }),
    ])
    renderComments()
    expect(screen.getByRole('heading', { name: 'Fragen & Infos' })).toBeInTheDocument()
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(api.listComments).toHaveBeenCalledWith('e1')
    expect(within(items[0]).getByText('Anna F.')).toBeInTheDocument()
    // Markup arrives as text, never as elements.
    expect(within(items[0]).getByText(/<b>kein HTML<\/b>/)).toBeInTheDocument()
    expect(items[0].querySelector('b')).toBeNull()
    expect(within(items[0]).queryByText('Info vom Organisator')).not.toBeInTheDocument()
    expect(within(items[1]).getByText('Info vom Organisator')).toBeInTheDocument()
    expect(within(items[1]).getByText('Heute hinterer Platz')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /löschen/i })).not.toBeInTheDocument()
  })

  it('shows the empty state and sends guests to sign in and back', async () => {
    api.listComments.mockResolvedValue([])
    renderComments()
    expect(await screen.findByText('Noch keine Fragen. Stell die erste.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Melde dich an' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Senden' })).not.toBeInTheDocument()
  })

  it('adds a question only after the server confirmed it', async () => {
    loggedIn = true
    api.listComments.mockResolvedValue([])
    let confirm: (c: EventComment) => void = () => {}
    api.postComment.mockReturnValue(new Promise<EventComment>((resolve) => (confirm = resolve)))
    const user = userEvent.setup()
    renderComments()
    await screen.findByText('Noch keine Fragen. Stell die erste.')

    const field = screen.getByLabelText('Deine Frage oder Nachricht')
    const send = screen.getByRole('button', { name: 'Senden' })
    expect(send).toBeDisabled()
    expect(screen.getByText(/noch 500 Zeichen/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    await user.type(field, 'Gibt es Duschen?')
    expect(screen.getByText(/noch 484 Zeichen/)).toBeInTheDocument()
    await user.click(send)
    expect(api.postComment).toHaveBeenCalledWith('e1', 'Gibt es Duschen?', 'comment')
    // Still waiting for the server: nothing in the list yet.
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()

    confirm(comment({ _id: 'c9', text: 'Gibt es Duschen?', author: { _id: 'u1', displayName: 'Uwe U.', isHost: false }, canDelete: true }))
    const item = await screen.findByRole('listitem')
    expect(within(item).getByText('Gibt es Duschen?')).toBeInTheDocument()
    expect(field).toHaveValue('')
    expect(screen.queryByText('Noch keine Fragen. Stell die erste.')).not.toBeInTheDocument()
  })

  it('keeps the text and shows the server message when sending fails', async () => {
    loggedIn = true
    api.listComments.mockResolvedValue([])
    api.postComment.mockRejectedValue(apiFailure(429, 'Du hast hier schon sehr viel geschrieben.'))
    const user = userEvent.setup()
    renderComments()
    const field = await screen.findByLabelText('Deine Frage oder Nachricht')
    await user.type(field, 'Hallo')
    await user.click(screen.getByRole('button', { name: 'Senden' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Du hast hier schon sehr viel geschrieben.')
    expect(field).toHaveValue('Hallo')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('offers "An alle Teilnehmenden senden" only to hosts and sends an announcement', async () => {
    loggedIn = true
    api.listComments.mockResolvedValue([])
    api.postComment.mockResolvedValue(
      comment({ _id: 'c3', kind: 'announcement', text: 'Wir fangen 10 Minuten später an', author: { _id: 'u1', displayName: 'Uwe U.', isHost: true }, canDelete: true })
    )
    const user = userEvent.setup()
    renderComments({ isHost: true })
    const field = await screen.findByLabelText('Deine Nachricht')
    const toAll = screen.getByRole('checkbox', { name: 'An alle Teilnehmenden senden' })
    expect(toAll).not.toBeChecked()
    await user.type(field, 'Wir fangen 10 Minuten später an')
    await user.click(toAll)
    await user.click(screen.getByRole('button', { name: 'Senden' }))
    expect(api.postComment).toHaveBeenCalledWith('e1', 'Wir fangen 10 Minuten später an', 'announcement')
    expect(await screen.findByText('Info vom Organisator')).toBeInTheDocument()
    expect(toAll).not.toBeChecked()
  })

  it('deletes a message after confirming', async () => {
    loggedIn = true
    api.listComments.mockResolvedValue([comment({ canDelete: true }), comment({ _id: 'c2', text: 'Bleibt stehen' })])
    api.deleteComment.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderComments()
    await user.click(await screen.findByRole('button', { name: 'Nachricht von Anna F. löschen' }))
    const dialog = screen.getByRole('dialog', { name: 'Nachricht löschen?' })
    expect(api.deleteComment).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Löschen' }))
    expect(api.deleteComment).toHaveBeenCalledWith('e1', 'c1')
    expect(await screen.findByText('Bleibt stehen')).toBeInTheDocument()
    // The message folds away, then leaves the list
    await waitFor(() => expect(screen.queryByText('Kann man dort parken?')).not.toBeInTheDocument())
  })

  it('shows a load error with a retry', async () => {
    api.listComments.mockRejectedValueOnce(apiFailure(500, 'Interner Serverfehler')).mockResolvedValue([comment()])
    const user = userEvent.setup()
    renderComments()
    expect(await screen.findByText('Interner Serverfehler')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(await screen.findByText('Kann man dort parken?')).toBeInTheDocument()
  })

  it('offers no form once the event is long over', async () => {
    loggedIn = true
    api.listComments.mockResolvedValue([comment()])
    renderComments({ closed: true })
    expect(await screen.findByText('Kann man dort parken?')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText(/schon länger vorbei/)).toBeInTheDocument()
  })
})
