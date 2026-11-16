import { useState, useEffect } from 'react'
import './FilterPanel.css'

const SPORTS = ['Football', 'Basketball']

const PRICE_RANGES = [
  { label: 'Under $20', min: 0, max: 20 },
  { label: '$20 - $50', min: 20, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: 'Over $100', min: 100, max: 999999 },
]

interface FilterPanelProps {
  onFilterChange: (filters: { sport?: string; minPrice?: number; maxPrice?: number }) => void
  isOpen?: boolean
}

export default function FilterPanel({ onFilterChange, isOpen = true }: FilterPanelProps) {
  const [selectedSport, setSelectedSport] = useState<string | undefined>()
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number } | undefined>()
  const [isExpanded, setIsExpanded] = useState(isOpen)

  const handleSportChange = (sport: string) => {
    const newSport = selectedSport === sport ? undefined : sport
    setSelectedSport(newSport)
    onFilterChange({
      sport: newSport,
      minPrice: selectedPriceRange?.min,
      maxPrice: selectedPriceRange?.max,
    })
  }

  const handlePriceChange = (range: { min: number; max: number }) => {
    const newRange = selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max ? undefined : range
    setSelectedPriceRange(newRange)
    onFilterChange({
      sport: selectedSport,
      minPrice: newRange?.min,
      maxPrice: newRange?.max,
    })
  }

  const handleClearFilters = () => {
    setSelectedSport(undefined)
    setSelectedPriceRange(undefined)
    onFilterChange({})
  }

  const hasActiveFilters = selectedSport || selectedPriceRange

  return (
    <div className={`filter-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="filter-panel-header">
        <h3 className="filter-panel-title">Filters</h3>
        <button
          className="filter-panel-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label="Toggle filters"
        >
          {isExpanded ? '✕' : '☰'}
        </button>
      </div>

      {isExpanded && (
        <div className="filter-panel-content">
          {/* Sport Filter */}
          <div className="filter-section">
            <h4 className="filter-section-title">Sport</h4>
            <div className="filter-section-items">
              {SPORTS.map((sport) => (
                <label key={sport} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedSport === sport}
                    onChange={() => handleSportChange(sport)}
                  />
                  <span className="filter-checkbox-label">{sport}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Filter */}
          <div className="filter-section">
            <h4 className="filter-section-title">Price Range</h4>
            <div className="filter-section-items">
              {PRICE_RANGES.map((range) => (
                <label key={range.label} className="filter-radio">
                  <input
                    type="radio"
                    name="price-range"
                    checked={selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max}
                    onChange={() => handlePriceChange(range)}
                  />
                  <span className="filter-radio-label">{range.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button className="filter-panel-clear" onClick={handleClearFilters}>
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
