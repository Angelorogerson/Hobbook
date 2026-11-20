import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse } from 'axios'
import api from '@/api/axiosInstance'
import DataExportSection from './DataExportSection'

let clicked: { href: string; download: string }[] = []

beforeEach(() => {
  clicked = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ href: this.href, download: this.download })
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:hobbook-export')
})

afterEach(() => vi.restoreAllMocks())

const blobResponse = (headers: Record<string, string> = {}) => ({ data: new Blob(['{"account":{}}'], { type: 'application/json' }), headers })

describe('DataExportSection', () => {
  it('requests the export as a file and starts the download', async () => {
    const user = userEvent.setup()
    const get = vi.spyOn(api, 'get').mockResolvedValue(blobResponse({ 'content-disposition': 'attachment; filename="hobbook-daten-2026-11-20.json"' }))
    render(<DataExportSection />)

    expect(screen.getByRole('heading', { level: 2, name: 'Deine Daten' })).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Daten herunterladen' }))

    await waitFor(() => expect(clicked).toHaveLength(1))
    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith('/users/me/export', { responseType: 'blob' })
    expect(clicked[0]).toEqual({ href: 'blob:hobbook-export', download: 'hobbook-daten-2026-11-20.json' })
    expect(screen.getByRole('button', { name: 'Daten herunterladen' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // The helper link does not stay in the page.
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('names the file itself when the header is not readable', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'get').mockResolvedValue(blobResponse())
    render(<DataExportSection />)
    await user.click(screen.getByRole('button', { name: 'Daten herunterladen' }))
    await waitFor(() => expect(clicked).toHaveLength(1))
    expect(clicked[0].download).toMatch(/^hobbook-daten-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('is busy while the file is prepared', async () => {
    const user = userEvent.setup()
    let done: (v: unknown) => void = () => {}
    vi.spyOn(api, 'get').mockReturnValue(new Promise((resolve) => (done = resolve)))
    render(<DataExportSection />)
    await user.click(screen.getByRole('button', { name: 'Daten herunterladen' }))
    expect(screen.getByRole('button', { name: 'Wird vorbereitet …' })).toBeDisabled()
    done(blobResponse())
    expect(await screen.findByRole('button', { name: 'Daten herunterladen' })).toBeEnabled()
  })

  it("shows the server's message when the request fails", async () => {
    const user = userEvent.setup()
    const body = new Blob([JSON.stringify({ message: 'Zu viele Anmeldeversuche. Bitte versuche es später erneut.' })], { type: 'application/json' })
    const response = { status: 429, data: body, headers: {}, statusText: 'Too Many Requests', config: {} } as unknown as AxiosResponse
    vi.spyOn(api, 'get').mockRejectedValue(new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response))
    render(<DataExportSection />)

    await user.click(screen.getByRole('button', { name: 'Daten herunterladen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Anmeldeversuche. Bitte versuche es später erneut.')
    expect(clicked).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Daten herunterladen' })).toBeEnabled()
  })

  it('shows a plain message when there is no connection', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'get').mockRejectedValue(new Error('offline'))
    render(<DataExportSection />)
    await user.click(screen.getByRole('button', { name: 'Daten herunterladen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Der Download hat nicht geklappt')
  })
})
