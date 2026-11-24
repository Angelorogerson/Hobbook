import type { ReactNode } from 'react'
import RollingNumber from './RollingNumber'
import { useOnChange, usePrevious } from '@/hooks/useOnChange'
import './DataPieces.css'

/** Weekday + big day number + month: the event's date as a scannable tile. */
export function DateTile({ iso, timeZone, size = 'md' }: { iso: string; timeZone?: string; size?: 'md' | 'lg' }) {
  const d = new Date(iso)
  const tz = (() => {
    try {
      if (timeZone) Intl.DateTimeFormat('de-DE', { timeZone })
      return timeZone
    } catch {
      return undefined
    }
  })()
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('de-DE', { ...o, timeZone: tz }).format(d)
  const weekday = part({ weekday: 'short' }).replace('.', '')
  const day = part({ day: 'numeric' })
  const month = part({ month: 'short' }).replace('.', '')
  return (
    <div className={`date-tile date-tile--${size}`} aria-hidden="true">
      <span className="date-tile-wd">{weekday}</span>
      <span className="date-tile-day num">{day}</span>
      <span className="date-tile-mo">{month}</span>
    </div>
  )
}

/**
 * Capacity as data: one segment per spot up to 16, a continuous bar above that.
 * Exposed to assistive tech as a meter with a text value.
 */
export function CapacityMeter({
  taken,
  max,
  status,
  showLabel = true,
}: {
  taken: number
  max: number
  status: 'open' | 'full' | 'cancelled' | 'completed'
  showLabel?: boolean
}) {
  const left = Math.max(0, max - taken)
  const tone = status === 'cancelled' || status === 'completed' ? 'muted' : left === 0 ? 'full' : left <= 2 ? 'low' : 'open'
  const label =
    status === 'cancelled' ? 'Abgesagt' : status === 'completed' ? 'Vorbei' : left === 0 ? 'Voll' : `${left} ${left === 1 ? 'Platz' : 'Plätze'} frei`
  const segments = max <= 16
  // Spots that just filled (or freed) pop; "nur noch 2" lights up once when it starts
  const prevTaken = usePrevious(taken)
  const becameLow = useOnChange(tone === 'low')
  const lo = Math.min(prevTaken, taken)
  const hi = Math.max(prevTaken, taken)
  return (
    <div className={`capacity capacity--${tone}${becameLow && tone === 'low' ? ' is-alert' : ''}`}>
      <div
        className="capacity-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={taken}
        aria-valuetext={`${taken} von ${max} Plätzen belegt`}
        aria-label="Belegung"
      >
        {segments ? (
          Array.from({ length: max }, (_, i) => (
            <span key={i} className={`capacity-seg${i < taken ? ' is-taken' : ''}${i >= lo && i < hi ? ' is-new' : ''}`} />
          ))
        ) : (
          <span className="capacity-fill" style={{ transform: `scaleX(${Math.min(1, taken / max)})` }} />
        )}
      </div>
      {showLabel && (
        <div className="capacity-label">
          <span className="capacity-left">
            <RollingNumber value={left} text={label} />
          </span>
          <span className="capacity-count num">
            <RollingNumber value={taken} text={`${taken}/${max}`} />
          </span>
        </div>
      )}
    </div>
  )
}

export function Skeleton({ w = '100%', h = 16, r }: { w?: string | number; h?: number; r?: number }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />
}

/** Placeholder with the real card's geometry (no layout shift when data arrives). */
export function EventCardSkeleton() {
  return (
    <div className="event-card event-card--skeleton" aria-hidden="true">
      <Skeleton w={56} h={64} r={10} />
      <div className="event-card-body">
        <Skeleton w="40%" h={12} />
        <Skeleton w="80%" h={20} />
        <Skeleton w="60%" h={14} />
        <Skeleton w="100%" h={8} />
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="state">
      {icon && <div className="state-icon">{icon}</div>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
