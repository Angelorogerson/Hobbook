import { Link } from 'react-router-dom'
import { Venue } from '../../api/venueApi'
import './VenueCard.css'

interface VenueCardProps {
  venue: Venue
  onFavoriteClick?: (venueId: string) => void
  isFavorite?: boolean
}

export default function VenueCard({ venue, onFavoriteClick, isFavorite = false }: VenueCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onFavoriteClick?.(venue._id)
  }

  const imageUrl = venue.images?.[0] || 'https://via.placeholder.com/400x250?text=' + encodeURIComponent(venue.name)

  return (
    <Link to={`/venues/${venue._id}`} className="venue-card-link">
      <div className="venue-card">
        <div className="venue-card-image">
          <img src={imageUrl} alt={venue.name} loading="lazy" />
          <button
            className={`venue-card-favorite ${isFavorite ? 'active' : ''}`}
            onClick={handleFavoriteClick}
            type="button"
            aria-label="Add to favorites"
          >
            ♥
          </button>
          <span className="venue-card-sport">{venue.sport}</span>
        </div>

        <div className="venue-card-content">
          <h3 className="venue-card-name">{venue.name}</h3>

          <div className="venue-card-info">
            <span className="venue-card-location">
              📍 {venue.address.city}
            </span>
            <span className="venue-card-capacity">
              👥 {venue.capacity} slots
            </span>
          </div>

          <p className="venue-card-description">{venue.description.substring(0, 80)}...</p>

          <div className="venue-card-footer">
            <div className="venue-card-amenities">
              {venue.amenities?.slice(0, 2).map((amenity) => (
                <span key={amenity} className="venue-card-amenity-tag">
                  {amenity}
                </span>
              ))}
            </div>
            <div className="venue-card-price">
              <span className="venue-card-price-value">${venue.pricePerHour}</span>
              <span className="venue-card-price-unit">/hr</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
