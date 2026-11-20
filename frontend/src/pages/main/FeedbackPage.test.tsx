import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = { sendFeedback: vi.fn() }
vi.mock('@/api/feedbackApi', async (orig) => ({
  ...(await orig<typeof import('@/api/feedbackApi')>()),
  sendFeedback: (...a: unknown[]) => api.sendFeedback(...a),
}))

import FeedbackPage, { fromPath } from './FeedbackPage'

const renderPage = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/feedback', state }]}>
      <Routes>
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/meine-events" element={<p>MEINE EVENTS</p>} />
        <Route path="/" element={<p>STARTSEITE</p>} />
      </Routes>
    </MemoryRouter>
  )

describe('FeedbackPage', () => {
  beforeEach(() => {
    // Braces matter: a function returned from beforeEach would run as teardown.
    api.sendFeedback.mockReset()
  })

  it('sends the feedback and shows the thank-you state with a way back', async () => {
    api.sendFeedback.mockResolvedValue('Danke für dein Feedback! Wir lesen jede Nachricht.')
    const user = userEvent.setup()
    renderPage({ from: '/meine-events?tab=erstellt#oben' })

    expect(screen.getByRole('heading', { name: 'Feedback geben' })).toBeInTheDocument()
    expect(screen.getByText('Wir speichern deinen Text und, wenn du angemeldet bist, dein Konto dazu.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Idee' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'Problem' }))
    await user.type(screen.getByLabelText('Deine Nachricht'), '  Die Karte lädt bei mir nicht.  ')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    expect(await screen.findByRole('heading', { name: 'Danke!' })).toBeInTheDocument()
    expect(screen.getByText('Danke für dein Feedback! Wir lesen jede Nachricht.')).toBeInTheDocument()
    expect(api.sendFeedback).toHaveBeenCalledTimes(1)
    expect(api.sendFeedback).toHaveBeenCalledWith({ kind: 'problem', text: 'Die Karte lädt bei mir nicht.', page: '/meine-events' })
    expect(screen.queryByLabelText('Deine Nachricht')).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Zurück' }))
    expect(await screen.findByText('MEINE EVENTS')).toBeInTheDocument()
  })

  it('works for a guest who opened the page directly', async () => {
    api.sendFeedback.mockResolvedValue('Danke!')
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Deine Nachricht'), 'Schöne App, weiter so')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    expect(await screen.findByRole('heading', { name: 'Danke!' })).toBeInTheDocument()
    expect(api.sendFeedback).toHaveBeenCalledWith({ kind: 'idea', text: 'Schöne App, weiter so' })
    expect(screen.getByRole('link', { name: 'Zur Startseite' })).toHaveAttribute('href', '/')

    // A second message starts with an empty form.
    await user.click(screen.getByRole('button', { name: 'Noch etwas schreiben' }))
    expect(screen.getByLabelText('Deine Nachricht')).toHaveValue('')
  })

  it('asks for a few more characters before sending anything', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Deine Nachricht'), 'Hm')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Schreib bitte mindestens 5 Zeichen.')
    expect(screen.getByLabelText('Deine Nachricht')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Deine Nachricht')).toHaveFocus()
    expect(api.sendFeedback).not.toHaveBeenCalled()
  })

  it('keeps the text and shows the error when sending fails', async () => {
    api.sendFeedback.mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Deine Nachricht'), 'Das soll nicht verloren gehen')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Dein Feedback konnte nicht gesendet werden.')
    expect(screen.getByLabelText('Deine Nachricht')).toHaveValue('Das soll nicht verloren gehen')
    expect(screen.getByRole('button', { name: 'Senden' })).toBeEnabled()
  })

  it('hides the honeypot from people but passes it on when a bot fills it in', async () => {
    api.sendFeedback.mockResolvedValue('Danke!')
    const user = userEvent.setup()
    const { container } = renderPage()

    const trap = container.querySelector<HTMLInputElement>('input[name="website"]')!
    expect(trap).toHaveAttribute('tabindex', '-1')
    expect(trap).toHaveAttribute('autocomplete', 'off')
    expect(trap).toHaveAttribute('aria-hidden', 'true')
    expect(trap.closest('.sr-only')).not.toBeNull()
    // Not reachable by role: assistive technology does not see it.
    expect(screen.getAllByRole('textbox')).toHaveLength(1)

    await user.type(screen.getByLabelText('Deine Nachricht'), 'Ich bin ein Bot und fülle alles aus')
    // Bots write straight into the field.
    await user.type(trap, 'https://spam.example')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    expect(await screen.findByRole('heading', { name: 'Danke!' })).toBeInTheDocument()
    expect(api.sendFeedback).toHaveBeenCalledWith({ kind: 'idea', text: 'Ich bin ein Bot und fülle alles aus', website: 'https://spam.example' })
  })
})

describe('fromPath', () => {
  it('keeps only an app path', () => {
    expect(fromPath({ from: '/events/abc?token=1#x' })).toBe('/events/abc')
    expect(fromPath({ from: { pathname: '/profil', search: '?a=1' } })).toBe('/profil')
    expect(fromPath({ from: 'https://example.org/x' })).toBe('')
    expect(fromPath({ from: '//example.org/x' })).toBe('')
    expect(fromPath({ from: 42 })).toBe('')
    expect(fromPath(null)).toBe('')
    expect(fromPath(undefined)).toBe('')
  })
})
