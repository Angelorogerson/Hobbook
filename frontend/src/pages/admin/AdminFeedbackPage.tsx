import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, MessageSquareHeart, Trash2, Undo2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/DataPieces'
import { deleteFeedback, feedbackKindLabel, listFeedback, updateFeedback, type FeedbackItem, type FeedbackStatus } from '@/api/feedbackApi'
import { apiError } from '@/api/axiosInstance'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Presence } from '@/hooks/usePresence'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/utils/format'
import AdminNav from './AdminNav'
import './admin.css'

const STATUS_TEXT: Record<FeedbackStatus, string> = { open: 'Offen', done: 'Erledigt' }

/** /admin/feedback: what people wrote to the operators. */
export default function AdminFeedbackPage() {
  const [status, setStatus] = useState<FeedbackStatus>('open')
  const [items, setItems] = useState<FeedbackItem[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<FeedbackItem | null>(null)
  const toast = useToast()

  const load = useCallback(() => {
    setItems(null)
    setLoadError('')
    setActionError('')
    let active = true
    listFeedback(status)
      .then((list) => {
        if (active) setItems(list)
      })
      .catch((err) => {
        if (active) setLoadError(apiError(err, 'Das Feedback konnte nicht geladen werden.').message)
      })
    return () => {
      active = false
    }
  }, [status])

  useEffect(load, [load])

  const remove = (id: string) => setItems((list) => (list ? list.filter((f) => f._id !== id) : list))

  const move = async (f: FeedbackItem, next: FeedbackStatus) => {
    setBusy(f._id)
    setActionError('')
    try {
      await updateFeedback(f._id, next)
      // It now belongs to the other filter.
      remove(f._id)
      toast(next === 'done' ? 'Als erledigt markiert' : 'Wieder geöffnet')
    } catch (err) {
      setActionError(apiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="page admin">
      <div className="page-head">
        <h1 className="page-title">Moderation</h1>
      </div>
      <AdminNav />

      <div className="admin-filter" role="group" aria-label="Status">
        {(['open', 'done'] as FeedbackStatus[]).map((s) => (
          <button key={s} type="button" className={`chip${status === s ? ' is-on' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
            {STATUS_TEXT[s]}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="notice notice-danger" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div className="notice-body">
            <p>{loadError}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              Erneut versuchen
            </button>
          </div>
        </div>
      )}
      {actionError && (
        <p className="notice notice-danger" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          {actionError}
        </p>
      )}
      {!items && !loadError && <LoadingSpinner />}
      {items && items.length === 0 && (
        <EmptyState
          icon={<MessageSquareHeart size={24} aria-hidden="true" />}
          title={status === 'open' ? 'Kein offenes Feedback.' : 'Noch kein erledigtes Feedback.'}
        >
          {status === 'open' ? 'Neue Nachrichten erscheinen hier.' : undefined}
        </EmptyState>
      )}

      <ul className="admin-list">
        {items?.map((f) => (
          <li key={f._id} className="card admin-item">
            <div className="admin-item-head">
              <strong>{feedbackKindLabel(f.kind)}</strong>
              <span className="admin-meta">
                {formatDateTime(f.createdAt)} · von {f.from}
              </span>
            </div>
            <p className="admin-feedback-text">{f.text}</p>
            {f.page && (
              <p className="admin-meta admin-feedback-page">
                Seite: <Link to={f.page}>{f.page}</Link>
              </p>
            )}
            <div className="admin-actions">
              {f.status === 'open' ? (
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy === f._id} onClick={() => move(f, 'done')}>
                  <Check size={14} aria-hidden="true" /> Erledigt
                </button>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy === f._id} onClick={() => move(f, 'open')}>
                  <Undo2 size={14} aria-hidden="true" /> Wieder öffnen
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy === f._id} onClick={() => setDeleting(f)}>
                <Trash2 size={14} aria-hidden="true" /> Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Presence show={!!deleting}>
        {deleting && (
          <ConfirmDialog
            title="Feedback löschen?"
            confirmLabel="Endgültig löschen"
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              const f = deleting
              try {
                await deleteFeedback(f._id)
                remove(f._id)
                toast('Feedback gelöscht')
              } catch (err) {
                setActionError(apiError(err).message)
              }
              setDeleting(null)
            }}
          >
            <p>
              Die Nachricht von {deleting.from} vom {formatDateTime(deleting.createdAt)} wird endgültig gelöscht.
            </p>
          </ConfirmDialog>
        )}
      </Presence>
    </div>
  )
}
