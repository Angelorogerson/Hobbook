import { useEffect, useState } from 'react'
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
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { getEvent, joinEvent, leaveEvent, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import { useAuthContext } from '@/store/AuthContext'
import EventMap from '@/components/map/EventMap'
import StatusBadge from '@/components/events/StatusBadge'
import CancelEventDialog from '@/components/events/CancelEventDialog'
import ReportDialog from '@/components/events/ReportDialog'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { levelLabel, sportColor, sportLabel } from '@/constants/sports'
import SportIcon from '@/components/ui/SportIcon'
import { CapacityMeter, DateTile, EmptyState } from '@/components/ui/DataPieces'
import { downloadIcs, formatEventDate, formatLongDate, formatDateTime, osmLink } from '@/utils/format'
import './EventDetailPage.css'

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
  const canManage = event.isOrganizer || authState.user?.role === 'admin'
  const changedSinceJoin = event.joined && !event.isOrganizer && event.changedAt

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text: `${event.title} – ${day}, ${time}`, url })
      } else {
        await navigator.clipboard.writeText(url)
        setFeedback('Link kopiert')
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
                {event.visibility === 'unlisted' && <span className="badge badge-neutral">Nur per Link</span>}
              </div>
              <h1 className="page-title">{event.title}</h1>
              <p className="event-detail-organizer">Organisiert von {event.organizer.displayName}</p>
            </div>
          </header>

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
                  <>
                    <br />
                    <a href={osmLink(event.location.lat!, event.location.lng!)} target="_blank" rel="noreferrer">
                      In OpenStreetMap öffnen <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </>
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
            <div>
              <dt>
                <Signal size={18} aria-hidden="true" /> Niveau
              </dt>
              <dd>{levelLabel(event.level)}</dd>
            </div>
          </dl>

          {event.description && (
            <section className="event-description">
              <h2>Beschreibung</h2>
              <p>{event.description}</p>
            </section>
          )}

          {event.participants && (
            <section className="event-participants">
              <h2>Wer ist dabei</h2>
              <ul>
                {event.participants.map((p) => (
                  <li key={p._id || p.displayName}>{p.displayName}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="event-detail-side">
          <div className="card event-action-card">
            <CapacityMeter taken={event.participantCount} max={event.maxParticipants} status={event.status} />
            {feedback && (
              <p className="notice notice-success" role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                {feedback}
              </p>
            )}
            {actionError && (
              <p className="notice notice-danger" role="alert">
                <AlertTriangle size={18} aria-hidden="true" />
                {actionError}
              </p>
            )}

            {isActive && !event.isOrganizer && !event.joined && (
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={busy || event.status === 'full'}
                onClick={() =>
                  authState.isLoggedIn ? run(() => joinEvent(event._id), 'Du bist dabei!') : requireLogin('join')
                }
              >
                {event.status === 'full' ? 'Event ist voll' : busy ? 'Wird gespeichert …' : authState.isLoggedIn ? 'Mitmachen' : 'Anmelden & mitmachen'}
              </button>
            )}
            {isActive && event.joined && !event.isOrganizer && (
              <>
                <p className="joined-note">Du bist angemeldet.</p>
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

            <div className="secondary-actions">
              {isActive && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadIcs(event)}>
                  <CalendarPlus size={16} aria-hidden="true" /> In Kalender
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={share}>
                <Share2 size={16} aria-hidden="true" /> Teilen
              </button>
              {!event.isOrganizer && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => (authState.isLoggedIn ? setDialog('report') : requireLogin('report'))}
                >
                  <Flag size={16} aria-hidden="true" /> Melden
                </button>
              )}
            </div>
          </div>

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
      {dialog === 'report' && <ReportDialog eventId={event._id} onClose={() => setDialog(null)} />}
    </div>
  )
}
