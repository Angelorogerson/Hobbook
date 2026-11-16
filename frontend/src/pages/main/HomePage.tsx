import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVenueContext } from '@/store/VenueContext'
import { useAuthContext } from '@/store/AuthContext'
import { VenueCard } from '@/components/venue'
import { LoadingSpinner } from '@/components/common'
import { addFavorite, removeFavorite, getFavorites } from '@/api/userApi'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const { state, fetchVenues, setFilters } = useVenueContext()
  const { authState } = useAuthContext()
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

  const handleSportSearch = async (sport: string) => {
    await setFilters({ sport })
    navigate('/search')
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

  const featuredVenues = state.venues.slice(0, 6)

  return (
    <div className="home-page">

      {/* Split Hero */}
      <section className="home-split-hero">

        {/* Left – Connect */}
        <div className="home-hero-left">
          <div className="home-hero-grid-pattern" aria-hidden="true" />
          <div className="home-hero-inner">
            <div className="home-hero-icon-box home-hero-icon-box--white">
              <span className="material-symbols-outlined home-icon-lg material-symbols-filled">park</span>
            </div>
            <h1 className="home-hero-title home-hero-title--white">
              PLÄTZE FINDEN.<br />KICKEN.<br />KOSTENLOS.
            </h1>
            <p className="home-hero-sub home-hero-sub--white">
              Schließ dich offenen Spielen in deiner Nähe an oder erstelle eigene.
            </p>
            <button
              className="home-hero-btn home-hero-btn--outline"
              onClick={() => navigate('/connect')}
            >
              OFFENE SPIELE SUCHEN
              <span className="material-symbols-outlined">search</span>
            </button>
          </div>
        </div>

        {/* Right – Booking */}
        <div className="home-hero-right">
          <div className="home-hero-inner">
            <div className="home-hero-icon-box home-hero-icon-box--blue">
              <span className="material-symbols-outlined home-icon-lg material-symbols-filled" style={{ color: 'var(--primary-color)' }}>sports_basketball</span>
            </div>
            <h1 className="home-hero-title home-hero-title--blue">
              HALLEN BUCHEN.<br />VERBINDLICH.<br />SICHER.
            </h1>
            <p className="home-hero-sub home-hero-sub--gray">
              Reserviere professionelle Fußball- und Basketballplätze ohne Vereinszwang.
            </p>
            <button
              className="home-hero-btn home-hero-btn--primary"
              onClick={() => navigate('/search')}
            >
              PLATZ RESERVIEREN
              <span className="material-symbols-outlined">calendar_month</span>
            </button>
          </div>
        </div>

      </section>

      {/* Trust Section */}
      <section className="home-trust-section">
        <div className="home-trust-grid">

          <a className="home-trust-card" href="#" onClick={e => e.preventDefault()}>
            <div className="home-trust-icon">
              <span className="material-symbols-outlined">help</span>
            </div>
            <h3 className="home-trust-title">So funktioniert's</h3>
            <p className="home-trust-text">Entdecke, wie du in wenigen Schritten dein nächstes Spiel organisierst oder buchst.</p>
            <div className="home-trust-link">
              Mehr erfahren <span className="material-symbols-outlined home-icon-sm">arrow_forward</span>
            </div>
          </a>

          <a className="home-trust-card" href="#" onClick={e => e.preventDefault()}>
            <div className="home-trust-icon">
              <span className="material-symbols-outlined">quiz</span>
            </div>
            <h3 className="home-trust-title">Häufige Fragen</h3>
            <p className="home-trust-text">Alles Wissenswerte zu Buchungen, Stornierungen und unserer Community.</p>
            <div className="home-trust-link">
              Zum FAQ <span className="material-symbols-outlined home-icon-sm">arrow_forward</span>
            </div>
          </a>

          <a className="home-trust-card" href="#" onClick={e => e.preventDefault()}>
            <div className="home-trust-icon">
              <span className="material-symbols-outlined">reviews</span>
            </div>
            <h3 className="home-trust-title">Bewertungen</h3>
            <div className="home-trust-stars">
              {[1,2,3,4,5].map(i => (
                <span key={i} className="material-symbols-outlined home-star material-symbols-filled">star</span>
              ))}
            </div>
            <p className="home-trust-text">Das sagen unsere über 50.000 aktiven Sportler über Hobbook.</p>
            <div className="home-trust-link">
              Feedback lesen <span className="material-symbols-outlined home-icon-sm">arrow_forward</span>
            </div>
          </a>

        </div>
      </section>

      {/* Featured Venues */}
      <section className="home-venues-section">
        <div className="home-venues-container">
          <div className="home-section-header">
            <h2 className="home-section-title">Empfohlene Venues</h2>
            <a className="home-section-link" onClick={() => navigate('/search')}>
              Alle anzeigen <span className="material-symbols-outlined home-icon-sm">arrow_forward</span>
            </a>
          </div>

          {state.isLoading ? (
            <div className="home-loading">
              <LoadingSpinner size="lg" />
            </div>
          ) : featuredVenues.length === 0 ? (
            <div className="home-empty">
              <span className="material-symbols-outlined home-icon-xl">stadium</span>
              <p>Noch keine Venues verfügbar. Schau bald wieder vorbei!</p>
            </div>
          ) : (
            <div className="home-venues-grid">
              {featuredVenues.map((venue) => (
                <VenueCard 
                  key={venue._id} 
                  venue={venue}
                  onFavoriteClick={handleToggleFavorite}
                  isFavorite={favorites.has(venue._id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sport Quick-Filter */}
      <section className="home-sports-section">
        <div className="home-venues-container">
          <h2 className="home-section-title" style={{ marginBottom: '2rem' }}>Nach Sport filtern</h2>
          <div className="home-sports-grid">
            <button className="home-sport-btn" onClick={() => handleSportSearch('Football')}>
              <span className="material-symbols-outlined home-sport-icon material-symbols-filled">sports_soccer</span>
              <span>Fußball</span>
            </button>
            <button className="home-sport-btn" onClick={() => handleSportSearch('Basketball')}>
              <span className="material-symbols-outlined home-sport-icon material-symbols-filled">sports_basketball</span>
              <span>Basketball</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
