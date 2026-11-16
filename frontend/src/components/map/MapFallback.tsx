import { MapPinOff, ExternalLink } from 'lucide-react'
import type { SportEvent } from '@/api/eventApi'
import { osmLink } from '@/utils/format'

/** Shown when WebGL or the map style is unavailable: never hide where events are. */
export default function MapFallback({ events }: { events: SportEvent[] }) {
  const withCoords = events.filter((e) => e.location.lat !== null && e.location.lng !== null).slice(0, 20)
  return (
    <div className="map-fallback" role="region" aria-label="Karte nicht verfügbar">
      <MapPinOff size={28} aria-hidden="true" />
      <p>
        <strong>Die Karte kann auf diesem Gerät gerade nicht angezeigt werden.</strong>
      </p>
      <p className="map-fallback-sub">Die Orte kannst du direkt bei OpenStreetMap öffnen:</p>
      {withCoords.length > 0 && (
        <ul>
          {withCoords.map((e) => (
            <li key={e._id}>
              <a href={osmLink(e.location.lat!, e.location.lng!)} target="_blank" rel="noreferrer">
                {e.title} – {e.location.placeName} <ExternalLink size={12} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
