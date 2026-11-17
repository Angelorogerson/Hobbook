import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { listEvents, type SportEvent } from '@/api/eventApi'
import { sportColor } from '@/constants/sports'
import SportIcon from '@/components/ui/SportIcon'

export const DISCOVER = '/entdecken'

/** Real upcoming public events for the story (never invented). */
export function useLandingEvents() {
  const [events, setEvents] = useState<SportEvent[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const ctrl = new AbortController()
    listEvents({ limit: 6 }, ctrl.signal)
      .then((r) => setEvents(r.events))
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setFailed(true)
          setEvents([])
        }
      })
    return () => ctrl.abort()
  }, [])
  return { events, loading: events === null, failed }
}

/** City search that hands off to Discover with the city filter set. */
export function CitySearch({ id, tone = 'stage' }: { id: string; tone?: 'stage' | 'plain' }) {
  const navigate = useNavigate()
  const [city, setCity] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const c = city.trim()
    navigate(c ? `${DISCOVER}?stadt=${encodeURIComponent(c)}` : DISCOVER)
  }
  return (
    <form className={`city-search city-search--${tone}`} role="search" onSubmit={submit}>
      <label htmlFor={id} className="city-search-label">
        Wo willst du spielen?
      </label>
      <div className="city-search-row">
        <Search size={20} className="city-search-icon" aria-hidden="true" />
        <input
          id={id}
          className="city-search-input"
          type="search"
          placeholder="Stadt, z. B. Köln"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="address-level2"
          enterKeyHint="search"
        />
        <button type="submit" className="city-search-btn" aria-label="Events in dieser Stadt suchen">
          <span>Suchen</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}

/**
 * Night-pitch line art: a full pitch with a basketball key on the right.
 * Purely decorative; strokes draw in once on load (CSS, reduced-motion safe).
 */
export function PitchLines({ className = '' }: { className?: string }) {
  return (
    <svg className={`pitch ${className}`} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <g className="pitch-lines" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke">
        <rect className="pl pl-1" x="60" y="80" width="1480" height="740" rx="6" pathLength={1} />
        <path className="pl pl-2" d="M800 80v740" pathLength={1} />
        <circle className="pl pl-3" cx="800" cy="450" r="120" pathLength={1} />
        <circle className="pl-dot" cx="800" cy="450" r="5" />
        <rect className="pl pl-4" x="60" y="250" width="200" height="400" pathLength={1} />
        <rect className="pl pl-5" x="60" y="360" width="70" height="180" pathLength={1} />
        <path className="pl pl-6" d="M260 380a120 120 0 0 1 0 140" pathLength={1} />
        {/* basketball key + three-point arc on the right half */}
        <rect className="pl pl-7" x="1360" y="370" width="180" height="160" pathLength={1} />
        <path className="pl pl-8" d="M1360 390a60 60 0 0 0 0 120" pathLength={1} />
        <path className="pl pl-9" d="M1540 180a270 270 0 0 0 0 540" pathLength={1} />
      </g>
    </svg>
  )
}

/** A map pin with the sport glyph, coloured like the app's map markers. */
export function Pin({ sport, active = false, style }: { sport: string; active?: boolean; style?: CSSProperties }) {
  return (
    <span
      className={`lp-pin${active ? ' is-active' : ''}`}
      style={{ ...style, ['--pin-color' as string]: sportColor(sport) }}
      aria-hidden="true"
    >
      <SportIcon sport={sport} size={16} />
    </span>
  )
}

/** Project real coordinates into a box (with padding); falls back to a centred layout. */
export function projectPins(events: SportEvent[], w: number, h: number, pad = 0.14) {
  const pts = events.filter((e) => e.location.lat !== null && e.location.lng !== null)
  if (pts.length === 0) return []
  const lats = pts.map((e) => e.location.lat!)
  const lngs = pts.map((e) => e.location.lng!)
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  const spanLat = maxLat - minLat || 1
  const spanLng = maxLng - minLng || 1
  return pts.map((e) => ({
    event: e,
    x: pts.length === 1 ? w / 2 : (pad + ((e.location.lng! - minLng) / spanLng) * (1 - 2 * pad)) * w,
    y: pts.length === 1 ? h / 2 : (pad + ((maxLat - e.location.lat!) / spanLat) * (1 - 2 * pad)) * h,
  }))
}
