import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Info } from 'lucide-react'
import { useAuthContext } from '@/store/AuthContext'
import { apiError } from '@/api/axiosInstance'
import './auth.css'

interface FromState {
  from?: string
  intent?: string
}

export const INTENT_TEXT: Record<string, string> = {
  join: 'Melde dich an, um bei diesem Event mitzumachen.',
  report: 'Melde dich an, um dieses Event zu melden.',
  create: 'Melde dich an, um ein Event zu erstellen.',
  mine: 'Melde dich an, um deine Events zu sehen.',
  save: 'Melde dich an, um Events zu merken.',
  group: 'Melde dich an, um beim Stammspiel mitzumachen. Danach antwortest du jede Woche mit einem Tipp – auch direkt aus der E-Mail.',
}

/** After signing in, the target page finishes what the visitor started (e.g. joining). */
export const resumeState = (intent?: string) =>
  intent === 'join' || intent === 'report' || intent === 'save' || intent === 'group' ? { resume: intent } : undefined

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state || {}) as FromState
  const from = state.from && state.from.startsWith('/') ? state.from : '/'
  const { login } = useAuthContext()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1>Anmelden</h1>
        {state.intent && INTENT_TEXT[state.intent] && (
          <p className="notice notice-info" role="status">
            <Info size={18} aria-hidden="true" />
            {INTENT_TEXT[state.intent]}
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            if (!email.trim() || !password) {
              setError('Bitte E-Mail und Passwort eingeben.')
              return
            }
            setBusy(true)
            try {
              await login(email.trim(), password)
              navigate(from, { replace: true, state: resumeState(state.intent) })
            } catch (err) {
              setError(apiError(err, 'Anmeldung fehlgeschlagen.').message)
              setBusy(false)
            }
          }}
          noValidate
        >
          <div className="field">
            <label htmlFor="login-email">E-Mail</label>
            <input id="login-email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="login-password">Passwort</label>
            <input id="login-password" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Link to="/passwort-vergessen" state={email.trim() ? { email: email.trim() } : undefined} className="auth-forgot">
              Passwort vergessen?
            </Link>
          </div>
          {error && (
            <p className="notice notice-danger" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Wird angemeldet …' : 'Anmelden'}
          </button>
        </form>
        <p className="auth-switch">
          Noch kein Konto?{' '}
          <Link to="/registrieren" state={location.state}>
            Kostenlos registrieren
          </Link>
        </p>
        <p className="auth-more">
          <Link to="/ueber">So funktioniert’s</Link> · <Link to="/regeln">Regeln</Link> · <Link to="/datenschutz">Datenschutz</Link> ·{' '}
          <Link to="/impressum">Impressum</Link>
        </p>
      </div>
    </div>
  )
}
