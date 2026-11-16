import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavorites, removeFavorite } from '@/api/userApi'
import { Venue } from '@/api/venueApi'
import './FavoritesPage.css'

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

export default function FavoritesPage() {
  const navigate = useNavigate()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const favorites = await getFavorites()
        setVenues(favorites as Venue[])
      } catch (err: any) {
        setError(err.message || 'Fehler beim Laden der Favoriten')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleRemoveVenue = async (venueId: string) => {
    setRemovingId(venueId)
    try {
      await removeFavorite(venueId)
      setVenues(prev => prev.filter(v => v._id !== venueId))
    } catch (err: any) {
      setError(err.message || 'Fehler beim Entfernen')
      console.error(err)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="fav-page">
      {/* ── HERO ── */}
      <section className="fav-hero">
        <div className="fav-hero-bg" aria-hidden="true" />
        <div className="fav-hero-inner">
          <div className="fav-hero-badge">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>favorite</span>
            Meine Favoriten
          </div>
          <h1 className="fav-hero-title">Deine gespeicherten Venues</h1>
          <p className="fav-hero-sub">
            Alle Sportstätten, die du als Favorit markiert hast — jederzeit schnell verfügbar.
          </p>
          <div className="fav-hero-stats">
            <div className="fav-stat">
              <span className="fav-stat-val">{venues.length}</span>
              <span className="fav-stat-label">Gespeichert</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="fav-content">
        <div className="fav-container">
          {error && (
            <div className="fav-error-banner">
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {loading ? (
            <div className="fav-loading">
              <div className="fav-spinner" />
              <p>Favoriten werden geladen…</p>
            </div>
          ) : venues.length === 0 ? (
            <div className="fav-empty">
              <span className="material-symbols-outlined fav-empty-icon">heart_broken</span>
              <h2 className="fav-empty-title">Noch keine Favoriten</h2>
              <p className="fav-empty-sub">Entdecke Venues und speichere deine Lieblingsplätze.</p>
              <button className="fav-empty-btn" onClick={() => navigate('/search')}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                Venues entdecken
              </button>
            </div>
          ) : (
            <div className="fav-cards-list">
              {venues.map(venue => (
                <FavoriteVenueCard
                  key={venue._id}
                  venue={venue}
                  removing={removingId === venue._id}
                  onRemove={() => handleRemoveVenue(venue._id)}
                  onBook={() => navigate(`/venues/${venue._id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

/* ── Venue Card ── */
function FavoriteVenueCard({
  venue,
  removing,
  onRemove,
  onBook,
}: {
  venue: Venue
  removing: boolean
  onRemove: () => void
  onBook: () => void
}) {
  return (
    <div className={`fav-card ${removing ? 'fav-card--removing' : ''}`}>
      {/* Image */}
      <div className="fav-card-img-wrap">
        {venue.images?.length > 0 ? (
          <img src={venue.images[0]} alt={venue.name} className="fav-card-photo" />
        ) : (
          <div className={`fav-card-placeholder fav-card-placeholder--${venue.sport}`}>
            <span className="material-symbols-outlined fav-card-sport-icon material-symbols-filled">
              {venue.sport === 'football'
                ? 'sports_soccer'
                : venue.sport === 'basketball'
                ? 'sports_basketball'
                : 'sports'}
            </span>
          </div>
        )}
        <div className={`fav-card-badge fav-card-badge--${venue.sport}`}>
          {SPORT_LABELS[venue.sport] ?? venue.sport}
        </div>
      </div>

      {/* Content */}
      <div className="fav-card-content">
        <div className="fav-card-top">
          <div className="fav-card-name-row">
            <h3 className="fav-card-name">{venue.name}</h3>
            <div className="fav-card-rating">
              <span className="material-symbols-outlined fav-star material-symbols-filled">star</span>
              <span>4.8</span>
            </div>
          </div>

          <p className="fav-card-addr">
            <span className="material-symbols-outlined fav-loc-icon">location_on</span>
            {venue.address.street}, {venue.address.city}
          </p>

          {venue.description && (
            <p className="fav-card-desc">{venue.description}</p>
          )}

          {venue.amenities?.length > 0 && (
            <div className="fav-card-amenities">
              {venue.amenities.slice(0, 4).map(a => (
                <span key={a} className="fav-amenity-tag">
                  <span className="material-symbols-outlined fav-amenity-icon">
                    {AMENITY_ICONS[a] ?? 'check_circle'}
                  </span>
                  {a.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="fav-card-bottom">
          <div className="fav-card-price">
            <p className="fav-price-label">Ab</p>
            <p className="fav-price-val">
              {venue.pricePerHour} €<span className="fav-price-unit">/Std.</span>
            </p>
          </div>
          <div className="fav-card-actions">
            <button
              className="fav-remove-btn"
              onClick={onRemove}
              disabled={removing}
              title="Aus Favoriten entfernen"
            >
              <span className="material-symbols-outlined fav-remove-icon material-symbols-filled">
                {removing ? 'hourglass_empty' : 'favorite'}
              </span>
            </button>
            <button className="fav-book-btn" onClick={onBook}>
              PLATZ BUCHEN
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
