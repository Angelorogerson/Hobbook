import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVenues } from '@/api/venueApi'
import { getAllBookings } from '@/api/bookingApi'
import { getAllUsers } from '@/api/userApi'
import AdminNav from './AdminNav'
import './admin.css'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  confirmed: 'Bestätigt',
  cancelled: 'Storniert',
  completed: 'Abgeschlossen',
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    users: 0,
    venues: 0,
    bookings: 0,
    pending: 0,
    revenue: 0,
  })
  const [recentBookings, setRecentBookings] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [venues, bookings, users] = await Promise.all([
          getVenues(),
          getAllBookings(),
          getAllUsers(),
        ])
        const revenue = bookings
          .filter((b: any) => b.status === 'confirmed' || b.status === 'completed')
          .reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0)

        setStats({
          users: users.length,
          venues: venues.length,
          bookings: bookings.length,
          pending: bookings.filter((b: any) => b.status === 'pending').length,
          revenue,
        })
        setRecentBookings(bookings.slice(0, 8))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="adm-page">
      <AdminNav />

      <div className="adm-hero">
        <div className="adm-hero-inner">
          <div className="adm-hero-left">
            <p className="adm-hero-eyebrow">Hobbook Admin</p>
            <h1 className="adm-hero-title">Dashboard</h1>
            <p className="adm-hero-sub">Übersicht über alle Aktivitäten auf der Plattform.</p>
          </div>
          <div className="adm-hero-actions">
            <button className="adm-btn adm-btn--primary" onClick={() => navigate('/admin/venues/new')}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Venue hinzufügen
            </button>
          </div>
        </div>
      </div>

      <div className="adm-content">

        {/* Stats */}
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" /><span>Wird geladen…</span></div>
        ) : (
          <div className="adm-stats-grid">
            <div className="adm-stat-card">
              <div className="adm-stat-top">
                <p className="adm-stat-label">Benutzer</p>
                <div className="adm-stat-icon adm-stat-icon--blue">
                  <span className="material-symbols-outlined">group</span>
                </div>
              </div>
              <p className="adm-stat-val">{stats.users}</p>
              <span className="adm-stat-change">Registrierte Nutzer gesamt</span>
            </div>

            <div className="adm-stat-card">
              <div className="adm-stat-top">
                <p className="adm-stat-label">Venues</p>
                <div className="adm-stat-icon adm-stat-icon--green">
                  <span className="material-symbols-outlined">stadium</span>
                </div>
              </div>
              <p className="adm-stat-val">{stats.venues}</p>
              <span className="adm-stat-change">Aktive Sportstätten</span>
            </div>

            <div className="adm-stat-card">
              <div className="adm-stat-top">
                <p className="adm-stat-label">Buchungen</p>
                <div className="adm-stat-icon adm-stat-icon--purple">
                  <span className="material-symbols-outlined">calendar_month</span>
                </div>
              </div>
              <p className="adm-stat-val">{stats.bookings}</p>
              <span className="adm-stat-change">
                {stats.pending > 0 && (
                  <span style={{ color: '#ca8a04' }}>{stats.pending} ausstehend</span>
                )}
                {stats.pending === 0 && 'Alle bestätigt oder abgeschlossen'}
              </span>
            </div>

            <div className="adm-stat-card">
              <div className="adm-stat-top">
                <p className="adm-stat-label">Umsatz</p>
                <div className="adm-stat-icon adm-stat-icon--yellow">
                  <span className="material-symbols-outlined">euro</span>
                </div>
              </div>
              <p className="adm-stat-val">{stats.revenue.toFixed(0)} €</p>
              <span className="adm-stat-change">Bestätigte + abgeschl. Buchungen</span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="adm-quick-grid">
          <div className="adm-quick-card" onClick={() => navigate('/admin/venues/new')}>
            <div className="adm-quick-icon adm-stat-icon--blue">
              <span className="material-symbols-outlined">add_location_alt</span>
            </div>
            <h3 className="adm-quick-title">Venue hinzufügen</h3>
            <p className="adm-quick-desc">Neue Sportstätte mit allen Details anlegen.</p>
            <span className="material-symbols-outlined adm-quick-arrow">arrow_forward</span>
          </div>

          <div className="adm-quick-card" onClick={() => navigate('/admin/venues')}>
            <div className="adm-quick-icon adm-stat-icon--green">
              <span className="material-symbols-outlined">manage_search</span>
            </div>
            <h3 className="adm-quick-title">Venues verwalten</h3>
            <p className="adm-quick-desc">Bestehende Venues bearbeiten oder deaktivieren.</p>
            <span className="material-symbols-outlined adm-quick-arrow">arrow_forward</span>
          </div>

          <div className="adm-quick-card" onClick={() => navigate('/admin/bookings')}>
            <div className="adm-quick-icon adm-stat-icon--purple">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <h3 className="adm-quick-title">Buchungen</h3>
            <p className="adm-quick-desc">Alle Buchungen einsehen und Status aktualisieren.</p>
            <span className="material-symbols-outlined adm-quick-arrow">arrow_forward</span>
          </div>
        </div>

        {/* Recent Bookings */}
        {!loading && (
          <div className="adm-section">
            <div className="adm-section-header">
              <h2 className="adm-section-title">Letzte Buchungen</h2>
              <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => navigate('/admin/bookings')}>
                Alle ansehen
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </button>
            </div>
            {recentBookings.length === 0 ? (
              <div className="adm-empty">
                <span className="material-symbols-outlined adm-empty-icon">calendar_month</span>
                Noch keine Buchungen vorhanden.
              </div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Benutzer</th>
                      <th>Venue</th>
                      <th>Sport</th>
                      <th>Preis</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b: any) => (
                      <tr key={b._id}>
                        <td>{formatDate(b.date)}</td>
                        <td>{typeof b.user === 'object' ? b.user?.name : '—'}</td>
                        <td>{typeof b.venue === 'object' ? b.venue?.name : '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{b.sport}</td>
                        <td>{b.totalPrice?.toFixed(2)} €</td>
                        <td>
                          <span className={`adm-badge adm-badge--${b.status}`}>
                            {STATUS_LABELS[b.status] ?? b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
