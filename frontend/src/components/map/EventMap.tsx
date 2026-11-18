import { useEffect, useId, useRef, useState } from 'react'
import maplibregl, { Map as MlMap, Marker, Popup } from 'maplibre-gl'
import { Box, ChevronRight, LocateFixed, Search, X } from 'lucide-react'
import type { BBox, SportEvent } from '@/api/eventApi'
import { sportColor, sportLabel } from '@/constants/sports'
import { formatEventDate, spotsText } from '@/utils/format'
import { BUILDINGS_MIN_ZOOM, boundsToBBox, createMap, has3dBuildings, set3d, sportIconSvg, webglSupported } from './mapSetup'
import { useTheme } from '@/store/ThemeContext'
import MapFallback from './MapFallback'
import './EventMap.css'

interface Props {
  events: SportEvent[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  /** Called with the current viewport when the user asks to search this area. */
  onSearchArea?: (bbox: BBox) => void
  /** Changing this value re-fits the map to the current events. */
  fitKey?: string
  /** Detail mode: one event, no area search, closer zoom. */
  compact?: boolean
  label?: string
  /** Client-side navigation for the popup link. */
  onOpen?: (id: string) => void
  /** Centre used when a position search returns no mappable events. */
  focus?: { lat: number; lng: number } | null
  /** The viewer's (coarse) position: shown as a dot with a recenter button. */
  position?: { lat: number; lng: number } | null
  /** Results are being fetched: show a small hint instead of an empty map. */
  loading?: boolean
}

/** Markers closer than this on screen are merged into one count bubble. */
const CLUSTER_RADIUS_PX = 46
/** From this zoom level on every event keeps its own pin. */
const CLUSTER_MAX_ZOOM = 15

const PHONE_QUERY = '(max-width: 860px)'
function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(PHONE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(PHONE_QUERY)
    if (!mq) return
    const onChange = () => setPhone(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return phone
}

const mappable = (e: SportEvent) => e.location.lat !== null && e.location.lng !== null

function popupContent(e: SportEvent, onOpen?: (id: string) => void) {
  const root = document.createElement('div')
  root.className = 'map-popup'
  const title = document.createElement('a')
  title.href = `/events/${e._id}`
  title.className = 'map-popup-title'
  title.textContent = e.title
  if (onOpen) {
    title.addEventListener('click', (ev) => {
      ev.preventDefault()
      onOpen(e._id)
    })
  }
  const meta = document.createElement('div')
  meta.className = 'map-popup-meta'
  const { day, time } = formatEventDate(e.startAt, e.endAt, e.timezone)
  meta.textContent = `${sportLabel(e.sport)} · ${day}, ${time}`
  const place = document.createElement('div')
  place.className = 'map-popup-meta'
  place.textContent = `${e.location.placeName} · ${spotsText(e)}`
  root.append(title, meta, place)
  return root
}

export default function EventMap({
  events,
  selectedId,
  onSelect,
  onSearchArea,
  fitKey,
  compact,
  label,
  onOpen,
  focus,
  position,
  loading,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markersRef = useRef<Map<string, { marker: Marker; el: HTMLButtonElement; onMap: boolean }>>(new Map())
  const clustersRef = useRef<Marker[]>([])
  const meRef = useRef<Marker | null>(null)
  const layoutRef = useRef<() => void>(() => {})
  const isPhone = useIsPhone()
  const popupRef = useRef<Popup | null>(null)
  const noteId = useId()
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  const [failed, setFailed] = useState(() => !webglSupported())
  const [loaded, setLoaded] = useState(false)
  const [can3d, setCan3d] = useState(false)
  const [is3d, setIs3d] = useState(false)
  const [zoom, setZoom] = useState(0)
  const [moved, setMoved] = useState(false)
  const { theme } = useTheme()

  // Init (again when the colour theme switches the map style)
  useEffect(() => {
    if (failed || !containerRef.current) return
    let map: MlMap
    try {
      map = createMap(containerRef.current, theme, compact ? { zoom: 14 } : {})
    } catch {
      setFailed(true)
      return
    }
    mapRef.current = map
    const markers = markersRef.current

    map.on('load', () => {
      setLoaded(true)
      // Start flat; 3D is opt-in (ensure3dLayer adds it hidden).
      setCan3d(has3dBuildings(map))
      setZoom(map.getZoom())
    })
    map.on('error', (ev) => {
      // Style failed before first render: show the fallback instead of a blank box.
      if (!map.isStyleLoaded() && !map.loaded() && String(ev?.error?.message || '').match(/style|fetch|Failed/i)) {
        setFailed(true)
      }
    })
    map.on('zoomend', () => setZoom(map.getZoom()))
    map.on('moveend', () => layoutRef.current())
    map.on('moveend', (ev) => {
      // Only user-initiated moves offer "search this area".
      if ((ev as { originalEvent?: unknown }).originalEvent) setMoved(true)
    })

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      markers.forEach(({ marker }) => marker.remove())
      markers.clear()
      clustersRef.current.forEach((m) => m.remove())
      clustersRef.current = []
      meRef.current?.remove()
      meRef.current = null
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
      setLoaded(false)
      setIs3d(false)
    }
  }, [failed, compact, theme])

  // Sync markers with the (same) result set the list shows
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    const ids = new Set(events.filter(mappable).map((e) => e._id))

    markers.forEach((m, id) => {
      if (!ids.has(id)) {
        m.marker.remove()
        markers.delete(id)
      }
    })

    for (const e of events) {
      if (!mappable(e)) continue
      const existing = markers.get(e._id)
      if (existing) {
        existing.marker.setLngLat([e.location.lng!, e.location.lat!])
        existing.el.dataset.status = e.status
        continue
      }
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'map-marker'
      // The list is the keyboard/screen-reader path; markers are pointer targets.
      el.tabIndex = -1
      el.setAttribute('aria-hidden', 'true')
      el.dataset.status = e.status
      el.style.setProperty('--marker-color', sportColor(e.sport))
      el.title = e.title
      // MapLibre positions the marker element via transform; the pin is a child.
      // innerHTML only receives our own static icon markup, never event data.
      const pin = document.createElement('span')
      pin.className = 'map-marker-pin'
      pin.innerHTML = sportIconSvg(e.sport)
      el.appendChild(pin)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        onSelectRef.current?.(e._id)
      })
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([e.location.lng!, e.location.lat!])
      markers.set(e._id, { marker, el, onMap: false })
    }
    layoutRef.current()
  }, [events, loaded])

  // Declutter: pins that would overlap on screen merge into one count bubble.
  // Runs after every move/zoom and whenever results or the selection change.
  layoutRef.current = () => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    clustersRef.current.forEach((m) => m.remove())
    clustersRef.current = []

    const show = (id: string, on: boolean) => {
      const m = markers.get(id)
      if (!m || m.onMap === on) return
      if (on) m.marker.addTo(map)
      else m.marker.remove()
      m.onMap = on
    }

    const pts = events.filter(mappable)
    if (compact || map.getZoom() >= CLUSTER_MAX_ZOOM) {
      pts.forEach((e) => show(e._id, true))
      return
    }

    const groups: { x: number; y: number; items: SportEvent[] }[] = []
    for (const e of pts) {
      // The selected event always keeps its own pin so its preview has an anchor.
      if (e._id === selectedId) {
        show(e._id, true)
        continue
      }
      const p = map.project([e.location.lng!, e.location.lat!])
      const g = groups.find((c) => Math.hypot(c.x - p.x, c.y - p.y) < CLUSTER_RADIUS_PX)
      if (g) {
        g.x = (g.x * g.items.length + p.x) / (g.items.length + 1)
        g.y = (g.y * g.items.length + p.y) / (g.items.length + 1)
        g.items.push(e)
      } else groups.push({ x: p.x, y: p.y, items: [e] })
    }

    for (const g of groups) {
      if (g.items.length === 1) {
        show(g.items[0]._id, true)
        continue
      }
      g.items.forEach((e) => show(e._id, false))
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'map-cluster'
      el.tabIndex = -1
      el.setAttribute('aria-hidden', 'true')
      el.textContent = String(g.items.length)
      el.title = `${g.items.length} Events – zum Vergrößern antippen`
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        // Zooming into a group replaces whatever preview was open
        onSelectRef.current?.('')
        const b = new maplibregl.LngLatBounds()
        g.items.forEach((e) => b.extend([e.location.lng!, e.location.lat!]))
        map.fitBounds(b, { padding: 80, maxZoom: CLUSTER_MAX_ZOOM, duration: 400 })
      })
      clustersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat(map.unproject([g.x, g.y])).addTo(map))
    }
  }

  // The viewer's own (coarse) position
  useEffect(() => {
    const map = mapRef.current
    meRef.current?.remove()
    meRef.current = null
    if (!map || !loaded || !position || compact) return
    const el = document.createElement('div')
    el.className = 'map-me'
    el.title = 'Dein ungefährer Standort'
    meRef.current = new maplibregl.Marker({ element: el }).setLngLat([position.lng, position.lat]).addTo(map)
  }, [position, loaded, compact])

  // Fit to results when filters change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    const pts = events.filter(mappable)
    if (pts.length === 0) {
      // Nothing to fit: still move to the searched position so the map shows the right place.
      if (focus) map.jumpTo({ center: [focus.lng, focus.lat], zoom: 11 })
      return
    }
    if (pts.length === 1) {
      map.jumpTo({ center: [pts[0].location.lng!, pts[0].location.lat!], zoom: compact ? 15 : 13 })
    } else {
      const b = new maplibregl.LngLatBounds()
      pts.forEach((e) => b.extend([e.location.lng!, e.location.lat!]))
      map.fitBounds(b, { padding: 60, maxZoom: 14, duration: 0 })
    }
    setMoved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, loaded])

  // Selection: highlight marker and show preview popup
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach(({ el }, id) => el.classList.toggle('is-selected', id === selectedId))
    layoutRef.current()
    popupRef.current?.remove()
    popupRef.current = null
    if (!selectedId || compact) return
    const ev = events.find((e) => e._id === selectedId)
    const entry = markersRef.current.get(selectedId)
    if (!ev || !entry) return
    // Phones get a preview card at the bottom (see render); a popup is too fiddly for thumbs.
    if (!isPhone) {
      popupRef.current = new maplibregl.Popup({ offset: 28, closeButton: true, maxWidth: '260px' })
        .setLngLat(entry.marker.getLngLat())
        .setDOMContent(popupContent(ev, onOpenRef.current))
        .addTo(map)
    }
    if (!map.getBounds().contains(entry.marker.getLngLat())) {
      map.easeTo({ center: entry.marker.getLngLat(), duration: 400 })
    }
  }, [selectedId, events, compact, loaded, isPhone])

  if (failed) return <MapFallback events={events} />

  const mappableCount = events.filter(mappable).length
  const preview = isPhone && !compact && selectedId ? events.find((e) => e._id === selectedId && mappable(e)) : undefined

  return (
    <div className={`event-map${compact ? ' event-map--compact' : ''}${loaded ? '' : ' is-loading'}`}>
      <div
        ref={containerRef}
        className="event-map-canvas"
        role="region"
        aria-label={label || 'Karte der Events'}
        aria-describedby={noteId}
      />
      <p id={noteId} className="sr-only">
        Kartenansicht mit {mappableCount} Markierungen. Alle Events sind auch in der Liste verfügbar.
      </p>

      {!compact && loaded && (loading || mappableCount === 0) && (
        <p className="map-status" role="status">
          {loading ? 'Events werden geladen …' : 'Hier ist gerade nichts los. Verschiebe die Karte oder zoome heraus.'}
        </p>
      )}

      {position && !compact && loaded && (
        <button
          type="button"
          className="map-tool-btn map-recenter"
          aria-label="Karte auf meinen Standort zentrieren"
          title="Zu meinem Standort"
          onClick={() => mapRef.current?.easeTo({ center: [position.lng, position.lat], zoom: Math.max(mapRef.current.getZoom(), 12), duration: 500 })}
        >
          <LocateFixed size={18} aria-hidden="true" />
        </button>
      )}

      {preview && (
        <div className="map-preview">
          <a
            className="map-preview-link"
            href={`/events/${preview._id}`}
            onClick={(ev) => {
              if (!onOpen) return
              ev.preventDefault()
              onOpen(preview._id)
            }}
          >
            <span className="map-preview-sport" style={{ color: sportColor(preview.sport) }}>
              {sportLabel(preview.sport)}
            </span>
            <strong className="map-preview-title">{preview.title}</strong>
            <span className="map-preview-meta">
              {(() => {
                const { day, time } = formatEventDate(preview.startAt, preview.endAt, preview.timezone)
                return `${day}, ${time}`
              })()}
            </span>
            <span className="map-preview-meta">
              {preview.location.placeName} · {spotsText(preview)}
            </span>
            <ChevronRight size={20} aria-hidden="true" className="map-preview-go" />
          </a>
          <button type="button" className="map-preview-close" aria-label="Vorschau schließen" onClick={() => onSelect?.('')}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {can3d && (
        <div className="map-tools">
          <button
            type="button"
            className="map-tool-btn"
            aria-pressed={is3d}
            onClick={() => {
              const map = mapRef.current
              if (!map) return
              set3d(map, !is3d)
              setIs3d(!is3d)
            }}
          >
            <Box size={16} aria-hidden="true" /> 3D
          </button>
          {is3d && zoom < BUILDINGS_MIN_ZOOM && (
            <span className="map-hint" role="status">
              Zoome näher heran, um 3D-Gebäude zu sehen
            </span>
          )}
        </div>
      )}

      {onSearchArea && moved && !compact && (
        <button
          type="button"
          className="btn btn-primary btn-sm map-search-area"
          onClick={() => {
            const map = mapRef.current
            if (!map) return
            onSearchArea(boundsToBBox(map))
            setMoved(false)
          }}
        >
          <Search size={16} aria-hidden="true" /> Diesen Bereich durchsuchen
        </button>
      )}
    </div>
  )
}
