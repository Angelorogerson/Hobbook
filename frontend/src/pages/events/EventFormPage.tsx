import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Minus, Plus } from 'lucide-react'
import { createEvent, getEvent, updateEvent, type EventInput, type EventLevel, type EventVisibility, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import LocationPicker, { type PickedLocation } from '@/components/map/LocationPicker'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { LEVELS, SPORTS, levelLabel, sportColor, sportLabel } from '@/constants/sports'
import SportIcon from '@/components/ui/SportIcon'
import { DateTile } from '@/components/ui/DataPieces'
import { browserTimeZone, formatEventDate, fromLocalInputs, toLocalInputs } from '@/utils/format'
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
}

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
  const { startAt, endAt } = computeTimes(f)
  if (!f.date) e.startAt = 'Bitte wähle ein Datum'
  else if (!startAt) e.startAt = 'Bitte gib eine gültige Startzeit an'
  else if (new Date(startAt) <= now) e.startAt = 'Die Startzeit muss in der Zukunft liegen'
  if (!f.endTime || !endAt) e.endAt = 'Bitte gib eine Endzeit an'
  else if (startAt && new Date(endAt).getTime() - new Date(startAt).getTime() > 24 * 3600 * 1000)
    e.endAt = 'Ein Event darf höchstens 24 Stunden dauern'
  const max = Number(f.maxParticipants)
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
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { authState } = useAuthContext()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [original, setOriginal] = useState<SportEvent | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  // Until the organizer types a title, it follows sport and meeting point.
  const titleTouched = useRef(isEdit)
  const [moreOpen, setMoreOpen] = useState(isEdit)

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
    setSubmitting(true)
    setSubmitError('')
    try {
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
  const summaryReady = !!(form.sport && times.startAt && times.endAt && form.location.placeName.trim())
  const materialChange =
    isEdit &&
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
      <Link to={isEdit && original ? `/events/${original._id}` : '/entdecken'} className="btn btn-ghost btn-sm back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Abbrechen
      </Link>
      <div className="page-head">
        <div>
          <h1 className="page-title">{isEdit ? 'Event bearbeiten' : 'Event erstellen'}</h1>
          <p className="page-subtitle">Drei kurze Schritte. Kostenlos und offen für alle.</p>
        </div>
      </div>

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
          <p className="hint">Zeitzone: {browserTimeZone()}. Ein Ende vor dem Beginn zählt als nächster Tag.</p>
        </section>

        <section className="form-section card">
          <h2>
            <span className="form-step">2</span> Wo trefft ihr euch?
          </h2>
          <LocationPicker
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
            <label htmlFor="ev-title">Titel *</label>
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
            <span className="hint">Inklusive dir.</span>
            {err('maxParticipants')}
          </div>

          <details className="form-more" open={moreOpen} onToggle={(e) => setMoreOpen((e.target as HTMLDetailsElement).open)}>
            <summary>Mehr Optionen (Niveau, Mitbringen, Beschreibung, Sichtbarkeit)</summary>
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
              <DateTile iso={times.startAt!} timeZone={browserTimeZone()} size="lg" />
              <div>
                <p className="preview-sport">
                  <SportIcon sport={form.sport} size={16} /> {sportLabel(form.sport)}
                </p>
                <p className="preview-title">{form.title.trim() || 'Ohne Titel'}</p>
                <p className="preview-meta">
                  {(() => {
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
            <Check size={18} aria-hidden="true" /> {submitting ? 'Wird gespeichert …' : isEdit ? 'Änderungen speichern' : 'Veröffentlichen'}
          </button>
        </div>
      </form>
    </div>
  )
}
