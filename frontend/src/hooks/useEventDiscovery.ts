import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listEvents, type BBox, type EventQuery, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import { loadPlace, savePlace } from '@/utils/geo'

export type WhenFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week'

export const WHEN_OPTIONS: { key: WhenFilter; label: string }[] = [
  { key: 'all', label: 'Alle Termine' },
  { key: 'today', label: 'Heute' },
  { key: 'tomorrow', label: 'Morgen' },
  { key: 'weekend', label: 'Wochenende' },
  { key: 'week', label: '7 Tage' },
]

export interface DiscoveryFilters {
  city: string
  sport: string
  when: WhenFilter
  area: BBox | null
  /** Search around the viewer's position. Never in the URL; remembered coarsely on this device. */
  near: { lat: number; lng: number } | null
  /** Only events that still have a spot (filtered in the browser). */
  freeOnly: boolean
}

const PAGE_SIZE = 200 // map + list share one result set; the API caps at 200
export const NEAR_RADIUS_KM = 25

/** Ask the browser for the current position (only ever called after a click). */
export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Dein Browser unterstützt keine Standortabfrage.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Standortzugriff wurde nicht erlaubt. Such stattdessen nach deiner Stadt.'
              : 'Dein Standort konnte nicht ermittelt werden. Such stattdessen nach deiner Stadt.'
          )
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    )
  })
}

/** Date range for a quick filter, in the viewer's local time. */
export function rangeFor(when: WhenFilter, now = new Date()): { from?: string; to?: string } {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

  switch (when) {
    case 'today':
      return { from: now.toISOString(), to: endOfDay(now).toISOString() }
    case 'tomorrow': {
      const t = addDays(now, 1)
      return { from: startOfDay(t).toISOString(), to: endOfDay(t).toISOString() }
    }
    case 'weekend': {
      const day = now.getDay() // 0 = Sun, 6 = Sat
      const sat = day === 6 || day === 0 ? startOfDay(now) : addDays(startOfDay(now), 6 - day)
      const sun = day === 0 ? now : addDays(sat, 1)
      return { from: (day === 6 || day === 0 ? now : sat).toISOString(), to: endOfDay(sun).toISOString() }
    }
    case 'week':
      return { from: now.toISOString(), to: endOfDay(addDays(now, 7)).toISOString() }
    default:
      return {}
  }
}

export function parseArea(v: string | null): BBox | null {
  if (!v) return null
  const n = v.split(',').map(Number)
  if (n.length !== 4 || !n.every(Number.isFinite)) return null
  const [minLng, minLat, maxLng, maxLat] = n
  return { minLng, minLat, maxLng, maxLat }
}

const serializeArea = (b: BBox) => [b.minLng, b.minLat, b.maxLng, b.maxLat].map((n) => n.toFixed(4)).join(',')

/**
 * Single source of truth for discovery: filters live in the URL (shareable),
 * and list + map render the exact same `events` array.
 */
export function useEventDiscovery() {
  const [params, setParams] = useSearchParams()
  // Returning visitors start where they searched last: the remembered position
  // applies directly, a remembered city goes into the URL (see effect below).
  const remembered = useRef(loadPlace())
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(
    remembered.current && 'near' in remembered.current ? remembered.current.near : null
  )
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const filters: DiscoveryFilters = useMemo(() => {
    const city = params.get('stadt') || ''
    const area = parseArea(params.get('bereich'))
    return {
      city,
      sport: params.get('sport') || '',
      when: (params.get('wann') as WhenFilter) || 'all',
      area,
      // A city or map area is the more specific choice and wins over the position.
      near: city || area ? null : near,
      freeOnly: params.get('frei') === '1',
    }
  }, [params, near])

  const [events, setEvents] = useState<SportEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const query: EventQuery = useMemo(
    () => ({
      city: filters.area ? undefined : filters.city || undefined,
      sport: filters.sport || undefined,
      bbox: filters.area || undefined,
      near: filters.near || undefined,
      radiusKm: filters.near ? NEAR_RADIUS_KM : undefined,
      ...rangeFor(filters.when),
      limit: PAGE_SIZE,
    }),
    // freeOnly is applied in the browser and must not trigger a new request
    [filters.area, filters.city, filters.sport, filters.near, filters.when]
  )

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    listEvents(query, ctrl.signal)
      .then((r) => {
        setEvents(r.events)
        setTotal(r.total)
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return
        setError(apiError(err, 'Events konnten nicht geladen werden.').message)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [query, reloadKey])

  const update = useCallback(
    (patch: Partial<Record<'stadt' | 'sport' | 'wann' | 'bereich' | 'frei', string | null>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v)
            else next.delete(k)
          }
          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  // A plain /entdecken (no place in the link) reopens the last searched city.
  useEffect(() => {
    const place = remembered.current
    if (place && 'city' in place && !params.get('stadt') && !params.get('bereich')) update({ stadt: place.city })
    // once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = useMemo(() => (filters.freeOnly ? events.filter((e) => e.spotsLeft > 0) : events), [events, filters.freeOnly])

  return {
    filters,
    events: visible,
    /** The viewer's coarse position when known, also while a city or map area is the active filter. */
    position: near,
    total: filters.freeOnly ? visible.length : total,
    hiddenFull: events.length - visible.length,
    loading,
    error,
    retry: () => setReloadKey((k) => k + 1),
    setCity: (city: string) => {
      const c = city.trim()
      savePlace(c ? { city: c } : near ? { near } : null)
      update({ stadt: c || null, bereich: null })
    },
    setFreeOnly: (on: boolean) => update({ frei: on ? '1' : null }),
    setSport: (sport: string) => update({ sport: sport || null }),
    setWhen: (when: WhenFilter) => update({ wann: when === 'all' ? null : when }),
    setArea: (area: BBox) => update({ bereich: serializeArea(area), stadt: null }),
    clearArea: () => update({ bereich: null }),
    locating,
    locateError,
    locate: async () => {
      setLocating(true)
      setLocateError(null)
      try {
        const pos = await currentPosition()
        setNear(pos)
        savePlace({ near: pos })
        update({ stadt: null, bereich: null })
      } catch (err) {
        setLocateError(err instanceof Error ? err.message : 'Dein Standort konnte nicht ermittelt werden.')
      } finally {
        setLocating(false)
      }
    },
    clearNear: () => {
      setNear(null)
      savePlace(null)
    },
    reset: () => {
      setNear(null)
      savePlace(null)
      setLocateError(null)
      setParams(new URLSearchParams(), { replace: true })
    },
  }
}
