import { useEffect, useRef, useState } from 'react'
import { LocateFixed, Search, X } from 'lucide-react'
import { LEVELS, SPORTS } from '@/constants/sports'
import { SEARCH_MAX, SEARCH_MIN, WHEN_OPTIONS, type DiscoveryFilters, type WhenFilter } from '@/hooks/useEventDiscovery'
import './FilterBar.css'

interface Props {
  filters: DiscoveryFilters
  onCity: (city: string) => void
  onSport: (sport: string) => void
  onWhen: (when: WhenFilter) => void
  onFreeOnly: (on: boolean) => void
  onSeriesOnly?: (on: boolean) => void
  /** Level picker ('' = every level). */
  onLevel?: (level: string) => void
  /** Text search in title and place name ('' = off). */
  onSearch?: (text: string) => void
  onClearArea: () => void
  onReset: () => void
  /** Search around the viewer's position (asks the browser for permission). */
  onNearMe?: () => void
  onClearNear?: () => void
  locating?: boolean
  locateError?: string | null
}

const SEARCH_DEBOUNCE_MS = 400

/** What a typed text searches for: one letter alone (or nothing) means no text search. */
const toSearch = (typed: string) => {
  const t = typed.trim()
  return t.length >= SEARCH_MIN ? t : ''
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
  onLevel,
  onSearch,
  onClearArea,
  onReset,
  onNearMe,
  onClearNear,
  locating,
  locateError,
}: Props) {
  const [city, setCity] = useState(filters.city)
  useEffect(() => setCity(filters.city), [filters.city])

  // The text field follows the URL, but never rewrites what is being typed
  // (a trailing space, or a single letter that is not searched yet).
  const [text, setText] = useState(filters.search)
  useEffect(() => setText((t) => (toSearch(t) === filters.search ? t : filters.search)), [filters.search])

  // Search while typing, after a short pause.
  // (The handler lives in a ref so that a re-render of the page doesn't restart the pause.)
  const wanted = toSearch(text)
  const onSearchRef = useRef(onSearch)
  useEffect(() => {
    onSearchRef.current = onSearch
  })
  useEffect(() => {
    if (wanted === filters.search) return
    const timer = window.setTimeout(() => onSearchRef.current?.(wanted), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [wanted, filters.search])

  const active = !!(
    filters.city ||
    filters.sport ||
    filters.when !== 'all' ||
    filters.area ||
    filters.near ||
    filters.freeOnly ||
    filters.seriesOnly ||
    filters.search ||
    filters.level
  )

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

      {onSearch && (
        <form
          className="filterbar-text"
          onSubmit={(e) => {
            e.preventDefault()
            if (wanted !== filters.search) onSearch(wanted)
          }}
        >
          <label htmlFor="filter-text" className="sr-only">
            Titel oder Platz
          </label>
          <input
            id="filter-text"
            className={`input filterbar-text-input${filters.search ? ' is-on' : ''}`}
            type="search"
            placeholder="Titel oder Platz"
            value={text}
            maxLength={SEARCH_MAX}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          {text && (
            <button
              type="button"
              className="filterbar-text-clear"
              aria-label="Textsuche löschen"
              onClick={() => {
                setText('')
                if (filters.search) onSearch('')
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </form>
      )}

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

        {onLevel && (
          <>
            <label htmlFor="filter-level" className="sr-only">
              Niveau
            </label>
            <select
              id="filter-level"
              className={`select chip-select${filters.level ? ' is-on' : ''}`}
              value={filters.level}
              onChange={(e) => onLevel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l.key} value={l.key === 'all' ? '' : l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </>
        )}

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
