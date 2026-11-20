import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const alertApi = { listAlerts: vi.fn(), createAlert: vi.fn(), deleteAlert: vi.fn() }
vi.mock('@/api/alertApi', async (orig) => ({
  ...(await orig<typeof import('@/api/alertApi')>()),
  listAlerts: (...args: unknown[]) => alertApi.listAlerts(...args),
  createAlert: (...args: unknown[]) => alertApi.createAlert(...args),
  deleteAlert: (...args: unknown[]) => alertApi.deleteAlert(...args),
}))

import AlertsSection from './AlertsSection'

const kl = { _id: 'a1', city: 'Kaiserslautern', sport: 'basketball' }
const ma = { _id: 'a2', city: 'Mannheim', sport: null }

describe('AlertsSection', () => {
  beforeEach(() => {
    alertApi.listAlerts.mockReset()
    alertApi.createAlert.mockReset()
    alertApi.deleteAlert.mockReset()
  })

  it('lists the alerts and removes one', async () => {
    alertApi.listAlerts.mockResolvedValue([kl, ma])
    alertApi.deleteAlert.mockResolvedValue([ma])
    const user = userEvent.setup()
    render(<AlertsSection />)

    expect(screen.getByRole('heading', { level: 2, name: 'Such-Alarme' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('werden geladen')
    const list = await screen.findByRole('list', { name: 'Deine Such-Alarme' })
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Basketball in Kaiserslautern'),
      expect.stringContaining('Alle Sportarten in Mannheim'),
    ])

    await user.click(screen.getByRole('button', { name: 'Alarm entfernen: Basketball in Kaiserslautern' }))
    expect(alertApi.deleteAlert).toHaveBeenCalledWith('a1')
    expect(await screen.findAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByText('Basketball in Kaiserslautern')).not.toBeInTheDocument()
  })

  it('shows a hint when there is none and adds one through the form', async () => {
    alertApi.listAlerts.mockResolvedValue([])
    alertApi.createAlert.mockResolvedValue({ alert: kl, alerts: [kl] })
    const user = userEvent.setup()
    render(<AlertsSection />)
    expect(await screen.findByText(/Du hast noch keinen Such-Alarm/)).toBeInTheDocument()

    // An empty city is explained, not sent.
    await user.click(screen.getByRole('button', { name: 'Hinzufügen' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Bitte gib eine Stadt ein.')
    expect(alertApi.createAlert).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Stadt'), ' Kaiserslautern ')
    await user.selectOptions(screen.getByLabelText('Sportart'), 'basketball')
    await user.click(screen.getByRole('button', { name: 'Hinzufügen' }))
    expect(alertApi.createAlert).toHaveBeenCalledWith('Kaiserslautern', 'basketball')
    expect(await screen.findByText('Basketball in Kaiserslautern')).toBeInTheDocument()
    expect(screen.getByLabelText('Stadt')).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // The same alert again is caught before asking the server.
    await user.type(screen.getByLabelText('Stadt'), 'kaiserslautern')
    await user.selectOptions(screen.getByLabelText('Sportart'), 'basketball')
    await user.click(screen.getByRole('button', { name: 'Hinzufügen' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Diesen Such-Alarm hast du schon.')
    expect(alertApi.createAlert).toHaveBeenCalledTimes(1)
  })

  it('explains the limit of 5 instead of offering the form', async () => {
    alertApi.listAlerts.mockResolvedValue(['Aachen', 'Bonn', 'Celle', 'Dortmund', 'Essen'].map((city, i) => ({ _id: `x${i}`, city, sport: null })))
    render(<AlertsSection />)
    expect(await screen.findByText(/Du hast 5 von 5 Such-Alarmen/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Stadt')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hinzufügen' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Alarm entfernen/ })).toHaveLength(5)
  })

  it('shows the server message when adding fails', async () => {
    alertApi.listAlerts.mockResolvedValue([])
    alertApi.createAlert.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'Du kannst höchstens 5 Such-Alarme haben.' } } })
    const user = userEvent.setup()
    render(<AlertsSection />)
    await user.type(await screen.findByLabelText('Stadt'), 'Köln')
    await user.click(screen.getByRole('button', { name: 'Hinzufügen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/höchstens 5 Such-Alarme|nicht geklappt/)
  })

  it('shows a load error with retry', async () => {
    alertApi.listAlerts.mockRejectedValueOnce(new Error('down')).mockResolvedValue([ma])
    const user = userEvent.setup()
    render(<AlertsSection />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Erneut versuchen/ }))
    expect(await screen.findByText('Alle Sportarten in Mannheim')).toBeInTheDocument()
  })
})
