import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarPlus, CheckCircle2, Compass, Plus, Pencil, XCircle, Trash2, LogOut } from 'lucide-react'
import { EmptyState } from '@/components/ui/DataPieces'
import { deleteEvent, getMyEvents, leaveEvent, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import EventCard from '@/components/events/EventCard'
import CancelEventDialog from '@/components/events/CancelEventDialog'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import './MyEventsPage.css'

type Tab = 'created' | 'joined'

const isUpcoming = (e: SportEvent) => e.status === 'open' || e.status === 'full'

export default function MyEventsPage() {
  const [tab, setTab] = useState<Tab>('created')
  const [data, setData] = useState<{ created: SportEvent[]; joined: SportEvent[] } | null>(null)
  const [error, setError] = useState('')
  const [message, setMessageState] = useState<{ text: string; tone: 'success' | 'danger' } | null>(null)
  const setMessage = (text: string, tone: 'success' | 'danger' = 'success') => setMessageState(text ? { text, tone } : null)
  const [cancelling, setCancelling] = useState<SportEvent | null>(null)
  const [deleting, setDeleting] = useState<SportEvent | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setError('')
    getMyEvents()
      .then(setData)
      .catch((err) => setError(apiError(err, 'Deine Events konnten nicht geladen werden.').message))
  }, [])

  useEffect(load, [load])

  if (!data && !error) return <LoadingSpinner fullScreen />

  const list = data ? data[tab] : []
  const upcoming = list.filter(isUpcoming)
  const past = list.filter((e) => !isUpcoming(e)).reverse()

  const leave = async (e: SportEvent) => {
    setBusyId(e._id)
    setMessage('')
    try {
      await leaveEvent(e._id)
      setMessage(`Du bist aus „${e.title}“ ausgetreten.`)
      load()
    } catch (err) {
      setMessage(apiError(err).message, 'danger')
    } finally {
      setBusyId(null)
    }
  }

  const renderActions = (e: SportEvent) => {
    if (!isUpcoming(e)) return null
    if (tab === 'created') {
      const others = e.participantCount - 1
      return (
        <div className="my-actions">
          <Link to={`/events/${e._id}/bearbeiten`} className="btn btn-secondary btn-sm">
            <Pencil size={14} aria-hidden="true" /> Bearbeiten
          </Link>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setCancelling(e)}>
            <XCircle size={14} aria-hidden="true" /> Absagen
          </button>
          {others === 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleting(e)}>
              <Trash2 size={14} aria-hidden="true" /> Löschen
            </button>
          )}
        </div>
      )
    }
    return (
      <div className="my-actions">
        <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === e._id} onClick={() => leave(e)}>
          <LogOut size={14} aria-hidden="true" /> Austreten
        </button>
      </div>
    )
  }

  const section = (title: string, events: SportEvent[]) =>
    events.length > 0 && (
      <section className="my-section">
        <h2>{title}</h2>
        <ul className="my-list">
          {events.map((e) => (
            <li key={e._id}>
              <EventCard event={e} />
              {renderActions(e)}
            </li>
          ))}
        </ul>
      </section>
    )

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Meine Events</h1>
          <p className="page-subtitle">Alles, was du organisierst oder wo du mitmachst.</p>
        </div>
        <Link to="/events/neu" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" /> Event erstellen
        </Link>
      </div>

      <div className="tabs" role="tablist" aria-label="Meine Events">
        <button type="button" role="tab" className="tab" aria-selected={tab === 'created'} onClick={() => setTab('created')}>
          Erstellt ({data?.created.length ?? 0})
        </button>
        <button type="button" role="tab" className="tab" aria-selected={tab === 'joined'} onClick={() => setTab('joined')}>
          Dabei ({data?.joined.length ?? 0})
        </button>
      </div>

      {error && (
        <div className="notice notice-danger" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div className="notice-body">
            <p>{error}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              Erneut versuchen
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className={`notice notice-${message.tone}`} role={message.tone === 'danger' ? 'alert' : 'status'}>
          {message.tone === 'danger' ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          {message.text}
        </p>
      )}

      <div role="tabpanel">
        {data && list.length === 0 && (
          tab === 'created' ? (
            <EmptyState
              icon={<CalendarPlus size={24} aria-hidden="true" />}
              title="Du hast noch kein Event erstellt."
              action={
                <Link to="/events/neu" className="btn btn-primary">
                  Erstes Event erstellen
                </Link>
              }
            >
              Leg ein Datum und einen Treffpunkt fest – andere finden dein Event dann in Liste und Karte.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<Compass size={24} aria-hidden="true" />}
              title="Du bist noch bei keinem Event dabei."
              action={
                <Link to="/entdecken" className="btn btn-primary">
                  Events entdecken
                </Link>
              }
            >
              Such dir ein Event in deiner Nähe aus und tippe auf „Mitmachen“.
            </EmptyState>
          )
        )}
        {section('Anstehend', upcoming)}
        {section('Vergangen & abgesagt', past)}
      </div>

      {cancelling && (
        <CancelEventDialog
          event={cancelling}
          onClose={() => setCancelling(null)}
          onCancelled={(e) => {
            setCancelling(null)
            setMessage(`„${e.title}“ wurde abgesagt.`)
            load()
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Event löschen?"
          confirmLabel="Endgültig löschen"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const ev = deleting
            try {
              await deleteEvent(ev._id)
              setMessage(`„${ev.title}“ wurde gelöscht.`)
            } catch (err) {
              setMessage(apiError(err).message, 'danger')
            }
            setDeleting(null)
            load()
          }}
        >
          <p>„{deleting.title}“ wird endgültig gelöscht. Es hat sich noch niemand angemeldet.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
