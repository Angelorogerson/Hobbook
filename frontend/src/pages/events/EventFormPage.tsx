import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, CopyPlus, Info, MapPin, Minus, Plus, Repeat, X } from 'lucide-react'
import { createEvent, getEvent, updateEvent, type EventInput, type EventLevel, type EventVisibility, type SportEvent } from '@/api/eventApi'
import { createGroup, getGroup, updateGroup, WEEKDAYS, WEEKDAYS_SHORT, type Group, type GroupInput, type RsvpMode } from '@/api/groupApi'
import { getMyPlaces, type RecentPlace } from '@/api/placesApi'
import { apiError } from '@/api/axiosInstance'
import LocationPicker, { type PickedLocation } from '@/components/map/LocationPicker'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { LEVELS, SPORTS, levelLabel, sportColor, sportLabel } from '@/constants/sports'
import SportIcon from '@/components/ui/SportIcon'
import { DateTile } from '@/components/ui/DataPieces'
import { browserTimeZone, formatEventDate, formatShortWhen, fromLocalInputs, toLocalInputs } from '@/utils/format'
import Modal from '@/components/common/Modal'
import { Presence } from '@/hooks/usePresence'
import { useAuthContext } from '@/store/AuthContext'
import './EventFormPage.css'

interface FormState {
  sport: string
  title: string
  date: string
  startTime: string
  endTime: string
  maxParticipants: string
  level: EventLevel
  description: string
  /** Optional one-liner: what to bring. */
  bring?: string
  visibility: EventVisibility
  location: PickedLocation
  /** Stammspiel: repeats every week on `weekday` (1 = Monday … 7 = Sunday). */
  weekly: boolean
  weekday: number
  minPlayers: string
  deadlineHours: string
  openDaysBefore: string
  rsvpMode: RsvpMode
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a local yyyy-mm-dd date. */
export const isoWeekdayOf = (date: string) => {
  const d = new Date(`${date}T12:00:00`)
  return d.getDay() === 0 ? 7 : d.getDay()
}

/** Suggested minimum: about 60 % of the spots, at least 2. */
export const suggestedMin = (max: number) => Math.max(2, Math.min(max, Math.round(max * 0.6)))

const DEADLINES = [1, 2, 3, 6, 12, 24]

/** Local YYYY-MM-DD for a day offset from today (0 = today). */
export function dayInput(offset: number, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** HH:MM plus minutes, wrapping past midnight (the form treats that as "next day"). */
export function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const minutesBetween = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if (![sh, sm, eh, em].every(Number.isFinite)) return null
  return (((eh * 60 + em - (sh * 60 + sm)) % 1440) + 1440) % 1440
}

const DURATIONS = [
  { minutes: 60, label: '1 Std.' },
  { minutes: 90, label: '1,5 Std.' },
  { minutes: 120, label: '2 Std.' },
  { minutes: 180, label: '3 Std.' },
]

/** Day shortcuts: today, tomorrow and the coming Saturday/Sunday when they are further away. */
function dayChoices(now = new Date()) {
  const out = [
    { value: dayInput(0, now), label: 'Heute' },
    { value: dayInput(1, now), label: 'Morgen' },
  ]
  for (let i = 2; i <= 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    if (d.getDay() === 6) out.push({ value: dayInput(i, now), label: 'Samstag' })
    if (d.getDay() === 0) out.push({ value: dayInput(i, now), label: 'Sonntag' })
  }
  return out
}

// Sensible defaults: tomorrow evening for two hours, ten people, open to everyone.
const emptyForm = (): FormState => ({
  sport: '',
  title: '',
  date: dayInput(1),
  startTime: '18:00',
  endTime: '20:00',
  maxParticipants: '10',
  level: 'all',
  description: '',
  bring: '',
  visibility: 'public',
  location: { placeName: '', address: '', city: '', lat: null, lng: null },
  weekly: false,
  weekday: isoWeekdayOf(dayInput(1)),
  minPlayers: '6',
  deadlineHours: '3',
  openDaysBefore: '5',
  rsvpMode: 'ask',
})

function fromEvent(e: SportEvent): FormState {
  const s = toLocalInputs(e.startAt)
  const en = toLocalInputs(e.endAt)
  return {
    sport: e.sport,
    title: e.title,
    date: s.date,
    startTime: s.time,
    endTime: en.time,
    maxParticipants: String(e.maxParticipants),
    level: e.level,
    description: e.description,
    bring: e.bring || '',
    visibility: e.visibility,
    location: { ...e.location },
    weekly: false,
    weekday: isoWeekdayOf(s.date),
    minPlayers: '6',
    deadlineHours: '3',
    openDaysBefore: '5',
    rsvpMode: 'ask',
  }
}

/**
 * "Nochmal veranstalten": the next start on the same weekday at the same local
 * time that lies in the future (original start + 7 days × n, n ≥ 1). Counted in
 * calendar days, so a clock change in between does not move the time of day.
 */
export function nextWeeklyStart(startAt: string, now = new Date()): Date {
  const s = new Date(startAt)
  if (Number.isNaN(s.getTime())) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 18, 0)
  const weeksLater = (n: number) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7 * n, s.getHours(), s.getMinutes())
  let n = Math.max(1, Math.floor((now.getTime() - s.getTime()) / (7 * 24 * 3600 * 1000)))
  while (weeksLater(n) <= now) n += 1
  return weeksLater(n)
}

/** A copy of an event for the create form: everything but the date is taken over. */
export function fromCopy(e: SportEvent, now = new Date()): FormState {
  const date = toLocalInputs(nextWeeklyStart(e.startAt, now).toISOString()).date
  return { ...fromEvent(e), date, weekday: isoWeekdayOf(date) }
}

/** Same place = same name and the same spot to about 10 m (as the server de-duplicates). */
const samePlace = (a: PickedLocation, b: RecentPlace) =>
  a.lat !== null &&
  a.lng !== null &&
  a.placeName.trim().toLowerCase() === b.placeName.trim().toLowerCase() &&
  a.lat.toFixed(4) === b.lat.toFixed(4) &&
  a.lng.toFixed(4) === b.lng.toFixed(4)

function fromGroup(g: Group): FormState {
  const base = emptyForm()
  return {
    ...base,
    sport: g.sport,
    title: g.name,
    startTime: g.startTime,
    endTime: addMinutes(g.startTime, g.durationMin),
    maxParticipants: String(g.maxParticipants),
    level: g.level,
    description: g.description,
    bring: g.bring || '',
    visibility: g.visibility,
    location: { ...g.location },
    weekly: true,
    weekday: g.weekday,
    minPlayers: String(g.minPlayers),
    deadlineHours: String(g.deadlineHours),
    openDaysBefore: String(g.openDaysBefore),
    rsvpMode: g.rsvpMode,
  }
}

/** Compute start/end; an end time before the start time means "the next day". */
function computeTimes(f: FormState) {
  const startAt = fromLocalInputs(f.date, f.startTime)
  let endAt = fromLocalInputs(f.date, f.endTime)
  if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
    endAt = new Date(new Date(endAt).getTime() + 24 * 3600 * 1000).toISOString()
  }
  return { startAt, endAt }
}

/** Error summary targets (WCAG 3.3.1: errors identified and reachable). */
const FIELD_LINKS: Record<string, { id: string; label: string }> = {
  sport: { id: 'ev-sport-football', label: 'Sportart' },
  title: { id: 'ev-title', label: 'Titel' },
  description: { id: 'ev-desc', label: 'Beschreibung' },
  bring: { id: 'ev-bring', label: 'Mitbringen' },
  startAt: { id: 'ev-date', label: 'Datum / Beginn' },
  endAt: { id: 'ev-end', label: 'Ende' },
  maxParticipants: { id: 'ev-max', label: 'Maximale Teilnehmende' },
  minPlayers: { id: 'ev-min', label: 'Mindestens' },
  weekday: { id: 'ev-weekday-1', label: 'Wochentag' },
  name: { id: 'ev-title', label: 'Name' },
  durationMin: { id: 'ev-end', label: 'Ende' },
  'location.placeName': { id: 'loc-place', label: 'Treffpunkt' },
  'location.address': { id: 'loc-address', label: 'Adresse' },
  'location.city': { id: 'loc-city', label: 'Stadt' },
  'location.lat': { id: 'loc-search', label: 'Ort auf der Karte' },
}

export function validateForm(f: FormState, now = new Date()): Record<string, string> {
  const e: Record<string, string> = {}
  if (!f.sport) e.sport = 'Bitte wähle eine Sportart'
  if (f.title.trim().length < 3) e.title = 'Der Titel braucht mindestens 3 Zeichen'
  if (f.title.trim().length > 100) e.title = 'Der Titel darf höchstens 100 Zeichen haben'
  const max = Number(f.maxParticipants)
  if (f.weekly) {
    if (!(f.weekday >= 1 && f.weekday <= 7)) e.weekday = 'Bitte wähle einen Wochentag'
    if (!/^\d{2}:\d{2}$/.test(f.startTime)) e.startAt = 'Bitte gib eine gültige Startzeit an'
    const mins = minutesBetween(f.startTime, f.endTime)
    if (!f.endTime || mins === null) e.endAt = 'Bitte gib eine Endzeit an'
    else if (mins < 30 || mins > 480) e.endAt = 'Ein Stammspiel dauert 30 Minuten bis 8 Stunden'
    const min = Number(f.minPlayers)
    if (!Number.isInteger(min) || min < 2) e.minPlayers = 'Mindestens 2'
    else if (Number.isInteger(max) && min > max) e.minPlayers = 'Darf nicht über dem Maximum liegen'
  } else {
    const { startAt, endAt } = computeTimes(f)
    if (!f.date) e.startAt = 'Bitte wähle ein Datum'
    else if (!startAt) e.startAt = 'Bitte gib eine gültige Startzeit an'
    else if (new Date(startAt) <= now) e.startAt = 'Die Startzeit muss in der Zukunft liegen'
    if (!f.endTime || !endAt) e.endAt = 'Bitte gib eine Endzeit an'
    else if (startAt && new Date(endAt).getTime() - new Date(startAt).getTime() > 24 * 3600 * 1000)
      e.endAt = 'Ein Event darf höchstens 24 Stunden dauern'
  }
  if (!Number.isInteger(max) || max < 2 || max > 100) e.maxParticipants = 'Bitte 2 bis 100 Teilnehmende angeben'
  if (f.description.length > 2000) e.description = 'Höchstens 2000 Zeichen'
  if ((f.bring || '').length > 200) e.bring = 'Höchstens 200 Zeichen'
  if (!f.location.placeName.trim()) e['location.placeName'] = 'Bitte gib den Treffpunkt an'
  if (!f.location.address.trim()) e['location.address'] = 'Bitte gib eine Adresse an'
  if (!f.location.city.trim()) e['location.city'] = 'Bitte gib die Stadt an'
  if (f.location.lat === null || f.location.lng === null) e['location.lat'] = 'Bitte setze einen Pin'
  return e
}

function toInput(f: FormState): EventInput {
  const { startAt, endAt } = computeTimes(f)
  return {
    sport: f.sport,
    title: f.title.trim(),
    description: f.description.trim(),
    bring: (f.bring || '').trim(),
    startAt: startAt!,
    endAt: endAt!,
    timezone: browserTimeZone(),
    maxParticipants: Number(f.maxParticipants),
    level: f.level,
    visibility: f.visibility,
    location: {
      placeName: f.location.placeName.trim(),
      address: f.location.address.trim(),
      city: f.location.city.trim(),
      countryCode: f.location.countryCode,
      lat: f.location.lat!,
      lng: f.location.lng!,
    },
  }
}

function toGroupInput(f: FormState): GroupInput {
  return {
    name: f.title.trim(),
    sport: f.sport,
    description: f.description.trim(),
    bring: (f.bring || '').trim(),
    level: f.level,
    visibility: f.visibility,
    weekday: f.weekday,
    startTime: f.startTime,
    durationMin: minutesBetween(f.startTime, f.endTime) || 120,
    timezone: browserTimeZone(),
    maxParticipants: Number(f.maxParticipants),
    minPlayers: Number(f.minPlayers),
    deadlineHours: Number(f.deadlineHours),
    openDaysBefore: Number(f.openDaysBefore),
    rsvpMode: f.rsvpMode,
    location: {
      placeName: f.location.placeName.trim(),
      address: f.location.address.trim(),
      city: f.location.city.trim(),
      countryCode: f.location.countryCode,
      lat: f.location.lat!,
      lng: f.location.lng!,
    },
  }
}

/** Only send what changed when editing (a started-but-unchanged start time must not be re-validated). */
function diff(original: SportEvent, next: EventInput): Partial<EventInput> {
  const out: Partial<EventInput> = {}
  ;(['sport', 'title', 'description', 'maxParticipants', 'level', 'visibility'] as const).forEach((k) => {
    if (next[k] !== original[k]) (out as Record<string, unknown>)[k] = next[k]
  })
  if ((next.bring || '') !== (original.bring || '')) out.bring = next.bring || ''
  if (+new Date(next.startAt) !== +new Date(original.startAt)) out.startAt = next.startAt
  if (+new Date(next.endAt) !== +new Date(original.endAt)) out.endAt = next.endAt
  const l = original.location
  const n = next.location
  if (l.placeName !== n.placeName || l.address !== n.address || l.city !== n.city || l.lat !== n.lat || l.lng !== n.lng) {
    out.location = n
  }
  return out
}

export default function EventFormPage() {
  const { id, groupId } = useParams<{ id?: string; groupId?: string }>()
  const isEdit = !!id || !!groupId
  const isGroupEdit = !!groupId
  const navigate = useNavigate()
  const { authState } = useAuthContext()
  const [params] = useSearchParams()
  // "Nochmal veranstalten": create mode with ?kopie=<eventId>.
  const copyId = isEdit ? null : params.get('kopie')

  const [form, setForm] = useState<FormState>(() => ({ ...emptyForm(), weekly: params.get('woche') === '1' }))
  const minTouched = useRef(isEdit)
  const [original, setOriginal] = useState<SportEvent | null>(null)
  const [loading, setLoading] = useState(isEdit || !!copyId)
  const [copy, setCopy] = useState<{ title: string } | 'failed' | null>(null)
  // Places used before (create mode only): one tap instead of a new search.
  const [recentPlaces, setRecentPlaces] = useState<RecentPlace[]>([])
  // The map reads its start position once: a new key shows a place chosen from outside.
  const [pickerKey, setPickerKey] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  // Until the organizer types a title, it follows sport and meeting point.
  const titleTouched = useRef(isEdit)
  const [moreOpen, setMoreOpen] = useState(isEdit)
  // Stammspiel edit: the game that is already open (it may or may not take the changes).
  const [openGame, setOpenGame] = useState<{ startAt: string; timezone: string } | null>(null)
  const [askScope, setAskScope] = useState(false)

  useEffect(() => {
    if (!groupId) return
    getGroup(groupId)
      .then((g) => {
        if (!g.isHost) setLoadError('Nur Organisator:innen dürfen dieses Stammspiel bearbeiten.')
        else if (!g.active) setLoadError('Dieses Stammspiel wurde beendet.')
        else {
          setForm(fromGroup(g))
          const up = g.upcoming
          if (up && (up.status === 'open' || up.status === 'full') && new Date(up.startAt) > new Date()) {
            setOpenGame({ startAt: up.startAt, timezone: up.timezone })
          }
        }
      })
      .catch((err) => setLoadError(apiError(err, 'Stammspiel konnte nicht geladen werden.').message))
      .finally(() => setLoading(false))
  }, [groupId])

  // The minimum follows the maximum until the organizer sets it.
  useEffect(() => {
    if (minTouched.current) return
    const max = Number(form.maxParticipants)
    if (Number.isInteger(max) && max >= 2) setForm((f) => ({ ...f, minPlayers: String(suggestedMin(max)) }))
  }, [form.maxParticipants])

  useEffect(() => {
    if (!id) return
    getEvent(id)
      .then((e) => {
        if (!e.isOrganizer && authState.user?.role !== 'admin') {
          setLoadError('Nur der Organisator darf dieses Event bearbeiten.')
        } else if (e.status === 'cancelled' || e.status === 'completed') {
          setLoadError('Abgesagte oder vergangene Events können nicht bearbeitet werden.')
        } else {
          setOriginal(e)
          setForm(fromEvent(e))
        }
      })
      .catch((err) => setLoadError(apiError(err, 'Event konnte nicht geladen werden.').message))
      .finally(() => setLoading(false))
  }, [id, authState.user?.role])

  useEffect(() => {
    if (!copyId) return
    let active = true
    getEvent(copyId)
      .then((e) => {
        if (!active) return
        // The copied title is the organizer's own: no automatic suggestion over it.
        titleTouched.current = true
        setForm((f) => ({ ...fromCopy(e), weekly: f.weekly }))
        if (e.description || e.bring || e.level !== 'all' || e.visibility !== 'public') setMoreOpen(true)
        setCopy({ title: e.title })
      })
      .catch(() => {
        if (active) setCopy('failed')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [copyId])

  useEffect(() => {
    if (isEdit) return
    let active = true
    getMyPlaces()
      .then((places) => {
        if (active) setRecentPlaces(places)
      })
      // The form works without the shortcuts.
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isEdit])

  const clearError = (...keys: string[]) =>
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))))

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    clearError(k as string)
  }

  // Suggest a title from sport + meeting point while the organizer has not written one.
  useEffect(() => {
    if (titleTouched.current) return
    const place = form.location.placeName.trim()
    const suggestion = form.sport ? (place ? `${sportLabel(form.sport)} – ${place}` : sportLabel(form.sport)) : ''
    setForm((f) => (f.title === suggestion ? f : { ...f, title: suggestion.slice(0, 100) }))
  }, [form.sport, form.location.placeName])

  if (loading) return <LoadingSpinner fullScreen />
  if (loadError) {
    return (
      <div className="page">
        <h1 className="page-title">Bearbeiten nicht möglich</h1>
        <p className="page-subtitle">{loadError}</p>
        <Link to="/meine-events" className="btn btn-primary">Zu meinen Events</Link>
      </div>
    )
  }

  const focusFirstInvalid = () =>
    setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0)

  const saveGroupEdit = async (applyToUpcoming: boolean) => {
    setAskScope(false)
    setSubmitting(true)
    setSubmitError('')
    try {
      const g = await updateGroup(groupId!, { ...toGroupInput(form), applyToUpcoming })
      navigate(`/stammspiel/${g._id}`, { replace: true, state: { updated: true, appliedToUpcoming: applyToUpcoming } })
    } catch (err) {
      const info = apiError(err)
      setSubmitError(info.message)
      setErrors(info.errors)
    } finally {
      setSubmitting(false)
    }
  }

  const publish = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = validateForm(form)
    setErrors(v)
    if (Object.keys(v).length) {
      if (v.description || v.bring) setMoreOpen(true)
      // Wait for the error state to render, then move focus to the first invalid field.
      focusFirstInvalid()
      return
    }
    // Editing a Stammspiel with an open game: ask whether it takes the changes too.
    if (isGroupEdit && openGame) {
      setAskScope(true)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      if (form.weekly) {
        const input = toGroupInput(form)
        const g = isGroupEdit ? await updateGroup(groupId!, input) : await createGroup(input)
        navigate(`/stammspiel/${g._id}`, { replace: true, state: isGroupEdit ? { updated: true } : { created: true } })
        return
      }
      const input = toInput(form)
      const saved = isEdit && original ? await updateEvent(original._id, diff(original, input)) : await createEvent(input)
      navigate(`/events/${saved._id}`, { replace: true, state: isEdit ? { updated: true } : { created: true } })
    } catch (err) {
      const info = apiError(err)
      setSubmitError(info.message)
      setErrors(info.errors)
      if (Object.keys(info.errors).length) {
        setMoreOpen(true)
        focusFirstInvalid()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const pickRecentPlace = (p: RecentPlace) => {
    setForm((f) => ({
      ...f,
      location: { placeName: p.placeName, address: p.address, city: p.city, countryCode: p.countryCode, lat: p.lat, lng: p.lng },
    }))
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('location'))))
    setPickerKey((k) => k + 1)
  }

  const fieldProps = (name: string) => ({
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `err-${name}` : undefined,
  })
  const err = (name: string) =>
    errors[name] ? (
      <span id={`err-${name}`} className="error">
        {errors[name]}
      </span>
    ) : null

  const times = computeTimes(form)
  const summaryReady = !!(form.sport && (form.weekly || (times.startAt && times.endAt)) && form.location.placeName.trim())
  const materialChange =
    isEdit &&
    !form.weekly &&
    original &&
    summaryReady &&
    form.location.lat !== null &&
    (() => {
      const d = diff(original, toInput(form))
      return !!(d.startAt || d.endAt || d.location)
    })()
  const duration = minutesBetween(form.startTime, form.endTime)
  const max = Number(form.maxParticipants)
  const stepMax = (delta: number) => set('maxParticipants', String(Math.min(100, Math.max(2, (Number.isInteger(max) ? max : 10) + delta))))

  return (
    <div className="page page--narrow event-form">
      <button
        type="button"
        className="btn btn-ghost btn-sm back-link"
        onClick={() =>
          window.history.length > 1
            ? navigate(-1)
            : navigate(isGroupEdit ? `/stammspiel/${groupId}` : isEdit && original ? `/events/${original._id}` : '/entdecken')
        }
      >
        <ArrowLeft size={16} aria-hidden="true" /> Abbrechen
      </button>
      <div className="page-head">
        <div>
          <h1 className="page-title">
            {isGroupEdit ? 'Stammspiel bearbeiten' : isEdit ? 'Event bearbeiten' : form.weekly ? 'Stammspiel anlegen' : 'Event erstellen'}
          </h1>
          <p className="page-subtitle">
            {isGroupEdit
              ? 'Änderungen gelten ab dem nächsten Termin, der noch nicht geöffnet ist.'
              : form.weekly
                ? 'Einmal anlegen – Hobbook öffnet jede Woche den nächsten Termin und fragt alle, wer dabei ist.'
                : 'Drei kurze Schritte. Kostenlos und offen für alle.'}
          </p>
        </div>
      </div>

      {copy && copy !== 'failed' && (
        <div className="notice notice-info copy-hint" role="status">
          <CopyPlus size={18} aria-hidden="true" />
          <p>Kopie von „{copy.title}“ – prüfe Datum und Uhrzeit.</p>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Hinweis schließen" onClick={() => setCopy(null)}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {copy === 'failed' && (
        <p className="notice notice-warning" role="status">
          <Info size={18} aria-hidden="true" />
          Die Vorlage konnte nicht geladen werden. Du startest mit einem leeren Formular.
        </p>
      )}

      <form onSubmit={publish} noValidate>
        <section className="form-section card">
          <h2>
            <span className="form-step">1</span> Was und wann?
          </h2>
          <fieldset className="field" aria-describedby={errors.sport ? 'err-sport' : undefined}>
            <legend className="label">Sportart *</legend>
            <div className="sport-grid">
              {SPORTS.map((s) => (
                <label key={s.key} className={`sport-choice${form.sport === s.key ? ' is-on' : ''}`} style={{ ['--sport-color' as string]: sportColor(s.key) }}>
                  <input
                    id={`ev-sport-${s.key}`}
                    type="radio"
                    name="sport"
                    className="sr-only"
                    checked={form.sport === s.key}
                    onChange={() => set('sport', s.key)}
                    aria-invalid={!!errors.sport}
                  />
                  <SportIcon sport={s.key} size={22} />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
            {err('sport')}
          </fieldset>

          {!isEdit && (
            <label className={`weekly-toggle${form.weekly ? ' is-on' : ''}`}>
              <input
                type="checkbox"
                role="switch"
                checked={form.weekly}
                onChange={(e) => {
                  const weekly = e.target.checked
                  setForm((f) => ({ ...f, weekly, weekday: isoWeekdayOf(f.date) }))
                  clearError('startAt', 'weekday')
                }}
              />
              <Repeat size={20} aria-hidden="true" />
              <span>
                <strong>Jede Woche wiederholen</strong>
                <span className="hint">Als Stammspiel: Hobbook fragt jede Woche alle, wer dabei ist, und sagt Bescheid, ob es stattfindet.</span>
              </span>
            </label>
          )}

          {form.weekly ? (
            <fieldset className="field" aria-describedby={errors.weekday ? 'err-weekday' : undefined}>
              <legend className="label">Wochentag *</legend>
              <div className="chip-row weekday-row">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    id={`ev-weekday-${d}`}
                    type="button"
                    className="chip"
                    aria-pressed={form.weekday === d}
                    // Starts with the visible text (label in name), then the full day.
                    aria-label={`${WEEKDAYS_SHORT[d]}, ${WEEKDAYS[d]}`}
                    onClick={() => set('weekday', d)}
                  >
                    {WEEKDAYS_SHORT[d]}
                  </button>
                ))}
              </div>
              {err('weekday')}
            </fieldset>
          ) : (
          <div className="field">
            <label htmlFor="ev-date">Datum *</label>
            <div className="chip-row" role="group" aria-label="Tag wählen">
              {dayChoices().map((d) => (
                <button key={d.value} type="button" className="chip" aria-pressed={form.date === d.value} onClick={() => set('date', d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
            <input
              id="ev-date"
              type="date"
              className="input"
              value={form.date}
              min={dayInput(0)}
              onChange={(e) => {
                set('date', e.target.value)
                clearError('startAt')
              }}
              {...fieldProps('startAt')}
            />
          </div>
          )}

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-start">Beginn *</label>
              <input
                id="ev-start"
                type="time"
                className="input"
                value={form.startTime}
                onChange={(e) => {
                  // Moving the start keeps the chosen duration.
                  const next = e.target.value
                  setForm((f) => ({ ...f, startTime: next, endTime: duration ? addMinutes(next, duration) : f.endTime }))
                  clearError('startAt', 'endAt')
                }}
                {...fieldProps('startAt')}
              />
            </div>
            <div className="field">
              <label htmlFor="ev-end">Ende *</label>
              <input
                id="ev-end"
                type="time"
                className="input"
                value={form.endTime}
                onChange={(e) => {
                  set('endTime', e.target.value)
                  clearError('endAt')
                }}
                {...fieldProps('endAt')}
              />
            </div>
          </div>
          <div className="chip-row" role="group" aria-label="Dauer wählen">
            {DURATIONS.map((d) => (
              <button
                key={d.minutes}
                type="button"
                className="chip"
                aria-pressed={duration === d.minutes}
                onClick={() => {
                  set('endTime', addMinutes(form.startTime, d.minutes))
                  clearError('endAt')
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          {err('startAt')}
          {err('endAt')}
          <p className="hint">
            Zeitzone: {browserTimeZone()}.{' '}
            {form.weekly ? 'Die Uhrzeit bleibt auch bei Sommer- und Winterzeit gleich.' : 'Ein Ende vor dem Beginn zählt als nächster Tag.'}
          </p>
        </section>

        <section className="form-section card">
          <h2>
            <span className="form-step">2</span> Wo trefft ihr euch?
          </h2>
          {!isEdit && recentPlaces.length > 0 && (
            <div className="recent-places" role="group" aria-labelledby="recent-places-label">
              <span id="recent-places-label" className="recent-places-label">
                Zuletzt genutzt:
              </span>
              {recentPlaces.map((p) => (
                <button
                  key={`${p.placeName}|${p.lat}|${p.lng}`}
                  type="button"
                  className="chip"
                  aria-pressed={samePlace(form.location, p)}
                  title={[p.address, p.city].filter(Boolean).join(', ')}
                  onClick={() => pickRecentPlace(p)}
                >
                  <MapPin size={14} aria-hidden="true" />
                  <span>{p.placeName}</span>
                </button>
              ))}
            </div>
          )}
          <LocationPicker
            key={pickerKey}
            value={form.location}
            onChange={(v) => {
              setForm((f) => ({ ...f, location: v }))
              setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('location'))))
            }}
            errors={errors}
          />
        </section>

        <section className="form-section card">
          <h2>
            <span className="form-step">3</span> Details
          </h2>
          <div className="field">
            <label htmlFor="ev-title">{form.weekly ? 'Name des Stammspiels *' : 'Titel *'}</label>
            <input
              id="ev-title"
              className="input"
              value={form.title}
              maxLength={100}
              onChange={(e) => {
                titleTouched.current = true
                set('title', e.target.value)
              }}
              placeholder="z. B. Feierabend-Kick im Park"
              {...fieldProps('title')}
            />
            {!titleTouched.current && form.title && <span className="hint">Vorschlag – du kannst ihn ändern.</span>}
            {err('title')}
          </div>

          <div className="field">
            <label htmlFor="ev-max">Maximale Teilnehmende *</label>
            <div className="stepper">
              <button type="button" className="btn btn-secondary btn-icon" aria-label="Eine Person weniger" onClick={() => stepMax(-1)} disabled={max <= 2}>
                <Minus size={18} aria-hidden="true" />
              </button>
              <input
                id="ev-max"
                type="number"
                inputMode="numeric"
                min={2}
                max={100}
                className="input"
                value={form.maxParticipants}
                onChange={(e) => set('maxParticipants', e.target.value)}
                {...fieldProps('maxParticipants')}
              />
              <button type="button" className="btn btn-secondary btn-icon" aria-label="Eine Person mehr" onClick={() => stepMax(1)} disabled={max >= 100}>
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
            <span className="hint">Inklusive dir.{form.weekly ? ' Wer danach zusagt, kommt auf die Warteliste und rückt automatisch nach.' : ''}</span>
            {err('maxParticipants')}
          </div>

          {form.weekly && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="ev-min">Findet statt ab *</label>
                <input
                  id="ev-min"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={100}
                  className="input"
                  value={form.minPlayers}
                  onChange={(e) => {
                    minTouched.current = true
                    set('minPlayers', e.target.value)
                  }}
                  {...fieldProps('minPlayers')}
                />
                <span className="hint">Zusagen. Darunter fällt der Termin automatisch aus.</span>
                {err('minPlayers')}
              </div>
              <div className="field">
                <label htmlFor="ev-deadline">Antworten bis</label>
                <select id="ev-deadline" className="select" value={form.deadlineHours} onChange={(e) => set('deadlineHours', e.target.value)}>
                  {DEADLINES.map((h) => (
                    <option key={h} value={String(h)}>
                      {h === 1 ? '1 Stunde' : `${h} Stunden`} vorher
                    </option>
                  ))}
                </select>
                <span className="hint">Dann entscheidet Hobbook und sagt allen Bescheid.</span>
              </div>
            </div>
          )}

          <details className="form-more" open={moreOpen} onToggle={(e) => setMoreOpen((e.target as HTMLDetailsElement).open)}>
            <summary>
              {form.weekly ? 'Mehr Optionen (Antworten, Einladung, Niveau, Beschreibung, Sichtbarkeit)' : 'Mehr Optionen (Niveau, Mitbringen, Beschreibung, Sichtbarkeit)'}
            </summary>
            {form.weekly && (
              <>
                <fieldset className="field">
                  <legend className="label">Wer ist dabei?</legend>
                  <label className="radio-row">
                    <input type="radio" name="rsvp" checked={form.rsvpMode === 'ask'} onChange={() => set('rsvpMode', 'ask')} />
                    Jede Woche alle fragen (empfohlen, wenn neue Leute dazukommen)
                  </label>
                  <label className="radio-row">
                    <input type="radio" name="rsvp" checked={form.rsvpMode === 'autoIn'} onChange={() => set('rsvpMode', 'autoIn')} />
                    Alle sind dabei, außer sie sagen ab (für einen festen Kern)
                  </label>
                </fieldset>
                <div className="field">
                  <label htmlFor="ev-open">Einladung verschicken</label>
                  <select id="ev-open" className="select" value={form.openDaysBefore} onChange={(e) => set('openDaysBefore', e.target.value)}>
                    {[2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={String(d)}>
                        {d} Tage vorher
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="ev-level">Niveau</label>
              <select id="ev-level" className="select" value={form.level} onChange={(e) => set('level', e.target.value as EventLevel)}>
                {LEVELS.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ev-bring">Mitbringen</label>
              <input
                id="ev-bring"
                className="input"
                value={form.bring || ''}
                maxLength={200}
                onChange={(e) => set('bring', e.target.value)}
                placeholder="z. B. Hallenschuhe, Wasser"
                {...fieldProps('bring')}
              />
              {err('bring')}
            </div>
            <div className="field">
              <label htmlFor="ev-desc">Beschreibung</label>
              <textarea
                id="ev-desc"
                className="textarea"
                value={form.description}
                maxLength={2000}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Was erwartet die Leute?"
                {...fieldProps('description')}
              />
              <span className="hint">{form.description.length}/2000</span>
              {err('description')}
            </div>
            <fieldset className="field">
              <legend className="label">Sichtbarkeit</legend>
              <label className="radio-row">
                <input type="radio" name="visibility" checked={form.visibility === 'public'} onChange={() => set('visibility', 'public')} />
                Öffentlich (Liste und Karte)
              </label>
              <label className="radio-row">
                <input type="radio" name="visibility" checked={form.visibility === 'unlisted'} onChange={() => set('visibility', 'unlisted')} />
                Nur über den Link
              </label>
            </fieldset>
          </details>
        </section>

        {summaryReady && (
          <section className="card preview-card" aria-labelledby="ev-preview" style={{ ['--sport-color' as string]: sportColor(form.sport) }}>
            <h2 id="ev-preview" className="preview-label">
              So sehen es die anderen
            </h2>
            <div className="preview-head">
              {form.weekly ? (
                <span className="weekday-tile" aria-hidden="true">
                  <Repeat size={16} />
                  {WEEKDAYS_SHORT[form.weekday]}
                </span>
              ) : (
                <DateTile iso={times.startAt!} timeZone={browserTimeZone()} size="lg" />
              )}
              <div>
                <p className="preview-sport">
                  <SportIcon sport={form.sport} size={16} /> {sportLabel(form.sport)}
                </p>
                <p className="preview-title">{form.title.trim() || 'Ohne Titel'}</p>
                <p className="preview-meta">
                  {form.weekly
                    ? `Jeden ${WEEKDAYS[form.weekday]}, ${form.startTime}–${form.endTime} Uhr · ab ${form.minPlayers} Zusagen findet's statt`
                    : (() => {
                        const { day, time } = formatEventDate(times.startAt!, times.endAt!, browserTimeZone())
                        return `${day}, ${time}`
                      })()}
                </p>
                <p className="preview-meta">
                  {form.location.placeName}
                  {form.location.city ? `, ${form.location.city}` : ''} · {Number.isInteger(max) ? max : '–'} Plätze · {levelLabel(form.level)} ·{' '}
                  {form.visibility === 'public' ? 'öffentlich' : 'nur per Link'}
                </p>
              </div>
            </div>
          </section>
        )}

        {materialChange && (
          <p className="notice notice-warning">
            <AlertTriangle size={18} aria-hidden="true" />
            Du änderst Zeit oder Ort. Angemeldete sehen auf der Eventseite einen Hinweis auf die Änderung.
          </p>
        )}

        {submitError && (
          <p className="notice notice-danger" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            {submitError}
          </p>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="notice notice-danger error-summary" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <p>Bitte prüfe die markierten Felder.</p>
              <ul>
                {Object.keys(errors)
                  .filter((k) => FIELD_LINKS[k])
                  .map((k) => (
                    <li key={k}>
                      <a
                        href={`#${FIELD_LINKS[k].id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          if (k === 'description' || k === 'bring') setMoreOpen(true)
                          setTimeout(() => document.getElementById(FIELD_LINKS[k].id)?.focus(), 0)
                        }}
                      >
                        {FIELD_LINKS[k].label}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            <Check size={18} aria-hidden="true" />{' '}
            {submitting ? 'Wird gespeichert …' : isEdit ? 'Änderungen speichern' : form.weekly ? 'Stammspiel starten' : 'Veröffentlichen'}
          </button>
        </div>
      </form>

      <Presence show={askScope}>
        {askScope && openGame && (
          <Modal title="Wofür gelten die Änderungen?" onClose={() => setAskScope(false)}>
            <p>
              Der Termin am {formatShortWhen(openGame.startAt, openGame.timezone)} ist schon geöffnet. Ändern sich Zeit oder Ort, bekommen alle, die
              zugesagt haben, Bescheid.
            </p>
            <div className="modal-actions scope-actions">
              <button type="button" className="btn btn-secondary" onClick={() => saveGroupEdit(false)}>
                Nur ab nächster Woche
              </button>
              <button type="button" className="btn btn-primary" onClick={() => saveGroupEdit(true)}>
                Auch für {formatShortWhen(openGame.startAt, openGame.timezone)}
              </button>
            </div>
          </Modal>
        )}
      </Presence>
    </div>
  )
}
