import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listReports, updateReport, REPORT_REASONS, type Report, type ReportStatus } from '@/api/reportApi'
import { apiError } from '@/api/axiosInstance'
import StatusBadge from '@/components/events/StatusBadge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { formatDateTime } from '@/utils/format'
import AdminNav from './AdminNav'
import './admin.css'

const reasonLabel = (k: string) => REPORT_REASONS.find((r) => r.key === k)?.label || k
const STATUS_TEXT: Record<ReportStatus, string> = { open: 'Offen', resolved: 'Erledigt', dismissed: 'Verworfen' }

export default function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus>('open')
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    setReports(null)
    setError('')
    listReports(status)
      .then(setReports)
      .catch((err) => setError(apiError(err).message))
  }, [status])

  useEffect(load, [load])

  const act = async (r: Report, body: { status: ReportStatus; cancelEvent?: boolean }) => {
    setBusy(r._id)
    try {
      await updateReport(r._id, body)
      load()
    } catch (err) {
      setError(apiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="page admin">
      <h1 className="page-title">Moderation</h1>
      <AdminNav />

      <div className="admin-filter" role="group" aria-label="Status">
        {(['open', 'resolved', 'dismissed'] as ReportStatus[]).map((s) => (
          <button key={s} type="button" className={`chip${status === s ? '' : ' chip-off'}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
            {STATUS_TEXT[s]}
          </button>
        ))}
      </div>

      {error && (
        <p className="notice notice-danger" role="alert">
          {error}
        </p>
      )}
      {!reports && !error && <LoadingSpinner />}
      {reports && reports.length === 0 && <p className="admin-empty">Keine Meldungen mit Status „{STATUS_TEXT[status]}“.</p>}

      <ul className="admin-list">
        {reports?.map((r) => (
          <li key={r._id} className="card admin-item">
            <div className="admin-item-head">
              <strong>{reasonLabel(r.reason)}</strong>
              <span className="admin-meta">
                {formatDateTime(r.createdAt)} · von {r.reporter?.displayName || 'gelöschtem Konto'}
              </span>
            </div>
            {r.text && <p className="admin-text">„{r.text}“</p>}
            {r.event ? (
              <p>
                Event: <Link to={`/events/${r.event._id}`}>{r.event.title}</Link> <StatusBadge status={r.event.status} />{' '}
                <span className="admin-meta">
                  ({r.event.location.city}, organisiert von {r.event.organizer.displayName})
                </span>
              </p>
            ) : (
              <p className="admin-meta">Event wurde gelöscht.</p>
            )}
            {r.note && <p className="admin-meta">Notiz: {r.note}</p>}
            {r.status === 'open' && (
              <div className="admin-actions">
                {r.event && (r.event.status === 'open' || r.event.status === 'full') && (
                  <button type="button" className="btn btn-danger btn-sm" disabled={busy === r._id} onClick={() => act(r, { status: 'resolved', cancelEvent: true })}>
                    Event absagen & erledigen
                  </button>
                )}
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy === r._id} onClick={() => act(r, { status: 'resolved' })}>
                  Erledigt
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy === r._id} onClick={() => act(r, { status: 'dismissed' })}>
                  Verwerfen
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
