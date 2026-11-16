import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteVenue, Venue } from '@/api/venueApi'
import { useVenueContext } from '@/store/VenueContext'
import AdminNav from './AdminNav'
import './admin.css'

const SPORT_LABELS: Record<string, string> = {
  football: 'Fußball',
  basketball: 'Basketball',
  both: 'Beides',
}

export default function VenueListAdminPage() {
  const navigate = useNavigate()
  const { state, fetchVenues } = useVenueContext()
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Load venues on mount
  useEffect(() => {
    fetchVenues()
  }, [])

  const handleDelete = async (id: string) => {
    setDeleting(true)
    setError('')
    try {
      await deleteVenue(id)
      // Refresh venue list from context
      await fetchVenues()
      setConfirmDelete(null)
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = state.venues.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.address?.city?.toLowerCase().includes(search.toLowerCase())
    const matchSport = !sportFilter || v.sport === sportFilter
    return matchSearch && matchSport
  })

  return (
    <div className="adm-page">
      <AdminNav />

      <div className="adm-hero">
        <div className="adm-hero-inner">
          <div className="adm-hero-left">
            <p className="adm-hero-eyebrow">Admin · Venues</p>
            <h1 className="adm-hero-title">Venue-Verwaltung</h1>
            <p className="adm-hero-sub">{state.venues.length} Sportstätten insgesamt</p>
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

        {error && (
          <div className="adm-alert adm-alert--error">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
            {error}
          </div>
        )}

        <div className="adm-section">
          <div className="adm-section-header">
            <h2 className="adm-section-title">Alle Venues ({filtered.length})</h2>
            <div className="adm-filters">
              <input
                className="adm-search-input"
                placeholder="Name oder Stadt suchen…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                className="adm-filter-select"
                value={sportFilter}
                onChange={e => setSportFilter(e.target.value)}
              >
                <option value="">Alle Sportarten</option>
                <option value="football">Fußball</option>
                <option value="basketball">Basketball</option>
                <option value="both">Beides</option>
              </select>
            </div>
          </div>

          {state.isLoading ? (
            <div className="adm-loading"><div className="adm-spinner" /><span>Wird geladen…</span></div>
          ) : filtered.length === 0 ? (
            <div className="adm-empty">
              <span className="material-symbols-outlined adm-empty-icon">stadium</span>
              Keine Venues gefunden.
            </div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Sport</th>
                    <th>Stadt</th>
                    <th>Preis/Std.</th>
                    <th>Kapazität</th>
                    <th>Status</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(venue => (
                    <>
                      <tr key={venue._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{venue.name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{venue.address?.street}</div>
                        </td>
                        <td>
                          <span className={`adm-badge adm-badge--${venue.sport}`}>
                            {SPORT_LABELS[venue.sport] ?? venue.sport}
                          </span>
                        </td>
                        <td>{venue.address?.city || '—'}</td>
                        <td>{venue.pricePerHour?.toFixed(2)} €</td>
                        <td>{venue.capacity} Pers.</td>
                        <td>
                          <span className={`adm-badge ${venue.isActive ? 'adm-badge--active' : 'adm-badge--inactive'}`}>
                            {venue.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="adm-btn adm-btn--secondary adm-btn--sm"
                              onClick={() => navigate(`/admin/venues/${venue._id}/edit`)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                              Bearbeiten
                            </button>
                            <button
                              className="adm-btn adm-btn--danger adm-btn--sm"
                              onClick={() => setConfirmDelete(venue._id)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {confirmDelete === venue._id && (
                        <tr key={`confirm-${venue._id}`}>
                          <td colSpan={7}>
                            <div className="adm-confirm-bar">
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
                              <span>„{venue.name}" wirklich löschen (deaktivieren)?</span>
                              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                <button
                                  className="adm-btn adm-btn--danger adm-btn--sm"
                                  onClick={() => handleDelete(venue._id)}
                                  disabled={deleting}
                                >
                                  {deleting ? 'Wird gelöscht…' : 'Ja, löschen'}
                                </button>
                                <button
                                  className="adm-btn adm-btn--ghost adm-btn--sm"
                                  onClick={() => setConfirmDelete(null)}
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
