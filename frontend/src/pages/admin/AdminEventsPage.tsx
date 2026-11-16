import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllEventsAdmin, deleteEvent, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import StatusBadge from '@/components/events/StatusBadge'
import CancelEventDialog from '@/components/events/CancelEventDialog'
import Modal from '@/components/common/Modal'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { sportLabel } from '@/constants/sports'
import { formatEventDate } from '@/utils/format'
import AdminNav from './AdminNav'
import './admin.css'

export default function AdminEventsPage() {
  const [events, setEvents] = useState<SportEvent[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState<SportEvent | null>(null)
  const [deleting, setDeleting] = useState<SportEvent | null>(null)

  const load = useCallback(() => {
    setError('')
    listAllEventsAdmin()
      .then((r) => {
        setEvents(r.events)
        setTotal(r.total)
      })
      .catch((err) => setError(apiError(err).message))
  }, [])

  useEffect(load, [load])

  return (
    <div className="page admin">
      <h1 className="page-title">Moderation</h1>
      <AdminNav />
      {error && (
        <p className="notice notice-danger" role="alert">
          {error}
        </p>
      )}
      {!events && !error && <LoadingSpinner />}
      {events && (
        <>
          <p className="admin-meta">
            {total} Events insgesamt{total > events.length ? `, die neuesten ${events.length} werden angezeigt` : ''}.
          </p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="sr-only">Alle Events</caption>
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Wann</th>
                  <th scope="col">Ort</th>
                  <th scope="col">Status</th>
                  <th scope="col">Plätze</th>
                  <th scope="col">
                    <span className="sr-only">Aktionen</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const { day, time } = formatEventDate(e.startAt, e.endAt, e.timezone)
                  const active = e.status === 'open' || e.status === 'full'
                  return (
                    <tr key={e._id}>
                      <td>
                        <Link to={`/events/${e._id}`}>{e.title}</Link>
                        <div className="admin-meta">
                          {sportLabel(e.sport)} · {e.organizer.displayName}
                          {e.visibility === 'unlisted' ? ' · nur per Link' : ''}
                        </div>
                      </td>
                      <td>
                        {day}
                        <div className="admin-meta">{time}</div>
                      </td>
                      <td>{e.location.city}</td>
                      <td>
                        <StatusBadge status={e.status} />
                      </td>
                      <td>
                        {e.participantCount}/{e.maxParticipants}
                      </td>
                      <td className="admin-row-actions">
                        {active && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCancelling(e)}>
                            Absagen
                          </button>
                        )}
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleting(e)}>
                          Löschen
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {cancelling && (
        <CancelEventDialog
          event={cancelling}
          onClose={() => setCancelling(null)}
          onCancelled={() => {
            setCancelling(null)
            load()
          }}
        />
      )}
      {deleting && (
        <Modal title="Event endgültig löschen?" onClose={() => setDeleting(null)}>
          <p>
            „{deleting.title}“ wird für alle {deleting.participantCount} Teilnehmenden ohne Hinweis entfernt. Für normale
            Fälle ist „Absagen“ transparenter.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setDeleting(null)}>
              Abbrechen
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                const ev = deleting
                setDeleting(null)
                try {
                  await deleteEvent(ev._id)
                } catch (err) {
                  setError(apiError(err).message)
                }
                load()
              }}
            >
              Löschen
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
