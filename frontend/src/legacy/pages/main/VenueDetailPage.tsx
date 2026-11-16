import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getVenueById, Venue } from '@/api/venueApi'
import { createBooking, getBookedSlots } from '@/api/bookingApi'
import { addFavorite, removeFavorite, getFavorites } from '@/api/userApi'
import './VenueDetailPage.css'

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

const AMENITY_LABELS: Record<string, string> = {
  parking: 'Parkplatz',
  lighting: 'Beleuchtung',
  changing_rooms: 'Umkleiden',
  showers: 'Duschen',
  spectator_area: 'Zuschauer',
  bar: 'Bar',
  wifi: 'WLAN',
}

// Generate hourly slots from 08:00 to 22:00
function generateSlots() {
  const slots: string[] = []
  for (let h = 8; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

const ALL_SLOTS = generateSlots()

function isSlotBooked(
  time: string,
  booked: { startTime: string; endTime: string }[]
): boolean {
  return booked.some(b => time >= b.startTime && time < b.endTime)
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFav, setIsFav] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  // Booking state
  const [date, setDate] = useState(todayStr())
  const [bookedSlots, setBookedSlots] = useState<{ startTime: string; endTime: string }[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [sport, setSport] = useState('')
  const [notes, setNotes] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [activeImg, setActiveImg] = useState(0)

  // Load venue
  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const v = await getVenueById(id)
        setVenue(v)
        setError(null)
        // Set default sport
        if (v.sport !== 'both') setSport(v.sport)
      } catch (err: any) {
        setError(err.message || 'Sportstätte nicht gefunden (404)')
        setVenue(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  // Load favorites to check if this venue is already fav
  useEffect(() => {
    if (!id) return
    getFavorites()
      .then(favorites => {
        setIsFav(Array.isArray(favorites) && favorites.some(f => f === id || f._id === id))
      })
      .catch(() => setIsFav(false))
  }, [id])

  // Load booked slots when date changes
  useEffect(() => {
    if (!id || !date) return
    setSlotsLoading(true)
    setStartTime('')
    setEndTime('')
    getBookedSlots(id, date)
      .then(setBookedSlots)
      .catch(() => setBookedSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [id, date])

  const handleFav = async () => {
    if (!id) return
    setFavLoading(true)
    try {
      if (isFav) {
        await removeFavorite(id)
        setIsFav(false)
      } else {
        await addFavorite(id)
        setIsFav(true)
      }
    } catch {}
    setFavLoading(false)
  }

  const handleBook = async () => {
    if (!id || !startTime || !endTime || !sport) return
    setBookingLoading(true)
    setBookingError('')
    try {
      await createBooking({ venue: id, date, startTime, endTime, sport, notes })
      setBookingSuccess(true)
      // Refresh slots
      const updated = await getBookedSlots(id, date)
      setBookedSlots(updated)
      setStartTime('')
      setEndTime('')
    } catch (err: any) {
      setBookingError(err.message || 'Buchung fehlgeschlagen')
    } finally {
      setBookingLoading(false)
    }
  }

  // Compute price for selected time
  const computePrice = () => {
    if (!startTime || !endTime || !venue) return null
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const hours = (eh + em / 60) - (sh + sm / 60)
    if (hours <= 0) return null
    return (hours * venue.pricePerHour).toFixed(2)
  }

  const totalPrice = computePrice()

  // Valid end times: must be after startTime
  const validEndSlots = startTime
    ? ALL_SLOTS.filter(t => t > startTime)
    : []

  if (loading) return (
    <div className="vd-loading">
      <div className="vd-spinner" />
    </div>
  )

  if (error || !venue) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', minHeight: '60vh' }}>
      <h2>Sportstätte nicht gefunden</h2>
      <p>{error || 'Leider konnte diese Sportstätte nicht geladen werden.'}</p>
      <button onClick={() => navigate('/search')} style={{ padding: '10px 20px', marginTop: '20px' }}>
        Zurück zur Suche
      </button>
    </div>
  )

  const hasImages = venue.images?.length > 0

  return (
    <div className="vd-page">

      {/* ── HERO IMAGE / GRADIENT ── */}
      <section className="vd-hero">
        {hasImages ? (
          <>
            <img
              src={venue.images[activeImg]}
              alt={venue.name}
              className="vd-hero-photo"
            />
            {venue.images.length > 1 && (
              <div className="vd-thumbnails">
                {venue.images.map((img, i) => (
                  <button
                    key={i}
                    className={`vd-thumb ${i === activeImg ? 'vd-thumb--active' : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={`vd-hero-placeholder vd-hero-placeholder--${venue.sport}`}>
            <span className="material-symbols-outlined vd-hero-icon material-symbols-filled">
              {venue.sport === 'football' ? 'sports_soccer' : venue.sport === 'basketball' ? 'sports_basketball' : 'sports'}
            </span>
          </div>
        )}
        <div className="vd-hero-overlay" />

        {/* Back button */}
        <button className="vd-back-btn" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        {/* Fav button */}
        <button
          className={`vd-fav-btn ${isFav ? 'vd-fav-btn--active' : ''}`}
          onClick={handleFav}
          disabled={favLoading}
        >
          <span className="material-symbols-outlined material-symbols-filled">
            {isFav ? 'favorite' : 'favorite_border'}
          </span>
        </button>
      </section>

      {/* ── MAIN CONTENT ── */}
      <div className="vd-content">
        <div className="vd-inner">

          {/* ── LEFT: Details ── */}
          <div className="vd-details">

            {/* Title block */}
            <div className="vd-title-block">
              <div className="vd-sport-badge vd-sport-badge--{venue.sport}">
                <span className={`vd-sport-badge vd-sport-badge--${venue.sport}`}>
                  {SPORT_LABELS[venue.sport]}
                </span>
              </div>
              <h1 className="vd-title">{venue.name}</h1>
              <div className="vd-meta-row">
                <span className="vd-meta-item">
                  <span className="material-symbols-outlined vd-meta-icon">location_on</span>
                  {venue.address.street}, {venue.address.city}
                </span>
                <span className="vd-meta-item">
                  <span className="material-symbols-outlined vd-meta-icon">group</span>
                  Kapazität: {venue.capacity} Personen
                </span>
                <span className="vd-meta-item">
                  <span className="material-symbols-outlined vd-meta-icon material-symbols-filled">star</span>
                  4.8
                </span>
              </div>
            </div>

            {/* Description */}
            {venue.description && (
              <div className="vd-section">
                <h2 className="vd-section-title">Über diese Anlage</h2>
                <p className="vd-description">{venue.description}</p>
              </div>
            )}

            {/* Amenities */}
            {venue.amenities?.length > 0 && (
              <div className="vd-section">
                <h2 className="vd-section-title">Ausstattung</h2>
                <div className="vd-amenities">
                  {venue.amenities.map(a => (
                    <div key={a} className="vd-amenity">
                      <span className="material-symbols-outlined vd-amenity-icon">
                        {AMENITY_ICONS[a] ?? 'check_circle'}
                      </span>
                      <span>{AMENITY_LABELS[a] ?? a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opening Hours */}
            {venue.openingHours?.length > 0 && (
              <div className="vd-section">
                <h2 className="vd-section-title">Öffnungszeiten</h2>
                <div className="vd-hours">
                  {venue.openingHours.map(h => (
                    <div key={h.day} className="vd-hours-row">
                      <span className="vd-hours-day">{h.day}</span>
                      <span className="vd-hours-time">
                        {!h.open || !h.close ? 'Geschlossen' : `${h.open} – ${h.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Booking Card ── */}
          <div className="vd-booking-col">
            <div className="vd-booking-card">

              {/* Price header */}
              <div className="vd-booking-header">
                <div>
                  <span className="vd-booking-price">{venue.pricePerHour} €</span>
                  <span className="vd-booking-per"> / Std.</span>
                </div>
                <div className="vd-booking-rating">
                  <span className="material-symbols-outlined vd-star material-symbols-filled">star</span>
                  4.8
                </div>
              </div>

              {bookingSuccess ? (
                <div className="vd-booking-success">
                  <span className="material-symbols-outlined vd-success-icon">check_circle</span>
                  <h3>Buchung erfolgreich!</h3>
                  <p>Deine Anfrage wurde gespeichert.</p>
                  <button
                    className="vd-book-btn"
                    onClick={() => { setBookingSuccess(false) }}
                  >
                    Weitere Buchung
                  </button>
                </div>
              ) : (
                <div className="vd-booking-form">

                  {/* Sport (only if 'both') */}
                  {venue.sport === 'both' && (
                    <div className="vd-form-group">
                      <label className="vd-form-label">Sportart</label>
                      <div className="vd-sport-pills">
                        {['football', 'basketball'].map(s => (
                          <button
                            key={s}
                            className={`vd-sport-pill ${sport === s ? 'vd-sport-pill--active' : ''}`}
                            onClick={() => setSport(s)}
                            type="button"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                              {s === 'football' ? 'sports_soccer' : 'sports_basketball'}
                            </span>
                            {SPORT_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <div className="vd-form-group">
                    <label className="vd-form-label">
                      <span className="material-symbols-outlined vd-label-icon">calendar_month</span>
                      Datum
                    </label>
                    <input
                      type="date"
                      className="vd-form-input"
                      value={date}
                      min={todayStr()}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>

                  {/* Time slots */}
                  <div className="vd-form-group">
                    <label className="vd-form-label">
                      <span className="material-symbols-outlined vd-label-icon">schedule</span>
                      Startzeit
                    </label>
                    {slotsLoading ? (
                      <div className="vd-slots-loading">Slots werden geladen…</div>
                    ) : (
                      <div className="vd-slots">
                        {ALL_SLOTS.slice(0, -1).map(slot => {
                          const booked = isSlotBooked(slot, bookedSlots)
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={booked}
                              className={`vd-slot ${booked ? 'vd-slot--booked' : ''} ${startTime === slot ? 'vd-slot--selected' : ''}`}
                              onClick={() => {
                                setStartTime(slot)
                                setEndTime('')
                              }}
                            >
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* End time */}
                  {startTime && (
                    <div className="vd-form-group">
                      <label className="vd-form-label">
                        <span className="material-symbols-outlined vd-label-icon">schedule</span>
                        Endzeit
                      </label>
                      <div className="vd-slots">
                        {validEndSlots.map(slot => {
                          const booked = isSlotBooked(slot, bookedSlots)
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={booked}
                              className={`vd-slot ${booked ? 'vd-slot--booked' : ''} ${endTime === slot ? 'vd-slot--selected' : ''}`}
                              onClick={() => setEndTime(slot)}
                            >
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="vd-form-group">
                    <label className="vd-form-label">Anmerkungen (optional)</label>
                    <textarea
                      className="vd-form-input vd-form-textarea"
                      placeholder="z.B. Anzahl der Spieler…"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Price summary */}
                  {totalPrice && (
                    <div className="vd-price-summary">
                      <span>{startTime} – {endTime}</span>
                      <span className="vd-price-total">{totalPrice} €</span>
                    </div>
                  )}

                  {bookingError && (
                    <div className="vd-booking-error">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                      {bookingError}
                    </div>
                  )}

                  <button
                    className="vd-book-btn"
                    onClick={handleBook}
                    disabled={!startTime || !endTime || !sport || bookingLoading}
                  >
                    {bookingLoading ? (
                      'Wird gebucht…'
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_month</span>
                        PLATZ BUCHEN
                      </>
                    )}
                  </button>

                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
