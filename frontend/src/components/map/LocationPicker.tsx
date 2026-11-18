import { useEffect, useRef, useState } from 'react'
import maplibregl, { Map as MlMap, Marker } from 'maplibre-gl'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { searchPlaces, reverseGeocode, type GeoResult } from '@/api/geocodeApi'
import { apiError } from '@/api/axiosInstance'
import { createMap, webglSupported } from './mapSetup'
import { useTheme } from '@/store/ThemeContext'
import './LocationPicker.css'
import { MOTION } from '@/utils/motion'

export interface PickedLocation {
  placeName: string
  address: string
  city: string
  countryCode?: string
  lat: number | null
  lng: number | null
}

interface Props {
  value: PickedLocation
  onChange: (v: PickedLocation) => void
  errors?: Record<string, string>
}

/**
 * Search a place (geocoding on submit, never per keystroke) or drop/drag a pin.
 * The address fields always stay editable; nothing is invented if geocoding fails.
 */
export default function LocationPicker({ value, onChange, errors = {} }: Props) {
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [geoMessage, setGeoMessage] = useState('')
  const [mapFailed] = useState(() => !webglSupported())
  const { theme } = useTheme()

  const hasPin = value.lat !== null && value.lng !== null

  const placeMarker = (lat: number, lng: number, fly = true) => {
    const map = mapRef.current
    if (!map) return
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({
        draggable: true,
        // MapLibre needs a literal colour: read the theme's accent token.
        color: getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim() || undefined,
      }).setLngLat([lng, lat]).addTo(map)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current!.getLngLat()
        void onPin(p.lat, p.lng)
      })
    } else {
      markerRef.current.setLngLat([lng, lat])
    }
    if (fly) map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16), duration: MOTION.cameraLarge })
  }

  /** User dropped/dragged the pin: keep exact coords, suggest address via reverse geocoding. */
  const onPin = async (lat: number, lng: number) => {
    onChangeRef.current({ ...valueRef.current, lat, lng })
    setGeoMessage('Adresse wird ermittelt …')
    try {
      const r = await reverseGeocode(lat, lng)
      if (r) {
        const cur = valueRef.current
        onChangeRef.current({
          placeName: cur.placeName || r.placeName,
          address: r.address || cur.address,
          city: r.city || cur.city,
          countryCode: r.countryCode || cur.countryCode,
          lat,
          lng,
        })
        setGeoMessage('Adresse übernommen – bitte prüfen und bei Bedarf anpassen.')
      } else {
        setGeoMessage('Für diesen Punkt wurde keine Adresse gefunden. Bitte trage sie selbst ein.')
      }
    } catch (err) {
      setGeoMessage(apiError(err).message)
    }
  }

  useEffect(() => {
    if (mapFailed || !mapEl.current) return
    const map = createMap(mapEl.current, theme)
    mapRef.current = map
    map.getCanvas().style.cursor = 'crosshair'
    map.on('load', () => {
      const v = valueRef.current
      if (v.lat !== null && v.lng !== null) {
        placeMarker(v.lat, v.lng, false)
        map.jumpTo({ center: [v.lng, v.lat], zoom: 16 })
      }
    })
    map.on('click', (e) => {
      placeMarker(e.lngLat.lat, e.lngLat.lng, false)
      void onPin(e.lngLat.lat, e.lngLat.lng)
    })
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(mapEl.current)
    return () => {
      ro.disconnect()
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFailed, theme])

  const doSearch = async () => {
    if (query.trim().length < 3) {
      setGeoMessage('Bitte mindestens 3 Zeichen eingeben.')
      return
    }
    setSearching(true)
    setGeoMessage('')
    try {
      const r = await searchPlaces(query.trim())
      setResults(r)
      if (r.length === 0) setGeoMessage('Kein Ort gefunden. Versuche es genauer oder setze den Pin auf der Karte.')
    } catch (err) {
      setResults(null)
      setGeoMessage(apiError(err).message)
    } finally {
      setSearching(false)
    }
  }

  const choose = (r: GeoResult) => {
    onChange({ placeName: r.placeName, address: r.address, city: r.city, countryCode: r.countryCode, lat: r.lat, lng: r.lng })
    setResults(null)
    setGeoMessage('Ort übernommen – du kannst den Pin noch verschieben.')
    placeMarker(r.lat, r.lng)
  }

  const set = (k: keyof PickedLocation) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value })

  return (
    <div className="location-picker">
      <div className="field">
        <label htmlFor="loc-search">Ort suchen</label>
        <div className="location-search">
          <input
            id="loc-search"
            className="input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void doSearch()
              }
            }}
            placeholder="z. B. Mauerpark Berlin"
          />
          <button type="button" className="btn btn-secondary" onClick={doSearch} disabled={searching}>
            {searching ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
            Suchen
          </button>
        </div>
        <span className="hint">Oder tippe auf die Karte, um einen Pin zu setzen. Den Pin kannst du verschieben.</span>
      </div>

      {results && results.length > 0 && (
        <ul className="location-results" aria-label="Suchergebnisse">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button type="button" onClick={() => choose(r)}>
                <MapPin size={16} aria-hidden="true" />
                <span>
                  <strong>{r.placeName}</strong>
                  <small>{r.displayName}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {geoMessage && (
        <p className="hint" role="status">
          {geoMessage}
        </p>
      )}

      {mapFailed ? (
        <p className="notice notice-warning">
          Die Karte ist auf diesem Gerät nicht verfügbar. Bitte nutze die Ortssuche, damit Koordinaten gesetzt werden.
        </p>
      ) : (
        <div className="location-map" ref={mapEl} role="application" aria-label="Karte: Pin für den Treffpunkt setzen" />
      )}
      <p className={`location-pin-state${hasPin ? ' ok' : ''}`}>
        {hasPin ? `Pin gesetzt (${value.lat!.toFixed(5)}, ${value.lng!.toFixed(5)})` : 'Noch kein Pin gesetzt'}
      </p>
      {errors['location.lat'] && (
        <p className="error" role="alert">
          Bitte wähle einen Ort aus der Suche oder setze einen Pin auf der Karte.
        </p>
      )}

      <div className="field-row">
        <div className="field">
          <label htmlFor="loc-place">Treffpunkt / Name des Ortes *</label>
          <input id="loc-place" className="input" value={value.placeName} onChange={set('placeName')} maxLength={120} aria-invalid={!!errors['location.placeName']} aria-describedby={errors['location.placeName'] ? 'err-place' : undefined} />
          {errors['location.placeName'] && <span id="err-place" className="error">{errors['location.placeName']}</span>}
        </div>
        <div className="field">
          <label htmlFor="loc-city">Stadt *</label>
          <input id="loc-city" className="input" value={value.city} onChange={set('city')} maxLength={100} aria-invalid={!!errors['location.city']} aria-describedby={errors['location.city'] ? 'err-city' : undefined} />
          {errors['location.city'] && <span id="err-city" className="error">{errors['location.city']}</span>}
        </div>
      </div>
      <div className="field">
        <label htmlFor="loc-address">Adresse *</label>
        <input id="loc-address" className="input" value={value.address} onChange={set('address')} maxLength={200} aria-invalid={!!errors['location.address']} aria-describedby={errors['location.address'] ? 'err-address' : undefined} />
        {errors['location.address'] && <span id="err-address" className="error">{errors['location.address']}</span>}
      </div>
    </div>
  )
}
