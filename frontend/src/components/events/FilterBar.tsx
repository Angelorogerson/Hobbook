import { useEffect, useState } from 'react'
import { LocateFixed, Search, X } from 'lucide-react'
import { SPORTS } from '@/constants/sports'
import { WHEN_OPTIONS, type DiscoveryFilters, type WhenFilter } from '@/hooks/useEventDiscovery'
import './FilterBar.css'

interface Props {
  filters: DiscoveryFilters
  onCity: (city: string) => void
  onSport: (sport: string) => void
  onWhen: (when: WhenFilter) => void
  onClearArea: () => void
  onReset: () => void
  /** Search around the viewer's position (asks the browser for permission). */
  onNearMe?: () => void
  onClearNear?: () => void
  locating?: boolean
  locateError?: string | null
}

export default function FilterBar({
  filters,
  onCity,
  onSport,
  onWhen,
  onClearArea,
  onReset,
  onNearMe,
  onClearNear,
  locating,
  locateError,
}: Props) {
  const [city, setCity] = useState(filters.city)
  useEffect(() => setCity(filters.city), [filters.city])

  const active = !!(filters.city || filters.sport || filters.when !== 'all' || filters.area || filters.near)

  return (
    <div className="filterbar">
      <form
        className="filterbar-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          onCity(city)
        }}
      >
        <label htmlFor="filter-city" className="sr-only">
          Stadt oder Gebiet
        </label>
        <Search size={18} className="filterbar-search-icon" aria-hidden="true" />
        <input
          id="filter-city"
          className="input"
          type="search"
          placeholder="Stadt, z. B. Köln"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="address-level2"
          enterKeyHint="search"
        />
        <button type="submit" className="btn btn-primary" aria-label="Stadt suchen">
          Suchen
        </button>
      </form>

      {onNearMe && !filters.near && (
        <button type="button" className="btn btn-ghost btn-sm filterbar-near" onClick={onNearMe} disabled={locating}>
          <LocateFixed size={16} aria-hidden="true" /> {locating ? 'Standort wird ermittelt …' : 'In meiner Nähe'}
        </button>
      )}
      {locateError && (
        <p className="filterbar-near-error" role="alert">
          {locateError}
        </p>
      )}

      <div className="filterbar-row">
        <label htmlFor="filter-sport" className="sr-only">
          Sportart
        </label>
        <select id="filter-sport" className="select" value={filters.sport} onChange={(e) => onSport(e.target.value)}>
          <option value="">Alle Sportarten</option>
          {SPORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <label htmlFor="filter-when" className="sr-only">
          Zeitraum
        </label>
        <select
          id="filter-when"
          className="select"
          value={filters.when}
          onChange={(e) => onWhen(e.target.value as WhenFilter)}
        >
          {WHEN_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {active && (
        <div className="filterbar-chips">
          {filters.area && (
            <button type="button" className="chip is-on" onClick={onClearArea}>
              Kartenausschnitt <X size={14} aria-label="entfernen" />
            </button>
          )}
          {filters.near && (
            <button type="button" className="chip is-on" onClick={onClearNear}>
              In meiner Nähe <X size={14} aria-label="entfernen" />
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
            Filter zurücksetzen
          </button>
        </div>
      )}
    </div>
  )
}
