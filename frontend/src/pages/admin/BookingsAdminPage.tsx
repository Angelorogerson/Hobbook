import { useState, useEffect } from 'react'
import { getAllBookings, updateBooking, Booking } from '@/api/bookingApi'
import AdminNav from './AdminNav'
import './admin.css'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  confirmed: 'Bestätigt',
  cancelled: 'Storniert',
  completed: 'Abgeschlossen',
}

type FilterType = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export default function BookingsAdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllBookings()
        setBookings(data)
      } catch (err: any) {
        setError(err.message || 'Fehler beim Laden der Buchungen')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleStatusChange = async (id: string, status: Booking['status']) => {
    setUpdatingId(id)
    setError('')
    try {
      const updated = await updateBooking(id, { status })
      setBookings(prev => prev.map(b => b._id === updated._id ? updated : b))
    } catch (err: any) {
      setError(err.message || 'Fehler beim Aktualisieren')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = bookings.filter(b => {
    const matchFilter = filter === 'all' || b.status === filter
    const venueName = typeof b.venue === 'object' ? (b.venue as any)?.name ?? '' : ''
    const userName = typeof b.user === 'object' ? (b.user as any)?.name ?? '' : ''
    const matchSearch = !search ||
      venueName.toLowerCase().includes(search.toLowerCase()) ||
      userName.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  }

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Alle' },
    { key: 'pending', label: 'Ausstehend' },
    { key: 'confirmed', label: 'Bestätigt' },
    { key: 'completed', label: 'Abgeschlossen' },
    { key: 'cancelled', label: 'Storniert' },
  ]

  return (
    <div className="adm-page">
      <AdminNav />

      <div className="adm-hero">
        <div className="adm-hero-inner">
          <div className="adm-hero-left">
            <p className="adm-hero-eyebrow">Admin · Buchungen</p>
            <h1 className="adm-hero-title">Buchungsverwaltung</h1>
            <p className="adm-hero-sub">
              {bookings.length} Buchungen insgesamt
              {counts.pending > 0 && (
                <span style={{ color: '#fbbf24', marginLeft: 8 }}>· {counts.pending} ausstehend</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="adm-content">

        {error && (
          <div className="adm-alert adm-alert--error">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
            {error}
          </div>
        )}

        <div className="adm-section">
          <div className="adm-section-header">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  className={`adm-btn adm-btn--sm ${filter === tab.key ? 'adm-btn--primary' : 'adm-btn--ghost'}`}
                  onClick={() => setFilter(tab.key)}
                >
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999,
                      background: filter === tab.key ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      fontSize: 11, fontWeight: 800,
                    }}>
                      {counts[tab.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <input
              className="adm-search-input"
              placeholder="Venue oder Benutzer suchen…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="adm-loading"><div className="adm-spinner" /><span>Wird geladen…</span></div>
          ) : filtered.length === 0 ? (
            <div className="adm-empty">
              <span className="material-symbols-outlined adm-empty-icon">calendar_month</span>
              Keine Buchungen gefunden.
            </div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Benutzer</th>
                    <th>Venue</th>
                    <th>Zeit</th>
                    <th>Sport</th>
                    <th>Preis</th>
                    <th>Status</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => {
                    const venueName = typeof b.venue === 'object' ? (b.venue as any)?.name ?? '—' : '—'
                    const userName = typeof b.user === 'object' ? (b.user as any)?.name ?? '—' : '—'
                    const userEmail = typeof b.user === 'object' ? (b.user as any)?.email ?? '' : ''
                    const isUpdating = updatingId === b._id
                    return (
                      <tr key={b._id} style={{ opacity: isUpdating ? 0.6 : 1 }}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(b.date)}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{userName}</div>
                          {userEmail && <div style={{ fontSize: 11, color: '#94a3b8' }}>{userEmail}</div>}
                        </td>
                        <td style={{ fontWeight: 500 }}>{venueName}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{b.startTime} – {b.endTime}</td>
                        <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{b.sport}</td>
                        <td style={{ fontWeight: 700, color: '#004E89' }}>{b.totalPrice?.toFixed(2)} €</td>
                        <td>
                          <span className={`adm-badge adm-badge--${b.status}`}>
                            {STATUS_LABELS[b.status]}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {b.status === 'pending' && (
                              <button
                                className="adm-btn adm-btn--success adm-btn--sm"
                                onClick={() => handleStatusChange(b._id, 'confirmed')}
                                disabled={isUpdating}
                                title="Bestätigen"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                                Bestätigen
                              </button>
                            )}
                            {b.status === 'confirmed' && (
                              <button
                                className="adm-btn adm-btn--secondary adm-btn--sm"
                                onClick={() => handleStatusChange(b._id, 'completed')}
                                disabled={isUpdating}
                                title="Als abgeschlossen markieren"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>task_alt</span>
                                Abschließen
                              </button>
                            )}
                            {(b.status === 'pending' || b.status === 'confirmed') && (
                              <button
                                className="adm-btn adm-btn--danger adm-btn--sm"
                                onClick={() => handleStatusChange(b._id, 'cancelled')}
                                disabled={isUpdating}
                                title="Stornieren"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>cancel</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
