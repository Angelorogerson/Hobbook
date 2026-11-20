// /passwort-vergessen: ask for a reset link by email.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, MailCheck } from 'lucide-react'
import { apiError } from '@/api/axiosInstance'
import { requestPasswordReset } from '@/api/authApi'
import './auth.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function ForgotPasswordPage() {
  const location = useLocation()
  // The login page hands over what was already typed there.
  const prefill = (location.state as { email?: string } | null)?.email
  const [email, setEmail] = useState(typeof prefill === 'string' ? prefill : '')
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const sentHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (sentTo) sentHeading.current?.focus()
  }, [sentTo])

  // One neutral confirmation: it never says whether the address has an account.
  if (sentTo) {
    return (
      <div className="auth-page">
        <div className="auth-card card">
          <h1 ref={sentHeading} tabIndex={-1}>
            Schau in dein Postfach
          </h1>
          <div className="notice notice-success" role="status">
            <MailCheck size={18} aria-hidden="true" />
            <p>
              Wenn es ein Konto mit <strong className="auth-email">{sentTo}</strong> gibt, haben wir dir einen Link geschickt. Er gilt 60 Minuten.
            </p>
          </div>
          <p className="auth-text">Nichts angekommen? Schau im Spam-Ordner nach oder prüfe, ob die Adresse stimmt.</p>
          <div className="auth-actions">
            <Link to="/login" className="btn btn-primary btn-block">
              Zur Anmeldung
            </Link>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setSentTo('')}>
              Andere Adresse eingeben
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1>Passwort vergessen?</h1>
        <p className="auth-text">Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst.</p>
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            const value = email.trim()
            if (!EMAIL_PATTERN.test(value)) {
              setFieldError('Bitte gib eine gültige E-Mail-Adresse ein.')
              return
            }
            setFieldError('')
            setBusy(true)
            try {
              await requestPasswordReset(value)
              setSentTo(value)
            } catch (err) {
              const info = apiError(err, 'Das hat nicht geklappt. Bitte versuche es erneut.')
              if (info.errors.email) setFieldError(info.errors.email)
              else setError(info.message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <div className="field">
            <label htmlFor="forgot-email">E-Mail</label>
            <input
              id="forgot-email"
              type="email"
              className="input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? 'forgot-email-err' : undefined}
            />
            {fieldError && (
              <span id="forgot-email-err" className="error" role="alert">
                {fieldError}
              </span>
            )}
          </div>
          {error && (
            <p className="notice notice-danger" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Wird gesendet …' : 'Link senden'}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/login">Zurück zur Anmeldung</Link>
        </p>
      </div>
    </div>
  )
}
