import type { SportEvent } from '@/api/eventApi'

const safeTz = (tz?: string) => {
  try {
    if (tz) Intl.DateTimeFormat('de-DE', { timeZone: tz })
    return tz
  } catch {
    return undefined
  }
}

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin'

/** "Fr., 21.11." + "18:00–20:00 Uhr" in the event's own time zone. */
export function formatEventDate(startAt: string, endAt: string, timeZone?: string) {
  const tz = safeTz(timeZone)
  const start = new Date(startAt)
  const end = new Date(endAt)
  const day = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: tz }).format(start)
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  const sameDay =
    new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeZone: tz }).format(start) ===
    new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeZone: tz }).format(end)
  const range = sameDay
    ? `${time.format(start)}–${time.format(end)} Uhr`
    : `${time.format(start)} Uhr – ${new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: tz }).format(end)}`
  const tzNote = tz && tz !== browserTimeZone() ? ` (${tz})` : ''
  return { day, time: range + tzNote }
}

export function formatLongDate(iso: string, timeZone?: string) {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: safeTz(timeZone),
  }).format(new Date(iso))
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

/** Local date (yyyy-mm-dd) and time (HH:mm) for form inputs, in the browser time zone. */
export function toLocalInputs(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

/** Combine local date + time inputs into an ISO string (browser time zone). */
export function fromLocalInputs(date: string, time: string): string | null {
  if (!date || !time) return null
  const d = new Date(`${date}T${time}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** RFC 5545 calendar entry for one event. */
export function buildIcs(event: SportEvent, url: string) {
  const loc = [event.location.placeName, event.location.address].filter(Boolean).join(', ')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hobbook//Community Sports//DE',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event._id}@hobbook`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(event.startAt)}`,
    `DTEND:${icsDate(event.endAt)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `LOCATION:${icsEscape(loc)}`,
    `DESCRIPTION:${icsEscape(`${event.description || ''}\n${url}`.trim())}`,
    `URL:${url}`,
    ...(event.location.lat !== null && event.location.lng !== null
      ? [`GEO:${event.location.lat};${event.location.lng}`]
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs(event: SportEvent) {
  const blob = new Blob([buildIcs(event, window.location.href)], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${event.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'event'}.ics`
  a.click()
  URL.revokeObjectURL(a.href)
}

export const osmLink = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`

/** Opens the phone's maps app (or Google Maps in the browser) with directions to the meeting point. */
export const routeLink = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

export const spotsText = (e: Pick<SportEvent, 'participantCount' | 'maxParticipants'>) => capacityText(e.participantCount, e.maxParticipants)

/** "Do. 16:00" in the event's time zone (deadlines, short mentions). */
export function formatShortWhen(iso: string, timeZone?: string) {
  const tz = safeTz(timeZone)
  const d = new Date(iso)
  const day = new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: tz }).format(d)
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(d)
  return `${day} ${time}`
}

/** "in 2 Tagen", "in 3 Std.", "in 20 Min.", "vorbei" — coarse on purpose. */
export function relativeUntil(iso: string, now = new Date()) {
  const ms = new Date(iso).getTime() - now.getTime()
  if (ms <= 0) return 'vorbei'
  const min = Math.round(ms / 60000)
  if (min < 60) return `in ${min} Min.`
  const h = Math.round(min / 60)
  if (h < 36) return `in ${h} Std.`
  const d = Math.round(h / 24)
  return `in ${d} ${d === 1 ? 'Tag' : 'Tagen'}`
}

/** One capacity wording everywhere: "9 von 12 dabei". */
export const capacityText = (taken: number, max: number) => `${taken} von ${max} dabei`
