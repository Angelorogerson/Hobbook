import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarDays, MapPin, Printer, Signal } from 'lucide-react'
import qrcode from 'qrcode-generator'
import { getEvent } from '@/api/eventApi'
import { getGroup, inviteUrl, rhythmText } from '@/api/groupApi'
import { apiError } from '@/api/axiosInstance'
import { useAuthContext } from '@/store/AuthContext'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/ui/DataPieces'
import { Logo } from '@/components/ui/Brand'
import SportIcon from '@/components/ui/SportIcon'
import { levelLabel, sportLabel } from '@/constants/sports'
import { formatEventDate, formatLongDate } from '@/utils/format'
import './PosterPage.css'

// /events/:id/aushang and /stammspiel/:key/aushang: one printable A4 page with a QR code,
// for the fence of the court. Rendered outside the normal layout (no navigation).

interface Poster {
  title: string
  sport: string
  /** "Samstag, 21. November 2026" or "Jeden Donnerstag, 19:00 Uhr" */
  when: string
  /** Time of day for a single event ("18:00–20:00 Uhr"). */
  time?: string
  placeName: string
  address: string
  level: string
  /** Where the QR code leads. */
  url: string
  /** App path of the page this poster belongs to. */
  back: string
  /** Screen-only warning (cancelled, over, ended). */
  warning?: string
}

const fullAddress = (loc: { address: string; city: string }) =>
  loc.city && !loc.address.includes(loc.city) ? `${loc.address}, ${loc.city}` : loc.address

async function loadEventPoster(id: string): Promise<Poster> {
  const e = await getEvent(id)
  return {
    title: e.title,
    sport: e.sport,
    when: formatLongDate(e.startAt, e.timezone),
    time: formatEventDate(e.startAt, e.endAt, e.timezone).time,
    placeName: e.location.placeName,
    address: fullAddress(e.location),
    level: e.level,
    url: `${window.location.origin}/events/${e._id}`,
    back: `/events/${e._id}`,
    warning:
      e.status === 'cancelled' ? 'Dieses Event wurde abgesagt.' : e.status === 'completed' ? 'Dieses Event ist bereits vorbei.' : undefined,
  }
}

async function loadGroupPoster(key: string): Promise<Poster> {
  const g = await getGroup(key)
  return {
    title: g.name,
    sport: g.sport,
    when: rhythmText(g),
    placeName: g.location.placeName,
    address: fullAddress(g.location),
    level: g.level,
    // The invite link is only known to members and hosts; everyone else gets the public page.
    url: g.inviteCode ? inviteUrl(g.inviteCode) : `${window.location.origin}/stammspiel/${g._id}`,
    back: `/stammspiel/${g._id}`,
    warning: g.active ? undefined : 'Dieses Stammspiel wurde beendet.',
  }
}

/** QR code drawn as one SVG path (one square per dark module), with the quiet zone scanners need. */
export function QrCode({ value, label }: { value: string; label: string }) {
  const { count, path } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`
      }
    }
    return { count: n, path: d }
  }, [value])
  const quiet = 4
  const size = count + quiet * 2
  return (
    <svg className="poster-qr" role="img" aria-label={label} viewBox={`${-quiet} ${-quiet} ${size} ${size}`} shapeRendering="crispEdges">
      <rect className="poster-qr-paper" x={-quiet} y={-quiet} width={size} height={size} />
      <path className="poster-qr-ink" d={path} />
    </svg>
  )
}

export default function PosterPage() {
  const { id, key } = useParams<{ id?: string; key?: string }>()
  const { authState } = useAuthContext()
  const [poster, setPoster] = useState<Poster | null>(null)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)

  useEffect(() => {
    let active = true
    setPoster(null)
    setError(null)
    const load = id ? loadEventPoster(id) : key ? loadGroupPoster(key) : Promise.reject(new Error('missing'))
    load
      .then((p) => active && setPoster(p))
      .catch((err) => active && setError(apiError(err, 'Der Aushang konnte nicht geladen werden.')))
    return () => {
      active = false
    }
    // Reload after sign-in: the invite link of a Stammspiel is only visible to members.
  }, [id, key, authState.isLoggedIn])

  useEffect(() => {
    if (!poster) return
    const previous = document.title
    document.title = `Aushang: ${poster.title}`
    return () => {
      document.title = previous
    }
  }, [poster])

  if (error) {
    const notFound = error.status === 404 || error.status === 403
    return (
      <main id="main" className="page">
        <EmptyState
          icon={<AlertTriangle size={24} aria-hidden="true" />}
          title={notFound ? 'Nicht gefunden' : 'Fehler'}
          action={
            <Link to="/entdecken" className="btn btn-primary">
              Zu den Events
            </Link>
          }
        >
          {notFound ? 'Dieses Event oder Stammspiel gibt es nicht (mehr).' : error.message}
        </EmptyState>
      </main>
    )
  }
  if (!poster) return <LoadingSpinner fullScreen />

  const readableUrl = poster.url.replace(/^https?:\/\//, '')
  // Long titles get smaller type so the page always fits.
  const titleSize = poster.title.length > 48 ? ' poster-title--sm' : poster.title.length > 24 ? ' poster-title--md' : ''

  return (
    <main id="main" className="poster-page">
      <div className="poster-toolbar">
        <Link to={poster.back} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} aria-hidden="true" /> Zurück
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Drucken
        </button>
      </div>
      {poster.warning && (
        <p className="notice notice-warning poster-warning" role="status">
          <AlertTriangle size={18} aria-hidden="true" /> {poster.warning}
        </p>
      )}
      <p className="hint poster-tip">Passt auf eine A4-Seite im Hochformat. Der QR-Code führt direkt zur Seite zum Zusagen.</p>

      <div className="poster-frame">
        <article className="poster-sheet" aria-label={`Aushang: ${poster.title}`}>
          <header className="poster-head">
            <p className="poster-sport">
              <span className="poster-sport-icon">
                <SportIcon sport={poster.sport} size={40} />
              </span>
              {sportLabel(poster.sport)}
            </p>
            <h1 className={`poster-title${titleSize}`}>{poster.title}</h1>
          </header>

          <ul className="poster-facts">
            <li>
              <CalendarDays aria-hidden="true" />
              <div>
                <strong>{poster.when}</strong>
                {poster.time && <span>{poster.time}</span>}
              </div>
            </li>
            <li>
              <MapPin aria-hidden="true" />
              <div>
                <strong>{poster.placeName}</strong>
                <span>{poster.address}</span>
              </div>
            </li>
            {poster.level !== 'all' && (
              <li>
                <Signal aria-hidden="true" />
                <div>
                  <strong>Niveau: {levelLabel(poster.level)}</strong>
                </div>
              </li>
            )}
          </ul>

          <p className="poster-pitch">Kostenlos · Einfach vorbeikommen oder online zusagen</p>

          <div className="poster-scan">
            <div className="poster-qr-wrap">
              <QrCode value={poster.url} label={`QR-Code: ${poster.url}`} />
            </div>
            <p className="poster-scan-caption">Scannen und mitmachen</p>
            <p className="poster-url">{readableUrl}</p>
          </div>

          <footer className="poster-brand">
            <Logo size={28} />
            <span>Hobbook</span>
          </footer>
        </article>
      </div>
    </main>
  )
}
