import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Heart, Send } from 'lucide-react'
import { FEEDBACK_KINDS, sendFeedback, type FeedbackKind } from '@/api/feedbackApi'
import { apiError } from '@/api/axiosInstance'
import './FeedbackPage.css'

const MIN = 5
const MAX = 2000

/** The app path the person came from (links may pass it as `state.from`), without query string or hash. */
export function fromPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  const raw = typeof from === 'string' ? from : typeof (from as { pathname?: unknown } | null)?.pathname === 'string' ? (from as { pathname: string }).pathname : ''
  const path = raw.split(/[?#]/)[0]
  return path.startsWith('/') && !path.startsWith('//') ? path.slice(0, 200) : ''
}

/** /feedback: a short message to the people who run Hobbook. Works without an account. */
export default function FeedbackPage() {
  const location = useLocation()
  const page = fromPath(location.state)

  const [kind, setKind] = useState<FeedbackKind>('idea')
  const [text, setText] = useState('')
  // Honeypot: hidden from people, so only bots fill it in.
  const [website, setWebsite] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [sending, setSending] = useState(false)
  const [thanks, setThanks] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)
  const thanksRef = useRef<HTMLHeadingElement>(null)

  // Tell screen-reader users that the page changed to the thank-you state.
  useEffect(() => {
    if (thanks) thanksRef.current?.focus()
  }, [thanks])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    setSubmitError('')
    if (text.trim().length < MIN) {
      setFieldError(`Schreib bitte mindestens ${MIN} Zeichen.`)
      textRef.current?.focus()
      return
    }
    setFieldError('')
    setSending(true)
    try {
      const message = await sendFeedback({ kind, text: text.trim(), ...(page && { page }), ...(website && { website }) })
      setThanks(message || 'Danke für dein Feedback!')
      setText('')
    } catch (err) {
      const info = apiError(err, 'Dein Feedback konnte nicht gesendet werden. Bitte versuche es erneut.')
      if (info.errors.text) {
        setFieldError(info.errors.text)
        textRef.current?.focus()
      } else {
        setSubmitError(info.message)
      }
    } finally {
      setSending(false)
    }
  }

  if (thanks) {
    return (
      <div className="page page--narrow feedback-page">
        <div className="state feedback-thanks">
          <div className="state-icon">
            <Heart size={24} aria-hidden="true" />
          </div>
          <h1 ref={thanksRef} tabIndex={-1}>
            Danke!
          </h1>
          <p role="status">{thanks}</p>
          <div className="feedback-thanks-actions">
            <Link to={page || '/'} className="btn btn-primary">
              <ArrowLeft size={18} aria-hidden="true" /> {page ? 'Zurück' : 'Zur Startseite'}
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => setThanks('')}>
              Noch etwas schreiben
            </button>
          </div>
        </div>
      </div>
    )
  }

  const describedBy = ['fb-text-hint', fieldError ? 'fb-text-error' : ''].filter(Boolean).join(' ')

  return (
    <div className="page page--narrow feedback-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Feedback geben</h1>
          <p className="page-subtitle">Was gefällt dir, was fehlt, was nervt? Schreib es uns – wir lesen jede Nachricht.</p>
        </div>
      </div>

      <form className="card card-pad feedback-form" onSubmit={submit} noValidate>
        <fieldset className="field">
          <legend className="label">Worum geht es?</legend>
          <div className="feedback-kinds">
            {FEEDBACK_KINDS.map((k) => (
              <label key={k.key} className={`chip${kind === k.key ? ' is-on' : ''}`}>
                <input type="radio" name="kind" className="sr-only" value={k.key} checked={kind === k.key} onChange={() => setKind(k.key)} />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="fb-text">Deine Nachricht</label>
          <textarea
            id="fb-text"
            ref={textRef}
            className="textarea feedback-text"
            value={text}
            maxLength={MAX}
            rows={6}
            required
            onChange={(e) => {
              setText(e.target.value)
              if (fieldError) setFieldError('')
            }}
            placeholder="Erzähl kurz, was los ist."
            aria-invalid={!!fieldError}
            aria-describedby={describedBy}
          />
          <span id="fb-text-hint" className="hint">
            {text.length}/{MAX} Zeichen, mindestens {MIN}.
          </span>
          {fieldError && (
            <span id="fb-text-error" className="error" role="alert">
              {fieldError}
            </span>
          )}
        </div>

        {/* Honeypot: invisible and unreachable for people; bots that fill it in are ignored. */}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="fb-website">Website (bitte leer lassen)</label>
          <input
            id="fb-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {submitError && (
          <p className="notice notice-danger" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            {submitError}
          </p>
        )}

        <div className="feedback-actions">
          <button type="submit" className="btn btn-primary" disabled={sending}>
            <Send size={18} aria-hidden="true" /> {sending ? 'Wird gesendet …' : 'Senden'}
          </button>
        </div>
        <p className="hint">Wir speichern deinen Text und, wenn du angemeldet bist, dein Konto dazu.</p>
      </form>
    </div>
  )
}
