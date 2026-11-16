import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Pencil } from 'lucide-react'
import { createEvent, getEvent, updateEvent, type EventInput, type EventLevel, type EventVisibility, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import LocationPicker, { type PickedLocation } from '@/components/map/LocationPicker'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { LEVELS, SPORTS, levelLabel, sportLabel } from '@/constants/sports'
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
  visibility: EventVisibility
  location: PickedLocation
}

const emptyForm = (): FormState => ({
  sport: '',
  title: '',
  date: '',
  startTime: '18:00',
  endTime: '20:00',
  maxParticipants: '10',
  level: 'all',
  description: '',
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
  const [step, setStep] = useState<'edit' | 'preview'>('edit')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

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

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => {
      const { [k as string]: _omit, ...rest } = e
      void _omit
      return rest
    })
  }

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

  const goPreview = (e: React.FormEvent) => {
    e.preventDefault()
    const v = validateForm(form)
    setErrors(v)
    if (Object.keys(v).length) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      return
    }
    setStep('preview')
    window.scrollTo({ top: 0 })
  }

  const publish = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const input = toInput(form)
      const saved = isEdit && original ? await updateEvent(original._id, diff(original, input)) : await createEvent(input)
      navigate(`/events/${saved._id}`, { replace: true })
    } catch (err) {
      const info = apiError(err)
      setSubmitError(info.message)
      setErrors(info.errors)
      if (Object.keys(info.errors).length) setStep('edit')
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

  const materialChange =
    isEdit && original && (() => {
      const d = diff(original, toInput(form))
      return !!(d.startAt || d.endAt || d.location)
    })()

  if (step === 'preview') {
    const input = toInput(form)
    const { day, time } = formatEventDate(input.startAt, input.endAt, input.timezone)
    return (
      <div className="page event-form">
        <h1 className="page-title">Vorschau</h1>
        <p className="page-subtitle">So sehen andere dein Event. Passt alles?</p>
        {materialChange && (
          <p className="notice notice-warning">
            Du änderst Zeit oder Ort. Angemeldete sehen auf der Eventseite einen Hinweis auf die Änderung.
          </p>
        )}
        <div className="card preview-card">
          <p className="preview-sport">{sportLabel(input.sport)}</p>
          <h2>{input.title}</h2>
          <dl>
            <dt>Wann</dt>
            <dd>
              {day}, {time}
            </dd>
            <dt>Wo</dt>
            <dd>
              {input.location.placeName}, {input.location.address}, {input.location.city}
            </dd>
            <dt>Plätze</dt>
            <dd>{input.maxParticipants} (du zählst als erste Person)</dd>
            <dt>Niveau</dt>
            <dd>{levelLabel(input.level || 'all')}</dd>
            <dt>Sichtbarkeit</dt>
            <dd>{input.visibility === 'public' ? 'Öffentlich in Liste und Karte' : 'Nur über den Link'}</dd>
          </dl>
          {input.description && <p className="preview-desc">{input.description}</p>}
        </div>
        {submitError && (
          <p className="notice notice-danger" role="alert">
            {submitError}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setStep('edit')}>
            <Pencil size={16} aria-hidden="true" /> Weiter bearbeiten
          </button>
          <button type="button" className="btn btn-primary" onClick={publish} disabled={submitting}>
            {submitting ? 'Wird gespeichert …' : isEdit ? 'Änderungen speichern' : 'Veröffentlichen'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page event-form">
      <Link to={isEdit && original ? `/events/${original._id}` : '/'} className="btn btn-ghost btn-sm">
        <ArrowLeft size={16} aria-hidden="true" /> Abbrechen
      </Link>
      <h1 className="page-title">{isEdit ? 'Event bearbeiten' : 'Event erstellen'}</h1>
      <p className="page-subtitle">Kostenlos und offen für alle. Pflichtfelder sind mit * markiert.</p>

      {submitError && (
        <p className="notice notice-danger" role="alert">
          {submitError}
        </p>
      )}

      <form onSubmit={goPreview} noValidate>
        <section className="form-section card">
          <h2>Was?</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-sport">Sportart *</label>
              <select id="ev-sport" className="select" value={form.sport} onChange={(e) => set('sport', e.target.value)} {...fieldProps('sport')}>
                <option value="">Bitte wählen</option>
                {SPORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              {err('sport')}
            </div>
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
          </div>
          <div className="field">
            <label htmlFor="ev-title">Titel *</label>
            <input id="ev-title" className="input" value={form.title} maxLength={100} onChange={(e) => set('title', e.target.value)} placeholder="z. B. Feierabend-Kick im Park" {...fieldProps('title')} />
            {err('title')}
          </div>
          <div className="field">
            <label htmlFor="ev-desc">Beschreibung</label>
            <textarea id="ev-desc" className="textarea" value={form.description} maxLength={2000} onChange={(e) => set('description', e.target.value)} placeholder="Was erwartet die Leute? Was sollen sie mitbringen?" {...fieldProps('description')} />
            <span className="hint">{form.description.length}/2000</span>
            {err('description')}
          </div>
        </section>

        <section className="form-section card">
          <h2>Wann?</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-date">Datum *</label>
              <input id="ev-date" type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} {...fieldProps('startAt')} />
            </div>
            <div className="field">
              <label htmlFor="ev-start">Beginn *</label>
              <input id="ev-start" type="time" className="input" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} {...fieldProps('startAt')} />
            </div>
            <div className="field">
              <label htmlFor="ev-end">Ende *</label>
              <input id="ev-end" type="time" className="input" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} {...fieldProps('endAt')} />
            </div>
          </div>
          {err('startAt')}
          {err('endAt')}
          <p className="hint">Zeitzone: {browserTimeZone()}. Ein Ende vor dem Beginn zählt als nächster Tag.</p>
        </section>

        <section className="form-section card">
          <h2>Wo?</h2>
          <LocationPicker value={form.location} onChange={(v) => {
            setForm((f) => ({ ...f, location: v }))
            setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('location'))))
          }} errors={errors} />
        </section>

        <section className="form-section card">
          <h2>Wer?</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-max">Maximale Teilnehmende *</label>
              <input id="ev-max" type="number" min={2} max={100} className="input" value={form.maxParticipants} onChange={(e) => set('maxParticipants', e.target.value)} {...fieldProps('maxParticipants')} />
              <span className="hint">Inklusive dir.</span>
              {err('maxParticipants')}
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
          </div>
        </section>

        {Object.keys(errors).length > 0 && (
          <p className="notice notice-danger" role="alert">
            Bitte prüfe die markierten Felder.
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            <Eye size={16} aria-hidden="true" /> Vorschau ansehen
          </button>
        </div>
      </form>
    </div>
  )
}
