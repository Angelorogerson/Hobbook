import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Info } from 'lucide-react'
import { useAuthContext } from '@/store/AuthContext'
import { apiError } from '@/api/axiosInstance'
import { Logo } from '@/components/ui/Brand'
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
}

/** After signing in, the target page finishes what the visitor started (e.g. joining). */
export const resumeState = (intent?: string) => (intent === 'join' || intent === 'report' ? { resume: intent } : undefined)

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
        <Link to="/" className="auth-brand">
          <Logo /> Hobbook
        </Link>
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
      </div>
    </div>
  )
}
