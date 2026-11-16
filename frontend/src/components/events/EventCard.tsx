import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Users, Crosshair } from 'lucide-react'
import type { SportEvent } from '@/api/eventApi'
import { sportColor, sportLabel, levelLabel } from '@/constants/sports'
import { formatEventDate, spotsText } from '@/utils/format'
import StatusBadge from './StatusBadge'
import './EventCard.css'

interface Props {
  event: SportEvent
  selected?: boolean
  onSelect?: (id: string) => void
  onShowOnMap?: (id: string) => void
}

const EventCard = forwardRef<HTMLElement, Props>(function EventCard({ event, selected, onSelect, onShowOnMap }, ref) {
  const { day, time } = formatEventDate(event.startAt, event.endAt, event.timezone)
  const mappable = event.location.lat !== null && event.location.lng !== null

  return (
    <article
      ref={ref}
      className={`event-card${selected ? ' is-selected' : ''}`}
      style={{ ['--sport-color' as string]: sportColor(event.sport) }}
      onClick={() => onSelect?.(event._id)}
      aria-current={selected ? 'true' : undefined}
      data-testid="event-card"
    >
      <div className="event-card-top">
        <span className="event-card-sport">{sportLabel(event.sport)}</span>
        <StatusBadge status={event.status} />
        {event.joined && !event.isOrganizer && <span className="badge badge-neutral">Du bist dabei</span>}
        {event.isOrganizer && <span className="badge badge-neutral">Dein Event</span>}
      </div>

      <h3 className="event-card-title">
        <Link to={`/events/${event._id}`} onClick={(e) => e.stopPropagation()}>
          {event.title}
        </Link>
      </h3>

      <ul className="event-card-meta">
        <li>
          <CalendarDays size={16} aria-hidden="true" />
          <span>
            {day}, {time}
          </span>
        </li>
        <li>
          <MapPin size={16} aria-hidden="true" />
          <span>
            {event.location.placeName}
            {event.location.city ? `, ${event.location.city}` : ''}
          </span>
        </li>
        <li>
          <Users size={16} aria-hidden="true" />
          <span>
            {spotsText(event)}
            {event.level !== 'all' ? ` · ${levelLabel(event.level)}` : ''}
          </span>
        </li>
      </ul>

      <div className="event-card-actions">
        {mappable ? (
          onShowOnMap && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={(e) => {
                e.stopPropagation()
                onShowOnMap(event._id)
              }}
              aria-label={`${event.title} auf der Karte zeigen`}
            >
              <Crosshair size={16} aria-hidden="true" /> Auf Karte
            </button>
          )
        ) : (
          <span className="event-card-nomap">Ohne Kartenposition</span>
        )}
      </div>
    </article>
  )
})

export default EventCard
