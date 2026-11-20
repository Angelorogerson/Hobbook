import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import api from '@/api/axiosInstance'
import { ToastProvider } from '@/components/ui/Toast'

const account = { getCalendarToken: vi.fn(), resetCalendarToken: vi.fn() }
vi.mock('@/api/accountApi', async (orig) => ({
  ...(await orig<typeof import('@/api/accountApi')>()),
  getCalendarToken: (...a: unknown[]) => account.getCalendarToken(...a),
  resetCalendarToken: (...a: unknown[]) => account.resetCalendarToken(...a),
}))

import CalendarFeedSection from './CalendarFeedSection'
import { calendarFeedUrl, webcalUrl } from '@/api/accountApi'

const TOKEN = '665f1c2ab3d4e5f601234567-AbCdEfGhIjKlMnOpQrStUvWxYz012345'
const NEW_TOKEN = '665f1c2ab3d4e5f601234567-zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
const FEED = `https://api.hobbook.test/api/calendar/feed/${TOKEN}.ics`

const open = () =>
  render(
    <ToastProvider>
      <CalendarFeedSection />
    </ToastProvider>
  )

beforeEach(() => {
  Object.values(account).forEach((f) => f.mockReset())
  api.defaults.baseURL = 'https://api.hobbook.test/api'
})

describe('feed address helpers', () => {
  it('builds the address from the API base and swaps the scheme for webcal', () => {
    expect(calendarFeedUrl(TOKEN)).toBe(FEED)
    api.defaults.baseURL = 'http://localhost:5000/api/'
    expect(calendarFeedUrl(TOKEN)).toBe(`http://localhost:5000/api/calendar/feed/${TOKEN}.ics`)
    api.defaults.baseURL = '/api'
    expect(calendarFeedUrl(TOKEN)).toBe(`${window.location.origin}/api/calendar/feed/${TOKEN}.ics`)
    expect(webcalUrl(FEED)).toBe(`webcal://api.hobbook.test/api/calendar/feed/${TOKEN}.ics`)
    expect(webcalUrl('http://localhost:5000/x.ics')).toBe('webcal://localhost:5000/x.ics')
  })
})

describe('CalendarFeedSection', () => {
  it('does not fetch or show the link until asked', () => {
    open()
    expect(screen.getByRole('heading', { level: 2, name: 'Kalender-Abo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kalender-Link anzeigen' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Dein Kalender-Link')).not.toBeInTheDocument()
    expect(account.getCalendarToken).not.toHaveBeenCalled()
  })

  it('reveals the address and offers copy and webcal links', async () => {
    const user = userEvent.setup()
    account.getCalendarToken.mockResolvedValue(TOKEN)
    open()

    await user.click(screen.getByRole('button', { name: 'Kalender-Link anzeigen' }))

    const input = (await screen.findByLabelText('Dein Kalender-Link')) as HTMLInputElement
    expect(input.value).toBe(FEED)
    expect(input).toHaveAttribute('readonly')
    expect(screen.getByText('Wer diesen Link kennt, sieht deine Termine. Teile ihn nicht.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kalender-Link anzeigen' })).not.toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'In Kalender-App öffnen' })).toHaveAttribute(
      'href',
      `webcal://api.hobbook.test/api/calendar/feed/${TOKEN}.ics`
    )

    await user.click(screen.getByRole('button', { name: 'Link kopieren' }))
    expect(await navigator.clipboard.readText()).toBe(FEED)
    expect(await screen.findByText('Link kopiert')).toBeInTheDocument()
  })

  it('says so when copying is not possible', async () => {
    const user = userEvent.setup()
    account.getCalendarToken.mockResolvedValue(TOKEN)
    open()
    await user.click(screen.getByRole('button', { name: 'Kalender-Link anzeigen' }))
    await screen.findByLabelText('Dein Kalender-Link')
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'))
    await user.click(screen.getByRole('button', { name: 'Link kopieren' }))
    expect(await screen.findByText(/Kopieren hat nicht geklappt/)).toBeInTheDocument()
  })

  it('shows a loading state, then an error with a way to try again', async () => {
    const user = userEvent.setup()
    let fail: (e: unknown) => void = () => {}
    account.getCalendarToken.mockReturnValueOnce(new Promise((_, reject) => (fail = reject)))
    open()

    await user.click(screen.getByRole('button', { name: 'Kalender-Link anzeigen' }))
    expect(screen.getByRole('button', { name: 'Lädt …' })).toBeDisabled()

    fail(new Error('boom'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Der Kalender-Link konnte nicht geladen werden')
    expect(screen.queryByLabelText('Dein Kalender-Link')).not.toBeInTheDocument()

    account.getCalendarToken.mockResolvedValue(TOKEN)
    await user.click(screen.getByRole('button', { name: 'Kalender-Link anzeigen' }))
    expect(await screen.findByLabelText('Dein Kalender-Link')).toHaveValue(FEED)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renews the link only after confirming', async () => {
    const user = userEvent.setup()
    account.getCalendarToken.mockResolvedValue(TOKEN)
    account.resetCalendarToken.mockResolvedValue(NEW_TOKEN)
    open()
    await user.click(screen.getByRole('button', { name: 'Kalender-Link anzeigen' }))
    await screen.findByLabelText('Dein Kalender-Link')

    await user.click(screen.getByRole('button', { name: 'Link erneuern' }))
    const dialog = screen.getByRole('dialog', { name: 'Kalender-Link erneuern?' })
    expect(dialog).toHaveTextContent('Der alte Link funktioniert dann nicht mehr')
    expect(account.resetCalendarToken).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(account.resetCalendarToken).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Dein Kalender-Link')).toHaveValue(FEED)

    await user.click(screen.getByRole('button', { name: 'Link erneuern' }))
    const confirm = screen.getAllByRole('button', { name: 'Link erneuern' }).find((b) => b.closest('[role="dialog"]'))!
    await user.click(confirm)

    await waitFor(() => expect(screen.getByLabelText('Dein Kalender-Link')).toHaveValue(`https://api.hobbook.test/api/calendar/feed/${NEW_TOKEN}.ics`))
    expect(account.resetCalendarToken).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'In Kalender-App öffnen' })).toHaveAttribute(
      'href',
      `webcal://api.hobbook.test/api/calendar/feed/${NEW_TOKEN}.ics`
    )
  })

  it('keeps the old link and reports it when renewing fails', async () => {
    const user = userEvent.setup()
    account.getCalendarToken.mockResolvedValue(TOKEN)
    account.resetCalendarToken.mockRejectedValue(new Error('boom'))
    open()
    await user.click(screen.getByRole('button', { name: 'Kalender-Link anzeigen' }))
    await screen.findByLabelText('Dein Kalender-Link')
    await user.click(screen.getByRole('button', { name: 'Link erneuern' }))
    await user.click(screen.getAllByRole('button', { name: 'Link erneuern' }).find((b) => b.closest('[role="dialog"]'))!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Der Link konnte nicht erneuert werden')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Dein Kalender-Link')).toHaveValue(FEED)
  })
})
