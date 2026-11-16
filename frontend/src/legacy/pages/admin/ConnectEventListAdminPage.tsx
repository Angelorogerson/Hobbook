import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllEvents, deleteEvent } from '@/api/connectEventApi'
import type { ConnectEvent } from '@/api/connectEventApi'
import AdminNav from './AdminNav'
import './admin.css'

const SPORT_LABELS: Record<string, string> = {
  football: 'Fußball',
  basketball: 'Basketball',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Offen',
  full: 'Voll',
  cancelled: 'Abgebrochen',
  completed: 'Abgeschlossen',
}

const STATUS_COLORS: Record<string, string> = {
  open: '#4CAF50',
  full: '#FF9800',
  cancelled: '#F44336',
  completed: '#2196F3',
}

export default function ConnectEventListAdminPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<ConnectEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllEvents()
        setEvents(data)
      } catch (err: any) {
        setError(err.message || 'Events konnten nicht geladen werden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent(id)
      setEvents(prev => prev.filter(e => e._id !== id))
      setDeleteConfirm(null)
    } catch (err: any) {
      setError(err.message || 'Event konnte nicht gelöscht werden')
    }
  }

  if (loading) {
    return (
      <div className="adm-page">
        <AdminNav />
        <div className="adm-loading" style={{ minHeight: '60vh' }}>
          <div className="adm-spinner" />
          <span>Events werden geladen…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-page">
      <AdminNav />

      <div className="adm-hero">
        <div className="adm-hero-inner">
          <div className="adm-hero-left">
            <p className="adm-hero-eyebrow">Admin · Connect Events</p>
            <h1 className="adm-hero-title">Event-Verwaltung</h1>
            <p className="adm-hero-sub">Verwalte alle Connect-Events und genehmige Anfragen.</p>
          </div>
          <div className="adm-hero-actions">
            <button 
              className="adm-btn adm-btn--primary"
              onClick={() => navigate('/admin/events/new')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Neues Event
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

        {events.length === 0 ? (
          <div className="adm-empty">
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#ccc' }}>event_note</span>
            <p>Keine Events vorhanden</p>
          </div>
        ) : (
          <div className="adm-table-wrapper">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Titel</th>
                  <th>Sport</th>
                  <th>Ersteller</th>
                  <th>Datum & Zeit</th>
                  <th>Partizipanten</th>
                  <th>Status</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event._id}>
                    <td className="adm-table-cell-title">
                      <strong>{event.title}</strong>
                      <br />
                      <small>{SPORT_LABELS[event.sport]}</small>
                    </td>
                    <td>{SPORT_LABELS[event.sport]}</td>
                    <td>{event.creator?.name || 'Unknown'}</td>
                    <td>
                      <small>
                        {new Date(event.date).toLocaleDateString('de-DE')}
                        <br />
                        {event.startTime} – {event.endTime}
                      </small>
                    </td>
                    <td>
                      <span className="adm-badge">
                        {event.participants.length} / {event.maxParticipants}
                      </span>
                    </td>
                    <td>
                      <span
                        className="adm-status-badge"
                        style={{ backgroundColor: STATUS_COLORS[event.status] }}
                      >
                        {STATUS_LABELS[event.status]}
                      </span>
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button
                          className="adm-btn adm-btn--sm adm-btn--secondary"
                          onClick={() => navigate(`/admin/events/${event._id}/view`)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                        </button>
                        <button
                          className="adm-btn adm-btn--sm adm-btn--secondary"
                          onClick={() => navigate(`/admin/events/${event._id}/edit`)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                        <button
                          className="adm-btn adm-btn--sm adm-btn--danger"
                          onClick={() => setDeleteConfirm(event._id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deleteConfirm && (
          <div className="adm-modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="adm-modal" onClick={e => e.stopPropagation()}>
              <h3>Event löschen?</h3>
              <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
              <div className="adm-modal-actions">
                <button 
                  className="adm-btn adm-btn--ghost"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Abbrechen
                </button>
                <button 
                  className="adm-btn adm-btn--danger"
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
