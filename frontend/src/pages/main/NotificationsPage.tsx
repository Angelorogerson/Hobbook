import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, CalendarClock, Check, CheckCheck, CloudLightning, Hourglass, Pencil, UserPlus, UserX, X } from 'lucide-react'
import { listNotifications, markNotificationsRead, type AppNotification } from '@/api/loopApi'
import { apiError } from '@/api/axiosInstance'
import { EmptyState, Skeleton } from '@/components/ui/DataPieces'
import './NotificationsPage.css'

const ICONS: Record<string, typeof Bell> = {
  invite: CalendarClock,
  nudge: Bell,
  decision_on: Check,
  decision_off: X,
  reminder: Bell,
  changed: Pencil,
  cancelled: X,
  promoted: Hourglass,
  weather: CloudLightning,
  no_show: UserX,
  joined_group: UserPlus,
}

function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso)
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((start(now) - start(d)) / 86400000)
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Gestern'
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

/** Everything Hobbook told you, newest first, grouped by day. Opening the page marks all as read. */
export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listNotifications()
      .then(({ notifications, unread }) => {
        if (!active) return
        setItems(notifications)
        if (unread > 0) {
          markNotificationsRead()
            .then((n) => window.dispatchEvent(new CustomEvent('hobbook:notifications-read', { detail: n })))
            .catch(() => {})
        }
      })
      .catch((err) => active && setError(apiError(err, 'Benachrichtigungen konnten nicht geladen werden.').message))
    return () => {
      active = false
    }
  }, [])

  const groups: [string, AppNotification[]][] = []
  for (const n of items || []) {
    const label = dayLabel(n.createdAt)
    const last = groups[groups.length - 1]
    if (last && last[0] === label) last[1].push(n)
    else groups.push([label, [n]])
  }

  return (
    <div className="page page--narrow notifications-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Benachrichtigungen</h1>
          <p className="page-subtitle">
            Einladungen, Zu- und Absagen, Änderungen. Per E-Mail kommt nur das Wichtigste – einstellbar im <Link to="/profil#benachrichtigungen">Profil</Link>.
          </p>
        </div>
      </div>

      {error && (
        <p className="notice notice-danger" role="alert">
          <AlertTriangle size={18} aria-hidden="true" /> {error}
        </p>
      )}
      {!items && !error && (
        <div className="notif-skeleton" aria-hidden="true">
          <Skeleton h={56} r={12} />
          <Skeleton h={56} r={12} />
          <Skeleton h={56} r={12} />
        </div>
      )}
      {items && items.length === 0 && (
        <EmptyState icon={<CheckCheck size={24} aria-hidden="true" />} title="Alles ruhig.">
          Wenn du bei einem Stammspiel oder Event dabei bist, erfährst du hier, was sich tut.
        </EmptyState>
      )}
      {groups.map(([label, list]) => (
        <section key={label} className="notif-day" aria-label={label}>
          <h2>{label}</h2>
          <ul>
            {list.map((n, i) => {
              const Icon = ICONS[n.type] || Bell
              const body = (
                <>
                  <span className={`notif-icon notif-icon--${n.type}`}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="notif-text">
                    <strong>{n.title}</strong>
                    {n.body && <span>{n.body}</span>}
                  </span>
                  <time className="notif-time num" dateTime={n.createdAt}>
                    {new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(n.createdAt))}
                  </time>
                  {!n.read && <span className="notif-unread" aria-label="neu" />}
                </>
              )
              return (
                <li key={n._id} className="m-enter" style={{ ['--i' as string]: Math.min(i, 5) }}>
                  {n.link ? (
                    <Link to={n.link} className="notif">
                      {body}
                    </Link>
                  ) : (
                    <div className="notif">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
