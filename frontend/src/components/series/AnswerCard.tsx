import { useLayoutEffect, useRef, useState } from 'react'
import { Check, Clock, CloudLightning, Hourglass, X } from 'lucide-react'
import { answerEvent, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import { Avatar } from '@/components/ui/Avatar'
import { formatShortWhen, relativeUntil } from '@/utils/format'
import { MOTION, prefersReducedMotion } from '@/utils/motion'
import { celebrate } from '@/utils/celebrate'
import { useOnChange } from '@/hooks/useOnChange'
import RollingNumber from '@/components/ui/RollingNumber'
import PendingSpot from './PendingSpot'
import './series.css'

/** Where on the button the tap landed: the chosen colour fills out from there. */
const tapPoint = (e: React.MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  // Keyboard "clicks" have no position: start from the centre
  return e.clientX || e.clientY ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: r.width / 2, y: r.height / 2 }
}

/** Status of a Stammspiel game as one short line. */
export function decisionLabel(e: SportEvent) {
  if (e.status === 'cancelled' || e.decision === 'off') return 'Fällt aus'
  if (e.status === 'completed') return 'Vorbei'
  if (e.decision === 'on') return 'Findet statt'
  return 'Offen'
}

/**
 * Attendance against the minimum: one segment per spot, a marker where the
 * game becomes "on". The marker fills once when the minimum is reached.
 */
export function AttendanceMeter({ event }: { event: SportEvent }) {
  const taken = event.counts?.in ?? event.participantCount
  const max = event.maxParticipants
  const min = Math.min(event.minPlayers ?? 0, max)
  const reached = min > 0 && taken >= min
  const wasReached = useRef(reached)
  const [pop, setPop] = useState(false)
  useLayoutEffect(() => {
    if (reached && !wasReached.current) setPop(true)
    wasReached.current = reached
  }, [reached])

  return (
    <div className={`att-meter${reached ? ' is-reached' : ''}`}>
      <div
        className="att-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={taken}
        aria-valuetext={`${taken} von ${max} dabei, ab ${min} findet es statt`}
        aria-label="Zusagen"
        style={{ ['--att-fill' as string]: String(Math.min(1, taken / max)), ['--att-min' as string]: `${(min / max) * 100}%` }}
      >
        <span className="att-fill" />
        {min > 0 && <span className={`att-min${pop ? ' is-pop' : ''}`} onAnimationEnd={() => setPop(false)} />}
      </div>
      <p className="att-label">
        <strong className="num">
          <RollingNumber value={taken} />
        </strong>{' '}
        dabei
        {min > 0 && (
          <span>
            {' · '}
            {reached ? 'Minimum erreicht' : `ab ${min} findet's statt`}
          </span>
        )}
        <span className="att-max num"> / {max}</span>
      </p>
    </div>
  )
}

function Chip({ name, me, index = 0 }: { name: string; me?: boolean; index?: number }) {
  return (
    <li className={`roster-chip${me ? ' is-me' : ''}`} data-me={me ? '' : undefined} style={{ ['--i' as string]: Math.min(index, 8) }}>
      <Avatar name={name} size="sm" /> {me ? 'Du' : name}
    </li>
  )
}

/**
 * "Bist du dabei?" for one Stammspiel game: status, attendance against the
 * minimum, the two answers, and (for members) who said what. Answering moves
 * your own chip into its new row, which is the confirmation.
 */
export default function AnswerCard({
  event,
  onChange,
  onNeedLogin,
  viewerId,
  compact = false,
}: {
  event: SportEvent
  onChange: (e: SportEvent) => void
  onNeedLogin?: () => void
  viewerId?: string
  compact?: boolean
}) {
  const [busy, setBusy] = useState<'in' | 'out' | null>(null)
  const [error, setError] = useState('')
  const [justAnswered, setJustAnswered] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const lastRect = useRef<DOMRect | null>(null)

  const active = (event.status === 'open' || event.status === 'full') && event.decision !== 'off'
  const label = decisionLabel(event)
  const tone = label === 'Findet statt' ? 'on' : label === 'Fällt aus' ? 'off' : label === 'Vorbei' ? 'past' : 'open'
  const deadlinePassed = !!event.deadlineAt && new Date(event.deadlineAt) < new Date()
  const my = event.myAnswer ?? null
  // Celebrations play when the decision or answer changes here, never on reload.
  const decidedNow = useOnChange(tone, MOTION.dur8)
  const ribbonRef = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => {
    if (decidedNow && tone === 'on') celebrate(ribbonRef.current, { count: 10 })
  }, [decidedNow, tone])
  const [tap, setTap] = useState<{ x: number; y: number } | null>(null)

  // FLIP: your chip glides from its old row into the new one.
  useLayoutEffect(() => {
    const el = rootRef.current?.querySelector<HTMLElement>('[data-me]')
    const from = lastRect.current
    lastRect.current = null
    if (!el || !from || prefersReducedMotion() || typeof el.animate !== 'function') return
    const to = el.getBoundingClientRect()
    const dx = from.left - to.left
    const dy = from.top - to.top
    if (!dx && !dy) return
    const spring = getComputedStyle(document.documentElement).getPropertyValue('--ease-spring').trim()
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
      duration: MOTION.dur4,
      easing: spring || 'ease-out',
    })
  }, [my])

  const answer = async (a: 'in' | 'out') => {
    if (!viewerId) {
      onNeedLogin?.()
      return
    }
    if (busy) return
    lastRect.current = rootRef.current?.querySelector<HTMLElement>('[data-me]')?.getBoundingClientRect() ?? null
    setBusy(a)
    setError('')
    try {
      onChange(await answerEvent(event._id, a))
      setJustAnswered(true)
    } catch (err) {
      setError(apiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  const roster = event.roster
  const tapStyle = tap ? ({ ['--tap-x' as string]: `${tap.x}px`, ['--tap-y' as string]: `${tap.y}px` } as React.CSSProperties) : undefined
  const inPeople = event.participants || []

  return (
    <div ref={rootRef} className={`answer-card answer-card--${tone}${compact ? ' is-compact' : ''}${decidedNow && tone === 'on' ? ' is-floodlit' : ''}`}>
      <p ref={ribbonRef} className={`decision-ribbon decision-ribbon--${tone}${decidedNow ? ' is-new' : ''}`} key={tone}>
        {tone === 'on' ? <Check size={16} aria-hidden="true" /> : tone === 'off' ? <X size={16} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}
        <strong>{label}</strong>
        {tone === 'open' && event.deadlineAt && (
          <span>
            · Antworten bis {formatShortWhen(event.deadlineAt, event.timezone)} ({relativeUntil(event.deadlineAt)})
          </span>
        )}
        {tone === 'off' && event.cancelledReason && <span>· {event.cancelledReason}</span>}
      </p>

      {event.weather && active && (
        <p className={`weather-line${event.weather.severe ? ' is-severe' : ''}`}>
          {event.weather.severe && <CloudLightning size={16} aria-hidden="true" />}
          Wetter: {event.weather.summary}
        </p>
      )}

      <AttendanceMeter event={event} />

      {event.myPendingPromotion && active && <PendingSpot event={event} onChange={onChange} />}

      {active && !event.myPendingPromotion && (
        <>
          <div className="answer-buttons" role="group" aria-label="Bist du dabei?">
            <button
              type="button"
              className={`btn btn-lg answer-btn answer-btn--in${my === 'in' || my === 'waiting' ? ' is-chosen' : ''}${justAnswered && (my === 'in' || my === 'waiting') ? ' just-chosen' : ''}`}
              aria-pressed={my === 'in' || my === 'waiting'}
              disabled={!!busy}
              style={tapStyle}
              onClick={(e) => {
                setTap(tapPoint(e))
                answer('in')
              }}
            >
              <Check size={18} aria-hidden="true" /> {busy === 'in' ? 'Speichern …' : 'Ich bin dabei'}
            </button>
            <button
              type="button"
              className={`btn btn-lg answer-btn answer-btn--out${my === 'out' ? ' is-chosen' : ''}${justAnswered && my === 'out' ? ' just-chosen' : ''}`}
              aria-pressed={my === 'out'}
              disabled={!!busy}
              style={tapStyle}
              onClick={(e) => {
                setTap(tapPoint(e))
                answer('out')
              }}
            >
              <X size={18} aria-hidden="true" /> {busy === 'out' ? 'Speichern …' : 'Diesmal nicht'}
            </button>
          </div>
          <p className="answer-note" role="status" aria-live="polite">
            {my === 'waiting' && (
              <>
                <Hourglass size={14} aria-hidden="true" /> Du stehst auf der Warteliste (Platz {event.waitlistPosition}). Wird ein Platz frei,
                rückst du automatisch nach.
              </>
            )}
            {my === 'in' && justAnswered && tone === 'open' && event.deadlineAt && (
              <>Super! Wir sagen dir {formatShortWhen(event.deadlineAt, event.timezone)} Bescheid, ob's stattfindet.</>
            )}
            {my === 'in' && justAnswered && tone === 'on' && <>Super, bis gleich!</>}
            {my === 'out' && justAnswered && <>Danke fürs Bescheidsagen.</>}
            {!viewerId && <>Antworten geht nach der Anmeldung – einmal, dann für jede Woche.</>}
            {viewerId && !my && deadlinePassed && <>Die Frist ist vorbei, aber Plätze sind noch frei.</>}
            {viewerId && my === 'in' && deadlinePassed && !justAnswered && <>Kurz vor dem Spiel: bitte nur absagen, wenn's wirklich nicht geht.</>}
          </p>
          {error && (
            <p className="notice notice-danger" role="alert">
              {error}
            </p>
          )}
        </>
      )}

      {!compact && (roster || inPeople.length > 0) && (
        <div className="roster">
          <RosterRow title="Dabei" people={inPeople} viewerId={viewerId} />
          {roster && <RosterRow title="Warteliste" people={roster.waiting} viewerId={viewerId} />}
          {roster && <RosterRow title="Diesmal nicht" people={roster.out} viewerId={viewerId} muted />}
          {roster && <RosterRow title="Noch keine Antwort" people={roster.noAnswer} viewerId={viewerId} muted />}
        </div>
      )}
      {!compact && !roster && event.counts && (event.counts.waiting > 0 || (event.counts.noAnswer ?? 0) > 0) && (
        <p className="hint">
          {event.counts.waiting > 0 && `${event.counts.waiting} auf der Warteliste. `}
          {(event.counts.noAnswer ?? 0) > 0 && `${event.counts.noAnswer} haben noch nicht geantwortet.`}
        </p>
      )}
    </div>
  )
}

function RosterRow({ title, people, viewerId, muted }: { title: string; people: { _id: string | null; displayName: string }[]; viewerId?: string; muted?: boolean }) {
  if (!people.length) return null
  return (
    <section className={`roster-row${muted ? ' is-muted' : ''}`} aria-label={`${title}: ${people.length}`}>
      <h3>
        {title} <span className="num">{people.length}</span>
      </h3>
      <ul>
        {people.map((p, i) => (
          <Chip key={p._id || p.displayName} name={p.displayName} me={!!viewerId && p._id === viewerId} index={i} />
        ))}
      </ul>
    </section>
  )
}
