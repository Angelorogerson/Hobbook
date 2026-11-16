import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { SPORTS } from '@/constants/sports'
import { WHEN_OPTIONS, type DiscoveryFilters, type WhenFilter } from '@/hooks/useEventDiscovery'

interface Props {
  filters: DiscoveryFilters
  onCity: (city: string) => void
  onSport: (sport: string) => void
  onWhen: (when: WhenFilter) => void
  onClearArea: () => void
  onReset: () => void
}

export default function FilterBar({ filters, onCity, onSport, onWhen, onClearArea, onReset }: Props) {
  const [city, setCity] = useState(filters.city)
  useEffect(() => setCity(filters.city), [filters.city])

  const active = !!(filters.city || filters.sport || filters.when !== 'all' || filters.area)

  return (
    <div className="filterbar">
      <form
        className="filterbar-city"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          onCity(city)
        }}
      >
        <label htmlFor="filter-city" className="sr-only">
          Stadt oder Gebiet
        </label>
        <input
          id="filter-city"
          className="input"
          type="search"
          placeholder="Stadt, z. B. Köln"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="address-level2"
        />
        <button type="submit" className="btn btn-primary" aria-label="Stadt suchen">
          <Search size={18} aria-hidden="true" />
        </button>
      </form>

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

      {(filters.area || active) && (
        <div className="filterbar-chips">
          {filters.area && (
            <button type="button" className="chip" onClick={onClearArea}>
              Kartenausschnitt <X size={14} aria-label="entfernen" />
            </button>
          )}
          {active && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
