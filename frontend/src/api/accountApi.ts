import axios from 'axios'
import api from './axiosInstance'

// Account extras on the profile page: personal calendar subscription and data export.

/** The personal feed token (created on first use). Whoever has it can read your games. */
export async function getCalendarToken(): Promise<string> {
  const { data } = await api.get<{ token: string }>('/calendar/link')
  return data.token
}

/** Replace the token: addresses with the old one stop working. */
export async function resetCalendarToken(): Promise<string> {
  const { data } = await api.post<{ token: string }>('/calendar/link/reset')
  return data.token
}

/** Absolute https address of the .ics feed, built from the API base URL. */
export function calendarFeedUrl(token: string): string {
  const base = String(api.defaults.baseURL || '').replace(/\/+$/, '')
  const path = `${base}/calendar/feed/${encodeURIComponent(token)}.ics`
  // A relative API base ("/api") becomes absolute: calendar apps need the full address.
  return /^https?:\/\//i.test(path) ? path : new URL(path, window.location.origin).toString()
}

/** Same address with the webcal scheme, which opens the calendar app's "subscribe" dialog. */
export const webcalUrl = (feedUrl: string): string => feedUrl.replace(/^https?:\/\//i, 'webcal://')

export interface DataExportFile {
  blob: Blob
  filename: string
}

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const blobText = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })

/** Everything Hobbook stores about the signed-in person, as a JSON file. */
export async function fetchDataExport(): Promise<DataExportFile> {
  try {
    const res = await api.get<Blob>('/users/me/export', { responseType: 'blob' })
    // The header is only readable when the server exposes it across origins.
    const header = String(res.headers?.['content-disposition'] || '')
    const named = /filename="?([A-Za-z0-9._-]+)"?/.exec(header)?.[1]
    return { blob: res.data, filename: named || `hobbook-daten-${localDate()}.json` }
  } catch (err) {
    // With responseType "blob" an error body is a Blob too: turn it back into JSON,
    // so apiError() can show the server's message.
    if (axios.isAxiosError(err) && err.response && err.response.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await blobText(err.response.data))
      } catch {
        err.response.data = undefined
      }
    }
    throw err
  }
}

/** Hand a file to the browser's download. */
export function saveFile({ blob, filename }: DataExportFile) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Some browsers start the download a moment after the click.
  window.setTimeout(() => URL.revokeObjectURL(href), 1000)
}
