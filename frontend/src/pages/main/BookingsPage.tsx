import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyBookings, cancelBooking, Booking } from '@/api/bookingApi'
import './BookingsPage.css'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  confirmed: 'Bestätigt',
  cancelled: 'Storniert',
  completed: 'Abgeschlossen',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'booking-status--pending',
  confirmed: 'booking-status--confirmed',
  cancelled: 'booking-status--cancelled',
  completed: 'booking-status--completed',
}

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: 'Nicht bezahlt',
  paid: 'Bezahlt',
  refunded: 'Erstattet',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

type FilterType = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'

export default function BookingsPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyBookings()
        setBookings(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCancel = async (id: string) => {
    setCancellingId(id)
    setCancelError('')
    try {
      const updated = await cancelBooking(id)
      setBookings(prev => prev.map(b => (b._id === updated._id ? updated : b)))
      setConfirmCancel(null)
    } catch (err: any) {
      setCancelError(err.message || 'Stornierung fehlgeschlagen')
    } finally {
      setCancellingId(null)
    }
  }

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter)

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  }

  const filterTabs: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'Alle', icon: 'list' },
    { key: 'pending', label: 'Ausstehend', icon: 'hourglass_empty' },
    { key: 'confirmed', label: 'Bestätigt', icon: 'check_circle' },
    { key: 'completed', label: 'Abgeschlossen', icon: 'task_alt' },
    { key: 'cancelled', label: 'Storniert', icon: 'cancel' },
  ]

  return (
    <div className="bk-page">

      {/* ── HERO ── */}
      <section className="bk-hero">
        <div className="bk-hero-bg" aria-hidden="true" />
        <div className="bk-hero-inner">
          <div className="bk-hero-badge">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_month</span>
            Meine Buchungen
          </div>
          <h1 className="bk-hero-title">Buchungsübersicht</h1>
          <p className="bk-hero-sub">
            Alle deine Reservierungen auf einen Blick — mit Stornierungs-Option.
          </p>

          {/* Stats */}
          <div className="bk-hero-stats">
            <div className="bk-stat">
              <span className="bk-stat-val">{counts.all}</span>
              <span className="bk-stat-label">Gesamt</span>
            </div>
            <div className="bk-stat">
              <span className="bk-stat-val bk-stat-val--green">{counts.confirmed}</span>
              <span className="bk-stat-label">Bestätigt</span>
            </div>
            <div className="bk-stat">
              <span className="bk-stat-val bk-stat-val--yellow">{counts.pending}</span>
              <span className="bk-stat-label">Ausstehend</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="bk-content">
        <div className="bk-container">

          {/* Filter Tabs */}
          <div className="bk-filters">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                className={`bk-filter-btn ${filter === tab.key ? 'bk-filter-btn--active' : ''}`}
                onClick={() => setFilter(tab.key)}
              >
                <span className="material-symbols-outlined bk-filter-icon">{tab.icon}</span>
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className="bk-filter-count">{counts[tab.key]}</span>
                )}
              </button>
            ))}
          </div>

          {cancelError && (
            <div className="bk-error">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
              {cancelError}
            </div>
          )}

          {loading ? (
            <div className="bk-loading">
              <div className="bk-spinner" />
              <p>Buchungen werden geladen…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bk-empty">
              <span className="material-symbols-outlined bk-empty-icon">calendar_month</span>
              <h2 className="bk-empty-title">
                {filter === 'all' ? 'Noch keine Buchungen' : `Keine ${STATUS_LABELS[filter]?.toLowerCase()} Buchungen`}
              </h2>
              <p className="bk-empty-sub">Entdecke Venues und buche deinen ersten Platz.</p>
              <button className="bk-empty-btn" onClick={() => navigate('/search')}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                Venues entdecken
              </button>
            </div>
          ) : (
            <div className="bk-cards">
              {filtered.map(booking => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  cancelling={cancellingId === booking._id}
                  showConfirm={confirmCancel === booking._id}
                  onCancelClick={() => setConfirmCancel(booking._id)}
                  onCancelConfirm={() => handleCancel(booking._id)}
                  onCancelAbort={() => setConfirmCancel(null)}
                  onVenueClick={() => {
                    const venueId = typeof booking.venue === 'string'
                      ? booking.venue
                      : (booking.venue as any)?._id
                    if (venueId) navigate(`/venues/${venueId}`)
                  }}
                />
              ))}
            </div>
          )}

        </div>
      </section>
    </div>
  )
}

/* ── Single Booking Card ── */
function BookingCard({
  booking,
  cancelling,
  showConfirm,
  onCancelClick,
  onCancelConfirm,
  onCancelAbort,
  onVenueClick,
}: {
  booking: Booking
  cancelling: boolean
  showConfirm: boolean
  onCancelClick: () => void
  onCancelConfirm: () => void
  onCancelAbort: () => void
  onVenueClick: () => void
}) {
  const venueName = typeof booking.venue === 'string'
    ? 'Venue'
    : (booking.venue as any)?.name ?? 'Venue'

  const venueCity = typeof booking.venue === 'object'
    ? (booking.venue as any)?.address?.city ?? ''
    : ''

  const canCancel = booking.status === 'pending' || booking.status === 'confirmed'

  return (
    <div className={`bk-card ${booking.status === 'cancelled' ? 'bk-card--cancelled' : ''}`}>
      {/* Left accent */}
      <div className={`bk-card-accent bk-card-accent--${booking.status}`} />

      {/* Body */}
      <div className="bk-card-body">
        <div className="bk-card-top">

          {/* Venue info */}
          <div className="bk-card-info">
            <button className="bk-venue-name" onClick={onVenueClick}>
              {venueName}
              <span className="material-symbols-outlined bk-venue-arrow">arrow_forward</span>
            </button>
            {venueCity && (
              <span className="bk-venue-city">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                {venueCity}
              </span>
            )}
          </div>

          {/* Status */}
          <span className={`bk-status ${STATUS_COLORS[booking.status]}`}>
            {STATUS_LABELS[booking.status]}
          </span>
        </div>

        {/* Details grid */}
        <div className="bk-card-details">
          <div className="bk-detail">
            <span className="material-symbols-outlined bk-detail-icon">calendar_today</span>
            <div>
              <p className="bk-detail-label">Datum</p>
              <p className="bk-detail-val">{formatDate(booking.date)}</p>
            </div>
          </div>

          <div className="bk-detail">
            <span className="material-symbols-outlined bk-detail-icon">schedule</span>
            <div>
              <p className="bk-detail-label">Zeit</p>
              <p className="bk-detail-val">{booking.startTime} – {booking.endTime}</p>
            </div>
          </div>

          <div className="bk-detail">
            <span className="material-symbols-outlined bk-detail-icon">sports_soccer</span>
            <div>
              <p className="bk-detail-label">Sportart</p>
              <p className="bk-detail-val" style={{ textTransform: 'capitalize' }}>
                {booking.sport}
              </p>
            </div>
          </div>

          <div className="bk-detail">
            <span className="material-symbols-outlined bk-detail-icon">euro</span>
            <div>
              <p className="bk-detail-label">Gesamtpreis</p>
              <p className="bk-detail-val bk-detail-price">{booking.totalPrice?.toFixed(2)} €</p>
            </div>
          </div>

          <div className="bk-detail">
            <span className="material-symbols-outlined bk-detail-icon">payment</span>
            <div>
              <p className="bk-detail-label">Zahlung</p>
              <p className="bk-detail-val">{PAYMENT_LABELS[booking.paymentStatus]}</p>
            </div>
          </div>

          <div className="bk-detail">
            <span className="material-symbols-outlined bk-detail-icon">timer</span>
            <div>
              <p className="bk-detail-label">Dauer</p>
              <p className="bk-detail-val">{booking.durationHours} Std.</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="bk-card-notes">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#94a3b8' }}>note</span>
            {booking.notes}
          </div>
        )}

        {/* Cancel confirm or button */}
        {canCancel && (
          <div className="bk-card-footer">
            {showConfirm ? (
              <div className="bk-confirm">
                <p className="bk-confirm-text">Buchung wirklich stornieren?</p>
                <div className="bk-confirm-actions">
                  <button
                    className="bk-confirm-yes"
                    onClick={onCancelConfirm}
                    disabled={cancelling}
                  >
                    {cancelling ? 'Wird storniert…' : 'Ja, stornieren'}
                  </button>
                  <button className="bk-confirm-no" onClick={onCancelAbort}>
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <button className="bk-cancel-btn" onClick={onCancelClick}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                Stornieren
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
