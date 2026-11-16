import { useState } from 'react'
import './SearchBar.css'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  onSubmit?: (query: string) => void
}

export default function SearchBar({ onSearch, placeholder = 'Search venues, sports...', onSubmit }: SearchBarProps) {
  const [query, setQuery] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    onSearch(value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(query)
  }

  const handleClear = () => {
    setQuery('')
    onSearch('')
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-bar-wrapper">
        <span className="search-bar-icon">🔍</span>
        <input
          type="text"
          className="search-bar-input"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
        />
        {query && (
          <button
            type="button"
            className="search-bar-clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        <button type="submit" className="search-bar-submit">
          Search
        </button>
      </div>
    </form>
  )
}
