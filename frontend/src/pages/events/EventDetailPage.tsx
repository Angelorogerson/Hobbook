import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Flag,
  MapPin,
  Pencil,
  Share2,
  Signal,
  Users,
  XCircle,
  ExternalLink,
  Gift,
  Navigation,
  Backpack,
  ShieldCheck,
  Check,
  AlertTriangle,
  CheckCircle2,
  Repeat,
  Hourglass,
  CloudLightning,
  UserX,
} from 'lucide-react'
import {
  getEvent,
  joinEvent,
  leaveEvent,
  joinWaitlist,
  answerEvent,
  decideEvent,
  markNoShows,
  disputeNoShow,
  saveEvent,
  type SportEvent,
} from '@/api/eventApi'
import AnswerCard from '@/components/series/AnswerCard'
import PendingSpot from '@/components/series/PendingSpot'
import { WEEKDAYS_SHORT } from '@/api/groupApi'
import { apiError } from '@/api/axiosInstance'
import { useAuthContext } from '@/store/AuthContext'
import EventMap from '@/components/map/EventMap'
import StatusBadge from '@/components/events/StatusBadge'
import CancelEventDialog from '@/components/events/CancelEventDialog'
import ReportDialog from '@/components/events/ReportDialog'
import DuplicateEventButton from '@/components/events/DuplicateEventButton'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { levelLabel, sportColor, sportLabel } from '@/constants/sports'
import SportIcon from '@/components/ui/SportIcon'
import { CapacityMeter, DateTile, EmptyState } from '@/components/ui/DataPieces'
import { downloadIcs, formatEventDate, formatLongDate, formatDateTime, osmLink, routeLink } from '@/utils/format'
import SaveButton from '@/components/events/SaveButton'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import './EventDetailPage.css'
import { Presence } from '@/hooks/usePresence'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { authState } = useAuthContext()

  const [event, setEvent] = useState<SportEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<{ message: string; status?: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [dialog, setDialog] = useState<'cancel' | 'report' | null>(null)
  const [showAll, setShowAll] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setLoadError(null)
    getEvent(id)
      .then((e) => active && setEvent(e))
      .catch((err) => active && setLoadError(apiError(err, 'Event konnte nicht geladen werden.')))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // Reload when auth changes so joined/organizer flags are correct.
  }, [id, authState.isLoggedIn])

  // Finish what a guest started before signing in (join or report), exactly once.
  const resume = (location.state as { resume?: string } | null)?.resume
  const resumed = useRef(false)
  useEffect(() => {
    if (!resume || resumed.current || !event || !authState.isLoggedIn) return
    resumed.current = true
    navigate(location.pathname, { replace: true, state: null })
    if (resume === 'report') {
      if (!event.isOrganizer) setDialog('report')
      return
    }
    if (resume === 'save') {
      if (!event.saved && !event.isOrganizer) {
        saveEvent(event._id)
          .then(() => {
            setEvent({ ...event, saved: true })
            toast('Gemerkt')
          })
          .catch(() => {})
      }
      return
    }
    if (event.joined || event.isOrganizer || event.waitlistPosition) return
    if (event.status !== 'open' && event.status !== 'full') return
    // A full single event: the visitor asked for the waiting list.
    const queue = event.status === 'full' && !event.series
    setBusy(true)
    ;(event.series ? answerEvent(event._id, 'in') : queue ? joinWaitlist(event._id) : joinEvent(event._id))
      .then((e) => {
        setEvent(e)
        setFeedback(e.joined ? 'Du bist dabei!' : e.waitlistPosition ? 'Du bist auf der Warteliste.' : '')
      })
      .catch((err) => setActionError(apiError(err).message))
      .finally(() => setBusy(false))
  }, [resume, event, authState.isLoggedIn, navigate, location.pathname, toast])

  const arrival = (location.state as { created?: boolean; updated?: boolean } | null) || {}

  if (loading) return <LoadingSpinner fullScreen />

  if (loadError || !event) {
    const notFound = loadError?.status === 404
    return (
      <div className="page">
        <EmptyState
          icon={<AlertTriangle size={24} aria-hidden="true" />}
          title={notFound ? 'Event nicht gefunden' : 'Fehler'}
          action={
            <Link to="/entdecken" className="btn btn-primary">
              Andere Events entdecken
            </Link>
          }
        >
          {notFound ? 'Dieses Event existiert nicht oder wurde gelöscht.' : loadError?.message}
        </EmptyState>
      </div>
    )
  }

  const requireLogin = (intent: string) => {
    navigate('/login', { state: { from: location.pathname, intent } })
  }

  const run = async (fn: () => Promise<SportEvent>, success: string) => {
    setBusy(true)
    setActionError('')
    setFeedback('')
    try {
      // Only show the new state once the server confirmed it.
      setEvent(await fn())
      setFeedback(success)
    } catch (err) {
      const info = apiError(err)
      setActionError(info.message)
      // Refresh to show the true state (e.g. it just became full).
      getEvent(event._id).then(setEvent).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  const { day, time } = formatEventDate(event.startAt, event.endAt, event.timezone)
  const hasCoords = event.location.lat !== null && event.location.lng !== null
  const isActive = event.status === 'open' || event.status === 'full'
  const canManage = event.isHost ?? (event.isOrganizer || authState.user?.role === 'admin')
  const isSeries = !!event.series
  const onWaitlist = !!event.waitlistPosition
  const changedSinceJoin = event.joined && !event.isOrganizer && event.changedAt

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text: `${event.title} – ${day}, ${time}`, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast('Link kopiert')
      }
    } catch {
      /* user dismissed share sheet */
    }
  }

  return (
    <div className="page event-detail" style={{ ['--sport-color' as string]: sportColor(event.sport) }}>
      <button type="button" className="btn btn-ghost btn-sm back-link" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/entdecken'))}>
        <ArrowLeft size={16} aria-hidden="true" /> Zurück
      </button>

      <div className="event-detail-grid">
        <div>
          <header className="event-detail-head">
            <DateTile iso={event.startAt} timeZone={event.timezone} size="lg" />
            <div>
              <div className="event-detail-tags">
                <span className="event-detail-sport">
                  <SportIcon sport={event.sport} size={16} /> {sportLabel(event.sport)}
                </span>
                <StatusBadge status={event.status} />
                {event.series && (
                  <Link to={`/stammspiel/${event.series._id}`} className="series-badge">
                    <Repeat size={12} aria-hidden="true" /> Stammspiel
                    {event.series.weekday ? ` · jeden ${WEEKDAYS_SHORT[event.series.weekday]}.` : ''}
                  </Link>
                )}
                {event.visibility === 'unlisted' && <span className="badge badge-neutral">Nur per Link</span>}
              </div>
              <h1 className="page-title">{event.title}</h1>
              <p className="event-detail-organizer">
                <Avatar name={event.organizer.displayName} size="sm" />
                <span>
                  Organisiert von{' '}
                  {event.organizer._id ? (
                    <Link to={`/leute/${event.organizer._id}`} className="person-link">
                      <strong>{event.organizer.displayName}</strong>
                    </Link>
                  ) : (
                    <strong>{event.organizer.displayName}</strong>
                  )}
                  {(event.organizer.memberSince || event.organizer.eventsHosted) && (
                    <span className="event-detail-organizer-meta">
                      {event.organizer.memberSince ? ` · dabei seit ${event.organizer.memberSince}` : ''}
                      {event.organizer.eventsHosted
                        ? ` · ${event.organizer.eventsHosted} ${event.organizer.eventsHosted === 1 ? 'Event' : 'Events'} organisiert`
                        : ''}
                    </span>
                  )}
                </span>
              </p>
            </div>
          </header>

          {arrival.created && isActive && (
            <div className="notice notice-success event-live" role="status">
              <CheckCircle2 size={20} aria-hidden="true" />
              <div className="notice-body">
                <p>
                  <strong>Dein Event ist live.</strong> Teile den Link, damit Leute mitmachen.
                </p>
                <button type="button" className="btn btn-ink btn-sm" onClick={share}>
                  <Share2 size={14} aria-hidden="true" /> Event teilen
                </button>
              </div>
            </div>
          )}
          {arrival.updated && (
            <p className="notice notice-success" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              Änderungen gespeichert.
            </p>
          )}
          {event.status === 'cancelled' && (
            <div className="notice notice-danger" role="status">
              <XCircle size={20} aria-hidden="true" />
              <div>
                <strong>Dieses Event wurde abgesagt.</strong>
                {event.cancelledReason && <p>Grund: {event.cancelledReason}</p>}
              </div>
            </div>
          )}
          {event.status === 'completed' && (
            <div className="notice" role="status">
              <CalendarDays size={18} aria-hidden="true" />
              Dieses Event ist bereits vorbei.
            </div>
          )}
          {changedSinceJoin && isActive && (
            <div className="notice notice-warning" role="status">
              <AlertTriangle size={20} aria-hidden="true" />
              <div>
                <strong>Termin oder Ort wurde geändert</strong> (am {formatDateTime(event.changedAt!)}). Bitte prüfe die
                Angaben unten.
              </div>
            </div>
          )}

          {event.myNoShow && (
            <div className="notice notice-warning" role="status">
              <UserX size={20} aria-hidden="true" />
              <div className="notice-body">
                {event.myNoShow.disputed ? (
                  <p>Du hast widersprochen. Der Eintrag zählt nicht.</p>
                ) : (
                  <>
                    <p>
                      <strong>Du wurdest als nicht erschienen eingetragen.</strong> Stimmt das nicht? Du kannst innerhalb von 24 Stunden
                      widersprechen.
                    </p>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => run(() => disputeNoShow(event._id), 'Widerspruch gespeichert.')}>
                      Widersprechen
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {canManage && isActive && event.weather?.severe && (
            <div className="notice notice-warning" role="status">
              <CloudLightning size={20} aria-hidden="true" />
              <div className="notice-body">
                <p>
                  <strong>Wetterwarnung:</strong> {event.weather.summary}. Du entscheidest – Hobbook sagt nie von selbst ab.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => run(() => decideEvent(event._id, 'off', `Wetter: ${event.weather!.summary}`), 'Abgesagt. Alle wurden benachrichtigt.')}
                >
                  Wegen Wetter absagen
                </button>
              </div>
            </div>
          )}

          <dl className="event-facts">
            <div>
              <dt>
                <CalendarDays size={18} aria-hidden="true" /> Wann
              </dt>
              <dd>
                {formatLongDate(event.startAt, event.timezone)}
                <br />
                {time}
                <span className="sr-only"> ({day})</span>
              </dd>
            </div>
            <div>
              <dt>
                <MapPin size={18} aria-hidden="true" /> Wo
              </dt>
              <dd>
                <strong>{event.location.placeName}</strong>
                <br />
                {event.location.address}
                {event.location.city && !event.location.address.includes(event.location.city) ? `, ${event.location.city}` : ''}
                {hasCoords && (
                  <span className="event-facts-links">
                    <a
                      href={routeLink(event.location.lat!, event.location.lng!)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      <Navigation size={14} aria-hidden="true" /> Route
                    </a>
                    <a href={osmLink(event.location.lat!, event.location.lng!)} target="_blank" rel="noreferrer">
                      In OpenStreetMap öffnen <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>
                <Users size={18} aria-hidden="true" /> Teilnehmende
              </dt>
              <dd>
                {event.participantCount} von {event.maxParticipants}
                {isActive && ` · ${event.spotsLeft === 0 ? 'keine Plätze frei' : `${event.spotsLeft} ${event.spotsLeft === 1 ? 'Platz' : 'Plätze'} frei`}`}
              </dd>
            </div>
            {event.weather && (
              <div>
                <dt>
                  <CloudLightning size={18} aria-hidden="true" /> Wetter
                </dt>
                <dd>{event.weather.summary}</dd>
              </div>
            )}
            <div>
              <dt>
                <Signal size={18} aria-hidden="true" /> Niveau
              </dt>
              <dd>{levelLabel(event.level)}</dd>
            </div>
            <div>
              <dt>
                <Gift size={18} aria-hidden="true" /> Kosten
              </dt>
              <dd>Kostenlos</dd>
            </div>
            {event.bring && (
              <div>
                <dt>
                  <Backpack size={18} aria-hidden="true" /> Mitbringen
                </dt>
                <dd>{event.bring}</dd>
              </div>
            )}
          </dl>

          {event.description && (
            <section className="event-description">
              <h2>Beschreibung</h2>
              <p className={event.description.length > 420 && !showAll ? 'is-clamped' : undefined}>{event.description}</p>
              {event.description.length > 420 && (
                <button type="button" className="btn btn-ghost btn-sm" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                </button>
              )}
            </section>
          )}

          {event.canMarkNoShows && event.participants && <NoShowForm event={event} onSaved={setEvent} viewerId={authState.user?._id} />}

          {event.participants && !isSeries && (
            <section className="event-participants">
              <h2>Wer ist dabei</h2>
              <ul>
                {event.participants.map((p) => (
                  <li key={p._id || p.displayName}>
                    <Avatar name={p.displayName} size="sm" /> {p.displayName}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="event-detail-side">
          <div className="card event-action-card">
            {isSeries ? (
              <AnswerCard
                event={event}
                onChange={setEvent}
                viewerId={authState.user?._id}
                onNeedLogin={() => requireLogin('join')}
              />
            ) : (
              <CapacityMeter taken={event.participantCount} max={event.maxParticipants} status={event.status} />
            )}
            {feedback && (
              <p key={feedback} className="notice notice-success" role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                {feedback}
              </p>
            )}
            {actionError && (
              <p key={actionError} className="notice notice-danger" role="alert">
                <AlertTriangle size={18} aria-hidden="true" />
                {actionError}
              </p>
            )}

            {isSeries && canManage && isActive && event.decision === 'open' && (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                disabled={busy}
                onClick={() => run(() => decideEvent(event._id, 'on'), 'Bestätigt. Alle, die dabei sind, wissen Bescheid.')}
              >
                <CheckCircle2 size={16} aria-hidden="true" /> Jetzt bestätigen
              </button>
            )}
            {!isSeries && isActive && event.myPendingPromotion && <PendingSpot event={event} onChange={setEvent} />}
            {!isSeries && isActive && !event.isOrganizer && onWaitlist && (
              <>
                <p className="joined-note">
                  <Hourglass size={18} aria-hidden="true" /> Du bist auf der Warteliste (Platz {event.waitlistPosition}).
                </p>
                <p className="hint">Wird ein Platz frei, rückst du automatisch nach und bekommst Bescheid.</p>
                <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => run(() => leaveEvent(event._id), 'Du bist nicht mehr auf der Warteliste.')}>
                  Warteliste verlassen
                </button>
              </>
            )}
            {!isSeries && isActive && !event.isOrganizer && !event.joined && !onWaitlist && (
              <div className="join-bar">
                <p className="join-bar-info" aria-hidden="true">
                  <strong>{event.spotsLeft === 0 ? 'Voll' : `${event.spotsLeft} ${event.spotsLeft === 1 ? 'Platz' : 'Plätze'} frei`}</strong>
                  <span>Kostenlos</span>
                </p>
              <button
                type="button"
                className={`btn btn-block ${event.status === 'full' ? 'btn-secondary' : 'btn-primary'}`}
                disabled={busy}
                onClick={() =>
                  !authState.isLoggedIn
                    ? requireLogin('join')
                    : event.status === 'full'
                      ? run(() => joinWaitlist(event._id), 'Du bist auf der Warteliste.')
                      : run(() => joinEvent(event._id), 'Du bist dabei!')
                }
              >
                {busy
                  ? 'Wird gespeichert …'
                  : event.status === 'full'
                    ? `Auf die Warteliste${event.waitlistCount ? ` (${event.waitlistCount} warten)` : ''}`
                    : authState.isLoggedIn
                      ? 'Mitmachen'
                      : 'Anmelden & mitmachen'}
              </button>
              </div>
            )}
            {!isSeries && isActive && event.joined && !event.isOrganizer && !event.myPendingPromotion && (
              <>
                <p className={`joined-note${feedback === 'Du bist dabei!' ? ' just-joined' : ''}`}>
                  <Check size={18} aria-hidden="true" /> Du bist angemeldet.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  disabled={busy}
                  onClick={() => run(() => leaveEvent(event._id), 'Du bist ausgetreten. Dein Platz ist wieder frei.')}
                >
                  {busy ? 'Wird gespeichert …' : 'Doch nicht dabei – austreten'}
                </button>
              </>
            )}
            {canManage && isActive && (
              <div className="manage-actions">
                <Link to={`/events/${event._id}/bearbeiten`} className="btn btn-secondary btn-block">
                  <Pencil size={16} aria-hidden="true" /> Bearbeiten
                </Link>
                <button type="button" className="btn btn-danger btn-block" onClick={() => setDialog('cancel')}>
                  <XCircle size={16} aria-hidden="true" /> Absagen
                </button>
              </div>
            )}
            {canManage && !isSeries && <DuplicateEventButton event={event} />}

            <div className="secondary-actions">
              {!event.isOrganizer && <SaveButton event={event} variant="label" onChange={(saved) => setEvent({ ...event, saved })} />}
              <button type="button" className="btn btn-ghost btn-sm" onClick={share}>
                <Share2 size={16} aria-hidden="true" /> Teilen
              </button>
              {isActive && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadIcs(event)}>
                  <CalendarPlus size={16} aria-hidden="true" /> In Kalender
                </button>
              )}
            </div>
          </div>

          {!event.isOrganizer && (
            <p className="event-trust">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>
                Triff dich an öffentlichen Orten. <Link to="/regeln">Community-Regeln</Link>
                {' · '}
                <button type="button" className="link-btn" onClick={() => (authState.isLoggedIn ? setDialog('report') : requireLogin('report'))}>
                  <Flag size={14} aria-hidden="true" /> Event melden
                </button>
              </span>
            </p>
          )}

          {hasCoords ? (
            <EventMap events={[event]} selectedId={event._id} compact fitKey={event._id} label={`Karte: ${event.location.placeName}`} />
          ) : (
            <p className="notice">
              <MapPin size={18} aria-hidden="true" />
              Für dieses Event ist keine genaue Kartenposition hinterlegt.
            </p>
          )}
        </aside>
      </div>

      <Presence show={dialog === 'cancel'}>
        {dialog === 'cancel' && (
          <CancelEventDialog
            event={event}
            onClose={() => setDialog(null)}
            onCancelled={(e) => {
              setEvent(e)
              setDialog(null)
              setFeedback('Das Event wurde abgesagt.')
            }}
          />
        )}
      </Presence>
      <Presence show={dialog === 'report'}>
        {dialog === 'report' && <ReportDialog eventId={event._id} onClose={() => setDialog(null)} />}
      </Presence>
    </div>
  )
}

/** After the game, hosts note who didn't come (24 h window; the person can dispute). */
function NoShowForm({ event, onSaved, viewerId }: { event: SportEvent; onSaved: (e: SportEvent) => void; viewerId?: string }) {
  const [marked, setMarked] = useState<string[]>(() => (event.noShows || []).map((n) => n._id))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState('')
  const people = (event.participants || []).filter((p) => p._id && p._id !== viewerId)
  if (!people.length) return null
  const toggle = (id: string) => setMarked((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
  const save = async () => {
    setSaving(true)
    setDone('')
    try {
      onSaved(await markNoShows(event._id, marked))
      setDone('Gespeichert. Markierte bekommen Bescheid und können widersprechen.')
    } catch (err) {
      setDone(apiError(err).message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <section className="event-participants card card-pad no-show-form">
      <h2>Wer war nicht da?</h2>
      <p className="hint">Nur wer zugesagt hatte und nicht kam. Bis 24 Stunden nach dem Spiel; die Person kann widersprechen.</p>
      <ul className="check-list">
        {people.map((p) => (
          <li key={p._id}>
            <label className="check-row">
              <input type="checkbox" checked={marked.includes(p._id!)} onChange={() => toggle(p._id!)} />
              <Avatar name={p.displayName} size="sm" /> {p.displayName}
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-secondary" disabled={saving} onClick={save}>
        {saving ? 'Speichern …' : 'Speichern'}
      </button>
      {done && (
        <p className="hint" role="status">
          {done}
        </p>
      )}
    </section>
  )
}
