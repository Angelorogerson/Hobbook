import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVenueContext } from '@/store/VenueContext'
import { useAuthContext } from '@/store/AuthContext'
import { Venue } from '@/api/venueApi'
import { addFavorite, removeFavorite, getFavorites } from '@/api/userApi'
import './SearchPage.css'

const SPORT_LABELS: Record<string, string> = {
  football: 'Fußball',
  basketball: 'Basketball',
  both: 'Multi-Sport',
}

const AMENITY_ICONS: Record<string, string> = {
  parking: 'local_parking',
  lighting: 'light_mode',
  changing_rooms: 'door_front',
  showers: 'shower',
  spectator_area: 'stadium',
  bar: 'local_bar',
  wifi: 'wifi',
}

const PAGE_SIZE = 6

function VenueSportBadge({ sport }: { sport: string }) {
  return (
    <div className={`search-card-badge search-card-badge--${sport}`}>
      {SPORT_LABELS[sport] ?? sport}
    </div>
  )
}

function VenueImage({ venue }: { venue: Venue }) {
  if (venue.images?.length > 0) {
    return <img src={venue.images[0]} alt={venue.name} className="search-card-photo" />
  }
  return (
    <div className={`search-card-photo-placeholder search-card-photo-placeholder--${venue.sport}`}>
      <span className="material-symbols-outlined search-card-sport-icon material-symbols-filled">
        {venue.sport === 'football' ? 'sports_soccer' : venue.sport === 'basketball' ? 'sports_basketball' : 'sports'}
      </span>
    </div>
  )
}

export default function SearchPage() {
  const navigate = useNavigate()
  const { state, fetchVenues, clearFilters } = useVenueContext()
  const { authState } = useAuthContext()

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedSport, setSelectedSport] = useState('')
  const [maxPrice, setMaxPrice] = useState(200)
  const [page, setPage] = useState(1)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [loadingFav, setLoadingFav] = useState(false)

  useEffect(() => {
    fetchVenues()
    if (authState.isAuthenticated) {
      const loadFavorites = async () => {
        try {
          const fav = await getFavorites()
          setFavorites(new Set(fav as string[]))
        } catch (err) {
          console.error('Failed to load favorites:', err)
        }
      }
      loadFavorites()
    }
  }, [fetchVenues, authState.isAuthenticated])

  // Compute unique cities from loaded venues
  const cities = useMemo(() => {
    const set = new Set(state.venues.map(v => v.address.city).filter(Boolean))
    return Array.from(set).sort()
  }, [state.venues])

  // Client-side filtering
  const filtered = useMemo(() => {
    return state.venues.filter(v => {
      const matchName = !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCity = !selectedCity || v.address.city.toLowerCase() === selectedCity.toLowerCase()
      const matchSport = !selectedSport || v.sport === selectedSport
      const matchPrice = v.pricePerHour <= maxPrice
      return matchName && matchCity && matchSport && matchPrice
    })
  }, [state.venues, searchQuery, selectedCity, selectedSport, maxPrice])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  const handleReset = () => {
    setSearchQuery('')
    setSelectedCity('')
    setSelectedSport('')
    setMaxPrice(200)
    setPage(1)
    clearFilters()
  }

  const handleToggleFavorite = async (venueId: string) => {
    if (!authState.isAuthenticated) {
      navigate('/login')
      return
    }

    setLoadingFav(true)
    try {
      const isFavorited = favorites.has(venueId)
      if (isFavorited) {
        await removeFavorite(venueId)
        setFavorites(prev => {
          const next = new Set(prev)
          next.delete(venueId)
          return next
        })
      } else {
        await addFavorite(venueId)
        setFavorites(prev => new Set(prev).add(venueId))
      }
    } catch (err) {
      console.error('Favorite error:', err)
    } finally {
      setLoadingFav(false)
    }
  }

  return (
    <div className="search-page">
      <div className="search-page-inner">

        {/* Breadcrumbs + Title */}
        <div className="search-page-head">
          <div className="search-breadcrumbs">
            <a className="search-bc-link" onClick={() => navigate('/home')}>Home</a>
            <span className="material-symbols-outlined search-bc-chevron">chevron_right</span>
            <span className="search-bc-current">Venues</span>
          </div>
          <h1 className="search-page-title">Finde deinen perfekten Platz</h1>
          <p className="search-page-sub">
            {state.isLoading
              ? 'Venues werden geladen…'
              : `${filtered.length} Sportanlage${filtered.length !== 1 ? 'n' : ''} gefunden`}
          </p>
        </div>

        <div className="search-grid">

          {/* ── SIDEBAR ── */}
          <aside className="search-sidebar">
            <div className="search-sidebar-box">
              <div className="search-sidebar-top">
                <h3 className="search-sidebar-title">
                  <span className="material-symbols-outlined search-filter-icon-hd">filter_list</span>
                  Filter
                </h3>
                <button className="search-reset-btn" onClick={handleReset}>
                  Zurücksetzen
                </button>
              </div>

              <div className="search-filters">

                {/* Name Search */}
                <div className="search-filter-block">
                  <label className="search-filter-label">Hallennname</label>
                  <div className="search-input-wrap">
                    <span className="material-symbols-outlined search-input-icon">search</span>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="z.B. Elite Arena"
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                    />
                  </div>
                </div>

                {/* City */}
                <div className="search-filter-block">
                  <label className="search-filter-label">Stadt</label>
                  <select
                    className="search-select"
                    value={selectedCity}
                    onChange={e => { setSelectedCity(e.target.value); setPage(1) }}
                  >
                    <option value="">Alle Städte</option>
                    {cities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Sport */}
                <div className="search-filter-block">
                  <label className="search-filter-label">Sportart</label>
                  <div className="search-checks">
                    {[
                      { key: 'football', label: 'Fußball' },
                      { key: 'basketball', label: 'Basketball' },
                      { key: 'both', label: 'Multi-Sport' },
                    ].map(s => (
                      <label key={s.key} className="search-check-row">
                        <input
                          type="checkbox"
                          className="search-checkbox"
                          checked={selectedSport === s.key}
                          onChange={() => {
                            setSelectedSport(prev => prev === s.key ? '' : s.key)
                            setPage(1)
                          }}
                        />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="search-filter-block">
                  <label className="search-filter-label">Max. Preis (pro Std.)</label>
                  <input
                    type="range"
                    className="search-range"
                    min={5}
                    max={200}
                    step={5}
                    value={maxPrice}
                    onChange={e => { setMaxPrice(Number(e.target.value)); setPage(1) }}
                  />
                  <div className="search-range-labels">
                    <span>5 €</span>
                    <span className="search-range-val">bis {maxPrice} €</span>
                    <span>200 €</span>
                  </div>
                </div>

              </div>
            </div>
          </aside>

          {/* ── MAIN ── */}
          <div className="search-main">

            {state.isLoading ? (
              <div className="search-loading">
                <div className="search-spinner" />
                <p>Venues werden geladen…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="search-empty">
                <span className="material-symbols-outlined search-empty-icon">search_off</span>
                <p className="search-empty-title">Keine Venues gefunden</p>
                <p className="search-empty-sub">Passe deine Filter an oder setze sie zurück.</p>
                <button className="search-empty-btn" onClick={handleReset}>
                  Filter zurücksetzen
                </button>
              </div>
            ) : (
              <>
                <div className="search-cards-list">
                  {visible.map(venue => (
                    <VenueCard
                      key={venue._id}
                      venue={venue}
                      onFavoriteClick={handleToggleFavorite}
                      isFavorite={favorites.has(venue._id)}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="search-load-more-wrap">
                    <button
                      className="search-load-more-btn"
                      onClick={() => setPage(p => p + 1)}
                    >
                      Weitere Venues laden
                    </button>
                  </div>
                )}
              </>
            )}

            {state.error && (
              <div className="search-error">
                <span className="material-symbols-outlined">error</span>
                {state.error}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Venue Card (horizontal) ── */
function VenueCard({ venue, onBook }: { venue: Venue; onBook: () => void }) {
  const amenityCount = venue.amenities?.length ?? 0

  return (
    <div className="search-card">
      {/* Image */}
      <div className="search-card-img-wrap">
        <VenueImage venue={venue} />
        <VenueSportBadge sport={venue.sport} />
      </div>

      {/* Content */}
      <div className="search-card-content">
        <div className="search-card-top">
          <div className="search-card-meta">
            <div className="search-card-name-row">
              <h4 className="search-card-name">{venue.name}</h4>
              <div className="search-card-rating">
                <span className="material-symbols-outlined search-star material-symbols-filled">star</span>
                <span>4.8</span>
              </div>
            </div>
            <p className="search-card-addr">
              <span className="material-symbols-outlined search-loc-icon">location_on</span>
              {venue.address.street}, {venue.address.city}
            </p>
            {venue.description && (
              <p className="search-card-desc">{venue.description}</p>
            )}
            {amenityCount > 0 && (
              <div className="search-card-amenities">
                {venue.amenities.slice(0, 4).map(a => (
                  <span key={a} className="search-amenity-tag">
                    <span className="material-symbols-outlined search-amenity-icon">
                      {AMENITY_ICONS[a] ?? 'check_circle'}
                    </span>
                    {a.replace('_', ' ')}
                  </span>
                ))}
                {amenityCount > 4 && (
                  <span className="search-amenity-tag">+{amenityCount - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="search-card-bottom">
          <div className="search-card-price">
            <p className="search-price-label">Ab</p>
            <p className="search-price-val">
              {venue.pricePerHour} €<span className="search-price-unit">/Std.</span>
            </p>
          </div>
          <button className="search-book-btn" onClick={onBook}>
            PLATZ BUCHEN
          </button>
        </div>
      </div>
    </div>
  )
}
