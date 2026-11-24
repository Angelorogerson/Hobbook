// /passwort-neu/:token: choose a new password with the link from the email.
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { apiError } from '@/api/axiosInstance'
import { isLinkToken, resetPassword } from '@/api/authApi'
import { useAuthContext } from '@/store/AuthContext'
import { useToast } from '@/components/ui/Toast'
import DrawnCheck from '@/components/ui/DrawnCheck'
import { MOTION, prefersReducedMotion } from '@/utils/motion'
import './auth.css'

export function validateNewPassword(password: string, confirm: string) {
  const e: { password?: string; confirm?: string } = {}
  if (password.length < 8) e.password = 'Das Passwort muss mindestens 8 Zeichen haben.'
  else if (password.length > 128) e.password = 'Das Passwort darf höchstens 128 Zeichen haben.'
  if (password !== confirm) e.confirm = 'Die Passwörter stimmen nicht überein.'
  return e
}

export default function ResetPasswordPage() {
  const { token } = useParams()
  const [done, setDone] = useState(false)
  const navigate = useNavigate()
  const { setSession } = useAuthContext()
  const toast = useToast()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // A link that cannot be valid is not worth a form; the server decides about the rest.
  const [linkDead, setLinkDead] = useState(!isLinkToken(token))

  if (linkDead || !isLinkToken(token)) {
    return (
      <div className="auth-page">
        <div className="auth-card card">
          <h1>Dieser Link gilt nicht mehr</h1>
          <div className="notice notice-danger" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>Der Link ist ungültig, abgelaufen oder wurde schon benutzt. Ein Link gilt 60 Minuten und nur einmal.</p>
          </div>
          <div className="auth-actions">
            <Link to="/passwort-vergessen" className="btn btn-primary btn-block">
              Neuen Link anfordern
            </Link>
            <Link to="/login" className="btn btn-secondary btn-block">
              Zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        {done ? (
          <div className="done-hit" role="status">
            <DrawnCheck size={72} />
            <h1>Passwort gespeichert</h1>
            <p className="auth-text">Du bist angemeldet. Gleich geht’s weiter …</p>
          </div>
        ) : (
          <>
        <h1>Neues Passwort</h1>
        <p className="auth-text">Lege ein neues Passwort für dein Konto fest. Danach bist du angemeldet.</p>
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            const errs = validateNewPassword(password, confirm)
            setErrors(errs)
            if (Object.keys(errs).length) return
            setBusy(true)
            try {
              const session = await resetPassword(token, password)
              setSession(session.token, session.user)
              toast('Neues Passwort gespeichert. Du bist angemeldet.')
              // 12 · A moment of "done" before the app opens
              setDone(true)
              window.setTimeout(() => navigate('/', { replace: true }), prefersReducedMotion() ? MOTION.dur2 : MOTION.dur8 + MOTION.dur5)
            } catch (err) {
              const info = apiError(err, 'Das Passwort konnte nicht gespeichert werden. Bitte versuche es erneut.')
              if (info.errors.token) setLinkDead(true)
              else if (info.errors.password) setErrors({ password: info.errors.password })
              else setError(info.message)
              setBusy(false)
            }
          }}
        >
          <div className="field">
            <label htmlFor="reset-password">Neues Passwort</label>
            <input
              id="reset-password"
              type="password"
              className="input"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'reset-password-hint reset-password-err' : 'reset-password-hint'}
            />
            <span id="reset-password-hint" className="hint">
              Mindestens 8 Zeichen
            </span>
            {errors.password && (
              <span id="reset-password-err" className="error" role="alert">
                {errors.password}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="reset-confirm">Passwort wiederholen</label>
            <input
              id="reset-confirm"
              type="password"
              className="input"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={!!errors.confirm}
              aria-describedby={errors.confirm ? 'reset-confirm-err' : undefined}
            />
            {errors.confirm && (
              <span id="reset-confirm-err" className="error" role="alert">
                {errors.confirm}
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
            {busy ? 'Wird gespeichert …' : 'Passwort speichern'}
          </button>
        </form>
          </>
        )}
        <p className="auth-switch">
          <Link to="/login">Zurück zur Anmeldung</Link>
        </p>
      </div>
    </div>
  )
}
