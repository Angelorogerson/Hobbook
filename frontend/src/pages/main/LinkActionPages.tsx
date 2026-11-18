import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Bell, BellOff, Check, X } from 'lucide-react'
import { answerFromLink, muteFromLink, previewLink } from '@/api/loopApi'
import type { SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { formatEventDate, formatShortWhen } from '@/utils/format'
import './LinkActionPages.css'

/** A check that draws itself once: the answer has arrived. */
function DrawnCheck() {
  return (
    <svg className="drawn-check" viewBox="0 0 52 52" width="64" height="64" aria-hidden="true">
      <circle cx="26" cy="26" r="24" />
      <path d="M15 27 l7 7 l15 -16" />
    </svg>
  )
}

const when = (e: SportEvent) => {
  const { day, time } = formatEventDate(e.startAt, e.endAt, e.timezone)
  return `${day}, ${time}`
}

const answerLabel = (e: SportEvent, a: 'in' | 'out' | null | undefined) =>
  a === 'in' ? (e.waitlistPosition ? `Warteliste (Platz ${e.waitlistPosition})` : 'Du bist dabei') : a === 'out' ? 'Diesmal nicht' : null

/**
 * /antwort/:token — the answer buttons from an email. Opening the page changes
 * nothing (email scanners open links too); only a tap answers.
 */
export function AnswerLinkPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [event, setEvent] = useState<SportEvent | null>(null)
  const [suggested, setSuggested] = useState<'in' | 'out'>('in')
  const [name, setName] = useState('')
  const [done, setDone] = useState<'in' | 'out' | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    previewLink(token)
      .then((r) => {
        setEvent(r.event)
        setSuggested(r.suggested)
        setName(r.name)
      })
      .catch((err) => setError(apiError(err, 'Das hat nicht geklappt.').message))
  }, [token])

  const send = (answer: 'in' | 'out') => {
    setBusy(true)
    setError('')
    answerFromLink(token, answer)
      .then((r) => {
        setEvent(r.event)
        setDone(r.answer)
      })
      .catch((err) => setError(apiError(err, 'Das hat nicht geklappt.').message))
      .finally(() => setBusy(false))
  }

  if (!event && !error) return <LoadingSpinner fullScreen />

  if (!event) {
    return (
      <div className="page page--narrow link-action">
        <div className="card card-pad link-action-card">
          <p className="notice notice-danger" role="alert">
            <AlertTriangle size={18} aria-hidden="true" /> {error}
          </p>
          <Link to="/" className="btn btn-primary">
            Zu Hobbook
          </Link>
        </div>
      </div>
    )
  }

  const current = answerLabel(event, event.myAnswer === 'waiting' ? 'in' : event.myAnswer ?? (event.joined ? 'in' : null))
  const pending = event.myPendingPromotion

  return (
    <div className="page page--narrow link-action">
      <div className="card card-pad link-action-card" key={done ?? 'ask'}>
        {done ? (
          <>
            <DrawnCheck />
            <h1 className="page-title">
              {done === 'in' ? (event.waitlistPosition ? 'Du stehst auf der Warteliste' : 'Du bist dabei!') : 'Alles klar, diesmal nicht.'}
            </h1>
          </>
        ) : (
          <h1 className="page-title">{pending ? 'Ein Platz ist frei – kommst du?' : `${name ? `${name}, bist` : 'Bist'} du dabei?`}</h1>
        )}
        <p className="link-action-event">
          <strong>{event.title}</strong>
          <br />
          {when(event)} · {event.location.placeName}
        </p>
        <p className="hint">
          {event.counts ? `${event.counts.in} von ${event.maxParticipants} dabei` : `${event.participantCount} von ${event.maxParticipants} dabei`}
          {event.minPlayers ? ` · ab ${event.minPlayers} findet's statt` : ''}
          {!done && current ? ` · bisher: ${current}` : ''}
        </p>
        {pending && !done && <p className="notice notice-warning">Bitte bestätige bis {formatShortWhen(pending.confirmBy, event.timezone)}, sonst geht der Platz weiter.</p>}

        {error && (
          <p className="notice notice-danger" role="alert">
            <AlertTriangle size={18} aria-hidden="true" /> {error}
          </p>
        )}

        <div className="link-action-buttons">
          {done ? (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => send(done === 'in' ? 'out' : 'in')}>
              {done === 'in' ? 'Rückgängig – doch nicht' : 'Doch dabei'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`btn btn-lg ${suggested === 'in' ? 'btn-primary' : 'btn-secondary'}`}
                disabled={busy}
                onClick={() => send('in')}
              >
                <Check size={18} aria-hidden="true" /> {pending ? 'Ich komme' : 'Ich bin dabei'}
              </button>
              <button
                type="button"
                className={`btn btn-lg ${suggested === 'out' ? 'btn-ink' : 'btn-secondary'}`}
                disabled={busy}
                onClick={() => send('out')}
              >
                <X size={18} aria-hidden="true" /> {pending ? 'Doch nicht' : 'Diesmal nicht'}
              </button>
            </>
          )}
          <Link to={`/events/${event._id}`} className="btn btn-ghost">
            Zum Termin
          </Link>
        </div>
      </div>
    </div>
  )
}

/** /stumm/:token — mute one Stammspiel from the email footer; opening the page changes nothing. */
export function MuteLinkPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [state, setState] = useState<{ name: string; groupId: string; muted: boolean } | null>(null)
  const [changed, setChanged] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = (muted?: boolean) => {
    setBusy(true)
    return muteFromLink(token, muted)
      .then((r) => {
        setState({ name: r.group.name, groupId: r.group._id, muted: r.muted })
        if (muted !== undefined) setChanged(true)
      })
      .catch((err) => setError(apiError(err, 'Das hat nicht geklappt.').message))
      .finally(() => setBusy(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!state && !error) return <LoadingSpinner fullScreen />
  return (
    <div className="page page--narrow link-action">
      <div className="card card-pad link-action-card">
        {error ? (
          <p className="notice notice-danger" role="alert">
            <AlertTriangle size={18} aria-hidden="true" /> {error}
          </p>
        ) : (
          <>
            {state!.muted ? <BellOff size={40} aria-hidden="true" /> : <Bell size={40} aria-hidden="true" />}
            <h1 className="page-title">
              {changed ? (state!.muted ? 'Stummgeschaltet' : 'Wieder an') : `„${state!.name}“ stummschalten?`}
            </h1>
            <p role="status">
              {state!.muted
                ? `Du bekommst keine E-Mails mehr zu „${state!.name}“. Absagen und Änderungen erfährst du trotzdem.`
                : changed
                  ? `Du bekommst wieder E-Mails zu „${state!.name}“.`
                  : 'Dann bekommst du keine Einladungen und Erinnerungen mehr per E-Mail. Absagen und Änderungen erfährst du trotzdem.'}
            </p>
            <div className="link-action-buttons">
              <button type="button" className={`btn ${state!.muted ? 'btn-secondary' : 'btn-primary'}`} disabled={busy} onClick={() => load(!state!.muted)}>
                {state!.muted ? 'Wieder einschalten' : 'Stummschalten'}
              </button>
              <Link to={`/stammspiel/${state!.groupId}`} className="btn btn-ghost">
                Zum Stammspiel
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
