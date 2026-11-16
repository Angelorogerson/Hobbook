import { useState } from 'react'
import { addFavorite, removeFavorite } from '../../api/userApi'
import './FavoriteButton.css'

interface FavoriteButtonProps {
  venueId: string
  isFavorite: boolean
  onFavoriteToggle?: (isFavorite: boolean) => void
  className?: string
}

export function FavoriteButton({
  venueId,
  isFavorite,
  onFavoriteToggle,
  className = '',
}: FavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [favoriteState, setFavoriteState] = useState(isFavorite)

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (favoriteState) {
        await removeFavorite(venueId)
        setFavoriteState(false)
        onFavoriteToggle?.(false)
      } else {
        await addFavorite(venueId)
        setFavoriteState(true)
        onFavoriteToggle?.(true)
      }
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`favorite-button-container ${className}`}>
      <button
        className={`favorite-button ${favoriteState ? 'favorited' : 'not-favorited'}`}
        onClick={handleClick}
        disabled={isLoading}
        title={favoriteState ? 'Zu Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
      >
        {isLoading ? '...' : favoriteState ? '❤️' : '🤍'}
      </button>
      {error && <p className="favorite-button-error">{error}</p>}
    </div>
  )
}
