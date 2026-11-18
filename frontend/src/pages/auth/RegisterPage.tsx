import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Info } from 'lucide-react'
import { useAuthContext } from '@/store/AuthContext'
import { apiError } from '@/api/axiosInstance'
import { INTENT_TEXT } from './LoginPage'
import './auth.css'

export function validateRegistration(v: { name: string; email: string; password: string; confirm: string; age: boolean }) {
  const e: Record<string, string> = {}
  if (v.name.trim().length < 2) e.name = 'Bitte gib deinen Namen an (mind. 2 Zeichen).'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = 'Bitte gib eine gültige E-Mail-Adresse ein.'
  if (v.password.length < 8) e.password = 'Das Passwort muss mindestens 8 Zeichen haben.'
  if (v.password !== v.confirm) e.confirm = 'Die Passwörter stimmen nicht überein.'
  if (!v.age) e.age = 'Bitte bestätige, dass du mindestens 16 Jahre alt bist.'
  return e
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state || {}) as { from?: string; intent?: string }
  const from = state.from && state.from.startsWith('/') ? state.from : '/'
  const { register } = useAuthContext()

  const [v, setV] = useState({ name: '', email: '', password: '', confirm: '', age: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const field = (key: 'name' | 'email' | 'password' | 'confirm', label: string, type: string, autoComplete: string, hint?: string) => (
    <div className="field">
      <label htmlFor={`reg-${key}`}>{label}</label>
      <input
        id={`reg-${key}`}
        type={type}
        className="input"
        autoComplete={autoComplete}
        value={v[key]}
        onChange={(e) => setV({ ...v, [key]: e.target.value })}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `reg-${key}-err` : undefined}
      />
      {hint && <span className="hint">{hint}</span>}
      {errors[key] && (
        <span id={`reg-${key}-err`} className="error">
          {errors[key]}
        </span>
      )}
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1>Konto erstellen</h1>
        {state.intent && INTENT_TEXT[state.intent] && (
          <p className="notice notice-info" role="status">
            <Info size={18} aria-hidden="true" />
            {INTENT_TEXT[state.intent]}
          </p>
        )}
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            const errs = validateRegistration(v)
            setErrors(errs)
            if (Object.keys(errs).length) return
            setBusy(true)
            try {
              await register({ name: v.name.trim(), email: v.email.trim(), password: v.password, ageConfirmed: true })
              // Two quick questions first (city, sports); the welcome page then continues to `from`.
              navigate('/willkommen', { replace: true, state: { from, intent: state.intent } })
            } catch (err) {
              const info = apiError(err, 'Registrierung fehlgeschlagen.')
              setError(info.message)
              setErrors(info.errors)
              setBusy(false)
            }
          }}
        >
          {field('name', 'Name', 'text', 'name', 'Öffentlich sichtbar ist nur „Vorname N.“')}
          {field('email', 'E-Mail', 'email', 'email')}
          {field('password', 'Passwort', 'password', 'new-password', 'Mindestens 8 Zeichen')}
          {field('confirm', 'Passwort wiederholen', 'password', 'new-password')}
          <div className="field">
            <label className="check-row" htmlFor="reg-age">
              <input
                id="reg-age"
                type="checkbox"
                checked={v.age}
                onChange={(e) => setV({ ...v, age: e.target.checked })}
                aria-invalid={!!errors.age}
                aria-describedby={errors.age ? 'reg-age-err' : undefined}
              />
              Ich bin mindestens 16 Jahre alt.
            </label>
            {errors.age && (
              <span id="reg-age-err" className="error">
                {errors.age}
              </span>
            )}
          </div>
          {error && (
            <p className="notice notice-danger" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              {error}
            </p>
          )}
          <p className="hint" style={{ marginBottom: 12 }}>
            Mit der Registrierung akzeptierst du unsere <Link to="/datenschutz">Datenschutzhinweise</Link>.
          </p>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Konto wird erstellt …' : 'Registrieren'}
          </button>
        </form>
        <p className="auth-switch">
          Schon registriert?{' '}
          <Link to="/login" state={location.state}>
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
