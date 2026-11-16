import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listEvents, type BBox, type EventQuery, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'

export type WhenFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week'

export const WHEN_OPTIONS: { key: WhenFilter; label: string }[] = [
  { key: 'all', label: 'Alle Termine' },
  { key: 'today', label: 'Heute' },
  { key: 'tomorrow', label: 'Morgen' },
  { key: 'weekend', label: 'Wochenende' },
  { key: 'week', label: 'Nächste 7 Tage' },
]

export interface DiscoveryFilters {
  city: string
  sport: string
  when: WhenFilter
  area: BBox | null
}

const PAGE_SIZE = 200 // map + list share one result set; the API caps at 200

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

  const filters: DiscoveryFilters = useMemo(
    () => ({
      city: params.get('stadt') || '',
      sport: params.get('sport') || '',
      when: (params.get('wann') as WhenFilter) || 'all',
      area: parseArea(params.get('bereich')),
    }),
    [params]
  )

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
      ...rangeFor(filters.when),
      limit: PAGE_SIZE,
    }),
    [filters]
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
    (patch: Partial<Record<'stadt' | 'sport' | 'wann' | 'bereich', string | null>>) => {
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

  return {
    filters,
    events,
    total,
    loading,
    error,
    retry: () => setReloadKey((k) => k + 1),
    setCity: (city: string) => update({ stadt: city.trim() || null, bereich: null }),
    setSport: (sport: string) => update({ sport: sport || null }),
    setWhen: (when: WhenFilter) => update({ wann: when === 'all' ? null : when }),
    setArea: (area: BBox) => update({ bereich: serializeArea(area), stadt: null }),
    clearArea: () => update({ bereich: null }),
    reset: () => setParams(new URLSearchParams(), { replace: true }),
  }
}
