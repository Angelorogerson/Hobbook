import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, Megaphone, Trash2 } from 'lucide-react'
import { COMMENT_MAX_LENGTH, deleteComment, listComments, postComment, type EventComment } from '@/api/commentApi'
import { apiError } from '@/api/axiosInstance'
import { useAuthContext } from '@/store/AuthContext'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import { Presence } from '@/hooks/usePresence'
import { formatDateTime } from '@/utils/format'
import './EventComments.css'

interface Props {
  eventId: string
  /** The viewer runs this event (organizer, co-host or admin): may send to everyone who is in. */
  isHost?: boolean
  /** Long over: reading only (the server refuses new messages too). */
  closed?: boolean
}

/** "Fragen & Infos": questions to the organizer and announcements from hosts, as plain text. */
export default function EventComments({ eventId, isHost = false, closed = false }: Props) {
  const { authState } = useAuthContext()
  const location = useLocation()
  const toast = useToast()
  const fieldId = useId()

  const [comments, setComments] = useState<EventComment[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [text, setText] = useState('')
  const [toAll, setToAll] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState<EventComment | null>(null)

  useEffect(() => {
    let active = true
    setLoadError('')
    listComments(eventId)
      .then((list) => active && setComments(list))
      .catch((err) => active && setLoadError(apiError(err, 'Die Nachrichten konnten nicht geladen werden.').message))
    return () => {
      active = false
    }
    // Reload when auth changes so the delete buttons are correct.
  }, [eventId, authState.isLoggedIn, reload])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const message = text.trim()
    if (!message || sending) return
    setSending(true)
    setError('')
    try {
      const announce = isHost && toAll
      // Shown only once the server has stored it.
      const created = await postComment(eventId, message, announce ? 'announcement' : 'comment')
      setComments((list) => [...(list || []), created])
      setText('')
      setToAll(false)
      toast(announce ? 'Gesendet. Alle, die dabei sind, bekommen Bescheid.' : 'Gesendet')
    } catch (err) {
      setError(apiError(err, 'Die Nachricht konnte nicht gesendet werden.').message)
    } finally {
      setSending(false)
    }
  }

  const remove = async (comment: EventComment) => {
    setError('')
    try {
      await deleteComment(eventId, comment._id)
      setComments((list) => (list || []).filter((c) => c._id !== comment._id))
      toast('Nachricht gelöscht')
    } catch (err) {
      setError(apiError(err, 'Die Nachricht konnte nicht gelöscht werden.').message)
    } finally {
      setToDelete(null)
    }
  }

  const remaining = COMMENT_MAX_LENGTH - text.length

  return (
    <section className="event-comments" aria-labelledby={`${fieldId}-title`}>
      <h2 id={`${fieldId}-title`}>Fragen &amp; Infos</h2>

      {loadError ? (
        <div className="notice notice-danger" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <div className="notice-body">
            <p>{loadError}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReload((n) => n + 1)}>
              Erneut versuchen
            </button>
          </div>
        </div>
      ) : comments === null ? (
        <p className="hint" role="status">
          Nachrichten werden geladen …
        </p>
      ) : comments.length === 0 ? (
        <p className="comments-empty">Noch keine Fragen. Stell die erste.</p>
      ) : (
        <ul className="comments-list">
          {comments.map((c) => {
            const announcement = c.kind === 'announcement'
            return (
              <li key={c._id} className={`comment${announcement ? ' comment--announcement' : ''}`}>
                <Avatar name={c.author.displayName} size="sm" />
                <div className="comment-body">
                  <p className="comment-meta">
                    <strong>{c.author.displayName}</strong>
                    {announcement ? (
                      <span className="badge badge-neutral">
                        <Megaphone size={12} aria-hidden="true" /> Info vom Organisator
                      </span>
                    ) : (
                      c.author.isHost && <span className="comment-role">Organisator:in</span>
                    )}
                    <time dateTime={c.createdAt}>{formatDateTime(c.createdAt)}</time>
                  </p>
                  <p className="comment-text">{c.text}</p>
                </div>
                {c.canDelete && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-icon comment-delete"
                    aria-label={`Nachricht von ${c.author.displayName} löschen`}
                    title="Löschen"
                    onClick={() => setToDelete(c)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {closed ? (
        <p className="hint">Dieses Event ist schon länger vorbei. Hier kann nichts mehr geschrieben werden.</p>
      ) : authState.isLoggedIn ? (
        <form className="comments-form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={fieldId}>{isHost ? 'Deine Nachricht' : 'Deine Frage oder Nachricht'}</label>
            <textarea
              id={fieldId}
              className="textarea"
              maxLength={COMMENT_MAX_LENGTH}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-describedby={`${fieldId}-hint`}
              placeholder={isHost ? 'z. B. Wir spielen heute auf dem hinteren Platz.' : 'z. B. Kann ich einen Freund mitbringen?'}
            />
            <p className="hint" id={`${fieldId}-hint`}>
              Für alle sichtbar · noch {remaining} Zeichen
            </p>
          </div>
          {isHost && (
            <label className="check-row">
              <input type="checkbox" checked={toAll} onChange={(e) => setToAll(e.target.checked)} />
              An alle Teilnehmenden senden
            </label>
          )}
          <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
            {sending ? 'Wird gesendet …' : 'Senden'}
          </button>
        </form>
      ) : (
        <p className="hint comments-guest">
          <Link to="/login" state={{ from: location.pathname }}>
            Melde dich an
          </Link>
          , um eine Frage zu stellen.
        </p>
      )}
      {error && (
        <p className="error comments-error" role="alert">
          {error}
        </p>
      )}

      <Presence show={!!toDelete}>
        {toDelete && (
          <ConfirmDialog title="Nachricht löschen?" confirmLabel="Löschen" onConfirm={() => remove(toDelete)} onClose={() => setToDelete(null)}>
            <p className="comment-confirm">„{toDelete.text.length > 120 ? `${toDelete.text.slice(0, 120)}…` : toDelete.text}“</p>
            <p className="hint">Das lässt sich nicht rückgängig machen.</p>
          </ConfirmDialog>
        )}
      </Presence>
    </section>
  )
}
