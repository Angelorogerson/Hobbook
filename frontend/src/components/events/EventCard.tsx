import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin, Crosshair, Repeat } from 'lucide-react'
import { WEEKDAYS_SHORT } from '@/api/groupApi'
import type { SportEvent } from '@/api/eventApi'
import { sportLabel, levelLabel } from '@/constants/sports'
import { formatEventDate } from '@/utils/format'
import { formatDistance } from '@/utils/geo'
import SportIcon from '@/components/ui/SportIcon'
import { CapacityMeter, DateTile } from '@/components/ui/DataPieces'
import StatusBadge from './StatusBadge'
import SaveButton from './SaveButton'
import './EventCard.css'
import '@/components/series/series.css'

interface Props {
  event: SportEvent
  selected?: boolean
  /** Distance from the viewer, when their position is known. */
  distanceKm?: number
  onShowOnMap?: (id: string) => void
  /** Called after the viewer bookmarked or un-bookmarked the event. */
  onSavedChange?: (saved: boolean) => void
}

/**
 * Data-forward event card: date tile, sport, title, time/place and a capacity
 * meter. The title link is stretched over the whole card, so a tap anywhere opens the event.
 */
const EventCard = forwardRef<HTMLElement, Props>(function EventCard({ event, selected, distanceKm, onShowOnMap, onSavedChange }, ref) {
  const { time } = formatEventDate(event.startAt, event.endAt, event.timezone)
  const mappable = event.location.lat !== null && event.location.lng !== null

  return (
    <article
      ref={ref}
      className={`event-card${selected ? ' is-selected' : ''}`}
      style={{ ['--sport-color' as string]: `var(--sport-${event.sport}, var(--sport-other))` }}
      aria-current={selected ? 'true' : undefined}
      data-testid="event-card"
    >
      <DateTile iso={event.startAt} timeZone={event.timezone} />
      {!event.isOrganizer && (
        <span className="event-card-save">
          <SaveButton event={event} onChange={onSavedChange} />
        </span>
      )}

      <div className="event-card-body">
        <div className="event-card-top">
          <span className="event-card-sport">
            <SportIcon sport={event.sport} size={16} />
            {sportLabel(event.sport)}
          </span>
          {event.level !== 'all' && <span className="event-card-level">{levelLabel(event.level)}</span>}
          <span className="event-card-flags">
            {event.status !== 'open' && <StatusBadge status={event.status} />}
            {event.series && (
              <span className="series-badge" title="Stammspiel: jede Woche">
                <Repeat size={12} aria-hidden="true" /> {event.series.weekday ? `jeden ${WEEKDAYS_SHORT[event.series.weekday]}.` : 'Stammspiel'}
              </span>
            )}
            {event.joined && !event.isOrganizer && <span className="badge badge-neutral">Du bist dabei</span>}
            {event.waitlistPosition ? <span className="badge badge-full">Warteliste {event.waitlistPosition}</span> : null}
            {event.isOrganizer && <span className="badge badge-neutral">Dein Event</span>}
          </span>
        </div>

        <h3 className="event-card-title">
          <Link to={`/events/${event._id}`}>
            {event.title}
          </Link>
        </h3>

        <ul className="meta">
          <li>
            <Clock size={15} aria-hidden="true" />
            <span className="num">{time}</span>
          </li>
          <li>
            <MapPin size={15} aria-hidden="true" />
            <span>
              {event.location.placeName}
              {event.location.city ? `, ${event.location.city}` : ''}
              {distanceKm !== undefined && <span className="event-card-distance num"> · {formatDistance(distanceKm)}</span>}
            </span>
          </li>
        </ul>

        <div className="event-card-foot">
          <CapacityMeter taken={event.participantCount} max={event.maxParticipants} status={event.status} />
          {mappable ? (
            onShowOnMap && (
              <button
                type="button"
                className="btn btn-ghost btn-sm event-card-map"
                onClick={() => onShowOnMap(event._id)}
                // Starts with the visible text so voice control ("Auf Karte") finds the button.
                aria-label={`Auf Karte zeigen: ${event.title}`}
              >
                <Crosshair size={16} aria-hidden="true" /> Auf Karte
              </button>
            )
          ) : (
            <span className="event-card-nomap">Ohne Kartenposition</span>
          )}
        </div>
      </div>
    </article>
  )
})

export default EventCard
