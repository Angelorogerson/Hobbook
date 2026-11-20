import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarX2, List, Map as MapIcon, Plus, RefreshCw } from 'lucide-react'
import EventMap from '@/components/map/EventMap'
import EventCard from '@/components/events/EventCard'
import FilterBar from '@/components/events/FilterBar'
import AlertButton from '@/components/events/AlertButton'
import { EmptyState, EventCardSkeleton } from '@/components/ui/DataPieces'
import { NEAR_RADIUS_KM, useEventDiscovery } from '@/hooks/useEventDiscovery'
import { sportLabel } from '@/constants/sports'
import { distanceKm } from '@/utils/geo'
import { scrollBehavior } from '@/utils/motion'
import './DiscoverPage.css'

interface Props {
  initialView: 'list' | 'map'
}

/**
 * Discover = list + map over ONE result set. On desktop both are visible;
 * on mobile a toggle switches between them (/ starts in list, /karte in map).
 */
export default function DiscoverPage({ initialView }: Props) {
  const navigate = useNavigate()
  const d = useEventDiscovery()
  const [view, setView] = useState<'list' | 'map'>(initialView)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectSource, setSelectSource] = useState<'list' | 'map'>('list')
  const cardRefs = useRef(new Map<string, HTMLElement>())

  useEffect(() => setView(initialView), [initialView])

  // Selection must always point into the current result set.
  useEffect(() => {
    if (selectedId && !d.events.some((e) => e._id === selectedId)) setSelectedId(null)
  }, [d.events, selectedId])

  // Selecting a marker scrolls its card into view.
  useEffect(() => {
    if (!selectedId || selectSource !== 'map') return
    cardRefs.current.get(selectedId)?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() })
  }, [selectedId, selectSource])

  // Re-fit the map whenever non-viewport filters change.
  // With an explicit map area the viewport is the user's choice: don't jump.
  const areaActive = !!d.filters.area
  const fitKey = useMemo(
    () =>
      areaActive
        ? 'area'
        : [
            d.filters.city,
            d.filters.sport,
            d.filters.when,
            d.filters.near ? 'near' : '',
            d.filters.freeOnly ? 'f' : '',
            d.filters.seriesOnly ? 's' : '',
            d.filters.search,
            d.filters.level,
            d.loading ? 'l' : 'r',
          ].join('|'),
    [
      areaActive,
      d.filters.city,
      d.filters.sport,
      d.filters.when,
      d.filters.near,
      d.filters.freeOnly,
      d.filters.seriesOnly,
      d.filters.search,
      d.filters.level,
      d.loading,
    ]
  )
  const unmappable = d.events.filter((e) => e.location.lat === null).length
  // "Sag mir Bescheid" needs a city: not for map-area or near-me searches.
  const alertCity = areaActive ? '' : d.filters.city

  const heading = [
    d.filters.seriesOnly
      ? `${d.filters.sport ? `${sportLabel(d.filters.sport)}-` : ''}Stammspiele`
      : d.filters.sport
        ? sportLabel(d.filters.sport)
        : 'Sport-Events',
    areaActive
      ? 'im Kartenausschnitt'
      : d.filters.city
        ? `in ${d.filters.city}`
        : d.filters.near
          ? `in deiner Nähe (${NEAR_RADIUS_KM} km)`
          : 'überall',
  ].join(' ')

  return (
    <div className={`discover discover--${view}`}>
      <section className="discover-panel" aria-labelledby="discover-heading">
        <div className="discover-head">
          <h1 id="discover-heading" className="discover-title">
            {heading}
          </h1>
          <FilterBar
            filters={d.filters}
            onCity={d.setCity}
            onSport={d.setSport}
            onWhen={d.setWhen}
            onFreeOnly={d.setFreeOnly}
            onSeriesOnly={d.setSeriesOnly}
            onLevel={d.setLevel}
            onSearch={d.setSearch}
            onClearArea={d.clearArea}
            onReset={d.reset}
            onNearMe={d.locate}
            onClearNear={d.clearNear}
            locating={d.locating}
            locateError={d.locateError}
          />
          <p className="discover-count" role="status" aria-live="polite">
            {d.loading
              ? 'Events werden geladen …'
              : d.error
                ? ''
                : d.total === 0
                  ? d.hiddenFull > 0
                    ? 'Keine Events mit freien Plätzen'
                    : 'Keine Events gefunden'
                  : `${d.total} ${d.total === 1 ? 'Event' : 'Events'}${d.total > d.events.length ? ` (die ersten ${d.events.length} werden angezeigt)` : ''}${unmappable ? ` · ${unmappable} ohne Kartenposition` : ''}`}
          </p>
        </div>

        <div className="discover-list">
          <h2 className="sr-only">Ergebnisse</h2>
          {d.loading && d.events.length === 0 && (
            <div className="discover-cards" aria-hidden="true">
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </div>
          )}

          {d.error && (
            <div className="notice notice-danger" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <div className="notice-body">
                <p>{d.error}</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={d.retry}>
                  <RefreshCw size={14} aria-hidden="true" /> Erneut versuchen
                </button>
              </div>
            </div>
          )}

          {!d.loading && !d.error && d.events.length === 0 && (
            <EmptyState
              icon={<CalendarX2 size={24} aria-hidden="true" />}
              title="Hier ist noch nichts los."
              action={
                <div className="discover-empty-actions">
                  <Link to="/events/neu" className="btn btn-primary">
                    <Plus size={18} aria-hidden="true" /> Event erstellen
                  </Link>
                  {alertCity && <AlertButton city={alertCity} sport={d.filters.sport || undefined} />}
                </div>
              }
            >
              {d.hiddenFull > 0
                ? 'Alle passenden Events sind gerade voll.'
                : areaActive ||
                    d.filters.city ||
                    d.filters.near ||
                    d.filters.sport ||
                    d.filters.when !== 'all' ||
                    d.filters.seriesOnly ||
                    d.filters.search ||
                    d.filters.level
                  ? 'Für diesen Ort und diese Filter gibt es gerade keine offenen Events.'
                  : 'Es gibt gerade keine offenen Events.'}{' '}
              Starte das erste – andere können es dann hier und auf der Karte finden.
            </EmptyState>
          )}

          <ol
            key={`${d.events.length}-${d.events[0]?._id ?? ''}-${d.events[d.events.length - 1]?._id ?? ''}`}
            className="discover-cards m-fade-in"
            aria-label="Gefundene Events"
          >
            {d.events.map((e) => (
              <li key={e._id}>
                <EventCard
                  ref={(el) => {
                    if (el) cardRefs.current.set(e._id, el)
                    else cardRefs.current.delete(e._id)
                  }}
                  event={e}
                  selected={e._id === selectedId}
                  distanceKm={
                    d.position && e.location.lat !== null && e.location.lng !== null
                      ? distanceKm(d.position, { lat: e.location.lat, lng: e.location.lng })
                      : undefined
                  }
                  onShowOnMap={(id) => {
                    setSelectSource('list')
                    setSelectedId(id)
                    setView('map')
                  }}
                />
              </li>
            ))}
          </ol>

          {alertCity && !d.loading && !d.error && d.events.length > 0 && (
            <p className="discover-alert-line">
              <AlertButton city={alertCity} sport={d.filters.sport || undefined} variant="quiet" />
            </p>
          )}
        </div>
      </section>

      <section className="discover-map" aria-label="Karte">
        <EventMap
          events={d.events}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectSource('map')
            setSelectedId(id || null)
          }}
          onOpen={(id) => navigate(`/events/${id}`)}
          onSearchArea={d.setArea}
          fitKey={fitKey}
          focus={d.filters.near}
          position={d.position}
          loading={d.loading}
        />
      </section>

      <div className="discover-toggle" role="group" aria-label="Ansicht wählen">
        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
          <List size={18} aria-hidden="true" /> Liste
        </button>
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>
          <MapIcon size={18} aria-hidden="true" /> Karte
        </button>
      </div>
    </div>
  )
}
