import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bookmark, CalendarPlus, CheckCircle2, Compass, Plus, Pencil, XCircle, Trash2, LogOut, Repeat, ArrowRight } from 'lucide-react'
import { getMyGroups, rhythmText, type Group } from '@/api/groupApi'
import { formatShortWhen } from '@/utils/format'
import { decisionLabel } from '@/components/series/AnswerCard'
import { EmptyState } from '@/components/ui/DataPieces'
import { deleteEvent, getMyEvents, leaveEvent, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import EventCard from '@/components/events/EventCard'
import CancelEventDialog from '@/components/events/CancelEventDialog'
import DuplicateEventButton from '@/components/events/DuplicateEventButton'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import './MyEventsPage.css'
import { Presence } from '@/hooks/usePresence'
import RollingNumber from '@/components/ui/RollingNumber'

type Tab = 'created' | 'joined' | 'saved'

const TABS: { key: Tab; label: string }[] = [
  { key: 'created', label: 'Erstellt' },
  { key: 'joined', label: 'Dabei' },
  { key: 'saved', label: 'Gemerkt' },
]

const isUpcoming = (e: SportEvent) => e.status === 'open' || e.status === 'full'

export default function MyEventsPage() {
  const [tab, setTab] = useState<Tab>('created')
  // 27 · The selected marker slides to the chosen tab (measured, transform only)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<React.CSSProperties>({ opacity: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      const el = tabsRef.current?.querySelector<HTMLElement>(`#my-tab-${tab}`)
      if (!el) return
      const inset = 12
      setIndicator({ transform: `translateX(${el.offsetLeft + inset}px) scaleX(${Math.max(0, el.offsetWidth - inset * 2) / 100})` })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [tab])
  const [data, setData] = useState<{ created: SportEvent[]; joined: SportEvent[]; saved: SportEvent[] } | null>(null)
  const [error, setError] = useState('')
  const [message, setMessageState] = useState<{ text: string; tone: 'success' | 'danger' } | null>(null)
  const setMessage = (text: string, tone: 'success' | 'danger' = 'success') => setMessageState(text ? { text, tone } : null)
  const [cancelling, setCancelling] = useState<SportEvent | null>(null)
  const [deleting, setDeleting] = useState<SportEvent | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const tabChosen = useRef(false)

  const load = useCallback(() => {
    setError('')
    getMyEvents()
      .then((d) => {
        setData(d)
        // Open on the first tab that has something in it (once).
        if (!tabChosen.current) {
          tabChosen.current = true
          const first = TABS.find((t) => d[t.key].length > 0)
          if (first) setTab(first.key)
        }
      })
      .catch((err) => setError(apiError(err, 'Deine Events konnten nicht geladen werden.').message))
    getMyGroups()
      .then(setGroups)
      .catch(() => {})
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
    // Past or cancelled one-off games: host the same event again (not for Stammspiel games).
    if (tab === 'created' && !isUpcoming(e) && !e.series) {
      return (
        <div className="my-actions">
          <DuplicateEventButton event={e} size="sm" />
        </div>
      )
    }
    if (!isUpcoming(e) || tab === 'saved') return null
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
          <LogOut size={14} aria-hidden="true" /> {e.series ? 'Diesmal nicht' : e.waitlistPosition ? 'Warteliste verlassen' : 'Austreten'}
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
              <EventCard event={e} onSavedChange={load} />
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
          <p className="page-subtitle">Alles, was du organisierst, wo du mitmachst und was du dir gemerkt hast.</p>
        </div>
        <Link to="/events/neu" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" /> Event erstellen
        </Link>
      </div>

      {groups.length > 0 && (
        <section className="my-section my-groups" aria-labelledby="my-groups">
          <h2 id="my-groups">
            <Repeat size={18} aria-hidden="true" /> Stammspiele
          </h2>
          <ul className="my-group-list">
            {groups.map((g) => (
              <li key={g._id}>
                <Link to={`/stammspiel/${g._id}`} className="card card-pad my-group">
                  <span className="my-group-name">{g.name}</span>
                  <span className="hint">
                    {rhythmText(g)} · {g.memberCount} Mitglieder{g.isOrganizer ? ' · du organisierst' : ''}
                  </span>
                  {g.upcoming && (
                    <span className="my-group-next">
                      {formatShortWhen(g.upcoming.startAt, g.upcoming.timezone)}: {decisionLabel(g.upcoming)} · {g.upcoming.counts?.in ?? g.upcoming.participantCount} dabei
                      {g.upcoming.myAnswer === 'in' ? ' · du bist dabei' : g.upcoming.myAnswer === 'out' ? ' · du bist raus' : g.upcoming.myAnswer === 'waiting' ? ' · Warteliste' : ' · du hast noch nicht geantwortet'}
                    </span>
                  )}
                  <ArrowRight size={16} aria-hidden="true" className="my-group-arrow" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div
        ref={tabsRef}
        className="tabs has-indicator"
        role="tablist"
        aria-label="Meine Events"
        onKeyDown={(e) => {
          const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
          if (!step) return
          e.preventDefault()
          const next = TABS[(TABS.findIndex((t) => t.key === tab) + step + TABS.length) % TABS.length].key
          setTab(next)
          document.getElementById(`my-tab-${next}`)?.focus()
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`my-tab-${t.key}`}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === t.key}
            aria-controls="my-panel"
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
          >
            <RollingNumber value={data?.[t.key].length ?? 0} text={`${t.label} (${data?.[t.key].length ?? 0})`} />
          </button>
        ))}
        <span className="tab-indicator" aria-hidden="true" style={indicator} />
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
        <p key={message.text} className={`notice notice-${message.tone}`} role={message.tone === 'danger' ? 'alert' : 'status'}>
          {message.tone === 'danger' ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          {message.text}
        </p>
      )}

      <div key={tab} role="tabpanel" id="my-panel" aria-labelledby={`my-tab-${tab}`} className="m-fade-in">
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
          ) : tab === 'saved' ? (
            <EmptyState
              icon={<Bookmark size={24} aria-hidden="true" />}
              title="Du hast dir noch nichts gemerkt."
              action={
                <Link to="/entdecken" className="btn btn-primary">
                  Events entdecken
                </Link>
              }
            >
              Tippe bei einem Event auf das Lesezeichen, um es dir für später zu merken.
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

      <Presence show={!!cancelling}>
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
      </Presence>
      <Presence show={!!deleting}>
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
      </Presence>
    </div>
  )
}
