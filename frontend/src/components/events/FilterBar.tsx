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
  onFreeOnly: (on: boolean) => void
  onSeriesOnly?: (on: boolean) => void
  onClearArea: () => void
  onReset: () => void
  /** Search around the viewer's position (asks the browser for permission). */
  onNearMe?: () => void
  onClearNear?: () => void
  locating?: boolean
  locateError?: string | null
}

/**
 * Where (search + "In meiner Nähe") on top, then one swipeable row of quick
 * filters. Every filter is a single tap; nothing hides behind a menu.
 */
export default function FilterBar({
  filters,
  onCity,
  onSport,
  onWhen,
  onFreeOnly,
  onSeriesOnly,
  onClearArea,
  onReset,
  onNearMe,
  onClearNear,
  locating,
  locateError,
}: Props) {
  const [city, setCity] = useState(filters.city)
  useEffect(() => setCity(filters.city), [filters.city])

  const active = !!(filters.city || filters.sport || filters.when !== 'all' || filters.area || filters.near || filters.freeOnly || filters.seriesOnly)

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

      <div className="filterbar-chips" role="group" aria-label="Filter">
        {onNearMe && (
          <button
            type="button"
            className="chip"
            aria-pressed={!!filters.near}
            disabled={locating}
            onClick={() => (filters.near ? onClearNear?.() : onNearMe())}
          >
            <LocateFixed size={16} aria-hidden="true" /> {locating ? 'Standort wird ermittelt …' : 'In meiner Nähe'}
          </button>
        )}
        {WHEN_OPTIONS.filter((o) => o.key !== 'all').map((o) => (
          <button
            key={o.key}
            type="button"
            className="chip"
            aria-pressed={filters.when === o.key}
            onClick={() => onWhen(filters.when === o.key ? 'all' : o.key)}
          >
            {o.label}
          </button>
        ))}

        <label htmlFor="filter-sport" className="sr-only">
          Sportart
        </label>
        <select
          id="filter-sport"
          className={`select chip-select${filters.sport ? ' is-on' : ''}`}
          value={filters.sport}
          onChange={(e) => onSport(e.target.value)}
        >
          <option value="">Alle Sportarten</option>
          {SPORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <button type="button" className="chip" aria-pressed={filters.freeOnly} onClick={() => onFreeOnly(!filters.freeOnly)}>
          Plätze frei
        </button>
        {onSeriesOnly && (
          <button type="button" className="chip" aria-pressed={filters.seriesOnly} onClick={() => onSeriesOnly(!filters.seriesOnly)}>
            Stammspiele
          </button>
        )}

        {filters.area && (
          <button type="button" className="chip is-on" onClick={onClearArea}>
            Kartenausschnitt <X size={14} aria-hidden="true" />
            <span className="sr-only">entfernen</span>
          </button>
        )}
        {active && (
          <button type="button" className="btn btn-ghost btn-sm filterbar-reset" onClick={onReset}>
            Zurücksetzen
          </button>
        )}
      </div>

      {locateError && (
        <p className="filterbar-near-error" role="alert">
          {locateError}
        </p>
      )}
    </div>
  )
}
