import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { FeedbackItem } from '@/api/feedbackApi'

const api = { listFeedback: vi.fn(), updateFeedback: vi.fn(), deleteFeedback: vi.fn() }
vi.mock('@/api/feedbackApi', async (orig) => ({
  ...(await orig<typeof import('@/api/feedbackApi')>()),
  listFeedback: (...a: unknown[]) => api.listFeedback(...a),
  updateFeedback: (...a: unknown[]) => api.updateFeedback(...a),
  deleteFeedback: (...a: unknown[]) => api.deleteFeedback(...a),
}))

import AdminFeedbackPage from './AdminFeedbackPage'

const item = (over: Partial<FeedbackItem> = {}): FeedbackItem => ({
  _id: 'f1',
  kind: 'problem',
  text: 'Die Karte lädt nicht.',
  page: '/entdecken',
  status: 'open',
  createdAt: '2026-11-18T17:00:00.000Z',
  from: 'Max M.',
  ...over,
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/feedback']}>
      <AdminFeedbackPage />
    </MemoryRouter>
  )

describe('AdminFeedbackPage', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
  })

  it('lists open feedback and has its own tab', async () => {
    api.listFeedback.mockResolvedValue([item(), item({ _id: 'f2', kind: 'praise', text: 'Läuft super!', page: '', from: 'Gast' })])
    renderPage()

    expect(await screen.findByText('Die Karte lädt nicht.')).toBeInTheDocument()
    expect(api.listFeedback).toHaveBeenCalledWith('open')
    expect(screen.getByRole('link', { name: 'Feedback' })).toHaveAttribute('href', '/admin/feedback')
    expect(screen.getByRole('button', { name: 'Offen' })).toHaveAttribute('aria-pressed', 'true')
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Problem')).toBeInTheDocument()
    expect(within(rows[0]).getByText(/von Max M\./)).toBeInTheDocument()
    expect(within(rows[0]).getByRole('link', { name: '/entdecken' })).toHaveAttribute('href', '/entdecken')
    expect(within(rows[1]).getByText('Lob')).toBeInTheDocument()
    expect(within(rows[1]).getByText(/von Gast/)).toBeInTheDocument()
    expect(within(rows[1]).queryByText(/Seite:/)).not.toBeInTheDocument()
  })

  it('marks feedback as done and can open it again from the other filter', async () => {
    api.listFeedback.mockImplementation(async (status: string) => (status === 'open' ? [item()] : [item({ _id: 'f9', status: 'done', text: 'Schon erledigt' })]))
    api.updateFeedback.mockImplementation(async (id: string, status: string) => item({ _id: id, status: status as FeedbackItem['status'] }))
    const user = userEvent.setup()
    renderPage()

    // "Erledigt" is both the filter chip and the action: take the one in the entry.
    await user.click(within(await screen.findByRole('listitem')).getByRole('button', { name: 'Erledigt' }))
    expect(api.updateFeedback).toHaveBeenCalledWith('f1', 'done')
    await waitFor(() => expect(screen.queryByText('Die Karte lädt nicht.')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Kein offenes Feedback.' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Erledigt' }))
    expect(await screen.findByText('Schon erledigt')).toBeInTheDocument()
    expect(api.listFeedback).toHaveBeenLastCalledWith('done')
    await user.click(screen.getByRole('button', { name: 'Wieder öffnen' }))
    expect(api.updateFeedback).toHaveBeenLastCalledWith('f9', 'open')
    expect(await screen.findByRole('heading', { name: 'Noch kein erledigtes Feedback.' })).toBeInTheDocument()
  })

  it('deletes only after the confirmation', async () => {
    api.listFeedback.mockResolvedValue([item()])
    api.deleteFeedback.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Löschen' }))
    const dialog = await screen.findByRole('dialog', { name: 'Feedback löschen?' })
    expect(api.deleteFeedback).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))
    expect(api.deleteFeedback).not.toHaveBeenCalled()
    expect(screen.getByText('Die Karte lädt nicht.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Löschen' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Feedback löschen?' })).getByRole('button', { name: 'Endgültig löschen' }))
    expect(api.deleteFeedback).toHaveBeenCalledWith('f1')
    await waitFor(() => expect(screen.queryByText('Die Karte lädt nicht.')).not.toBeInTheDocument())
  })

  it('shows an error with a retry when the list cannot be loaded', async () => {
    api.listFeedback.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([])
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Das Feedback konnte nicht geladen werden.')
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(await screen.findByRole('heading', { name: 'Kein offenes Feedback.' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the entry and says so when an action fails', async () => {
    api.listFeedback.mockResolvedValue([item()])
    api.updateFeedback.mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    renderPage()

    await user.click(within(await screen.findByRole('listitem')).getByRole('button', { name: 'Erledigt' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Die Karte lädt nicht.')).toBeInTheDocument()
  })
})
