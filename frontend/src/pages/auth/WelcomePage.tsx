import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import { useAuthContext } from '@/store/AuthContext'
import { apiError } from '@/api/axiosInstance'
import { getGroup } from '@/api/groupApi'
import { SPORTS } from '@/constants/sports'
import SportIcon from '@/components/ui/SportIcon'
import { loadPlace } from '@/utils/geo'
import { resumeState } from './LoginPage'
import './auth.css'

/** The Stammspiel behind an invite or Stammspiel path, if any ("/s/uniplatz", "/stammspiel/:id"). */
export const groupKeyFrom = (path: string) => path.match(/^\/(?:s|stammspiel)\/([A-Za-z0-9]{6,24})\/?$/)?.[1] ?? null

/**
 * /willkommen — right after sign-up: where you play and what. Both are
 * optional; "Überspringen" goes straight on. Afterwards the visitor lands where
 * they were headed, and what they started there (join, save …) completes by itself.
 */
export default function WelcomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state || {}) as { from?: string; intent?: string }
  const from = state.from && state.from.startsWith('/') ? state.from : '/'
  const { authState, updateUser } = useAuthContext()
  const user = authState.user

  const [city, setCity] = useState(() => {
    if (user?.city) return user.city
    const place = loadPlace()
    return place && 'city' in place ? place.city : ''
  })
  const [sports, setSports] = useState<string[]>(user?.sports || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Coming from a Stammspiel invite: suggest its city and sport.
  useEffect(() => {
    const key = groupKeyFrom(from)
    if (!key) return
    getGroup(key)
      .then((g) => {
        setCity((c) => c || g.location.city)
        setSports((s) => (s.length ? s : [g.sport]))
      })
      .catch(() => {})
  }, [from])

  const goOn = () => navigate(from, { replace: true, state: resumeState(state.intent) })

  const firstName = user?.name?.split(' ')[0] || ''

  return (
    <div className="auth-page">
      <div className="auth-card card welcome-card">
        <h1>{firstName ? `Willkommen, ${firstName}!` : 'Willkommen!'}</h1>
        <p className="page-subtitle">Zwei kurze Fragen, damit du zuerst siehst, was bei dir läuft. Beides kannst du jederzeit im Profil ändern.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            try {
              await updateUser({ city: city.trim(), sports })
              goOn()
            } catch (err) {
              setError(apiError(err).message)
              setBusy(false)
            }
          }}
        >
          <div className="field">
            <label htmlFor="welcome-city">
              <MapPin size={16} aria-hidden="true" /> Wo spielst du?
            </label>
            <input
              id="welcome-city"
              className="input"
              value={city}
              maxLength={100}
              autoComplete="address-level2"
              placeholder="z. B. Kaiserslautern"
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <fieldset className="field">
            <legend className="label">Was spielst du?</legend>
            <div className="welcome-sports">
              {SPORTS.map((s) => (
                <label key={s.key} className={`chip${sports.includes(s.key) ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={sports.includes(s.key)}
                    onChange={() => setSports((cur) => (cur.includes(s.key) ? cur.filter((x) => x !== s.key) : [...cur, s.key]))}
                  />
                  <SportIcon sport={s.key} size={14} /> {s.label}
                </label>
              ))}
            </div>
          </fieldset>
          {error && (
            <p className="notice notice-danger" role="alert">
              {error}
            </p>
          )}
          <div className="welcome-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
              {busy ? 'Speichern …' : 'Weiter'} <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-ghost" onClick={goOn}>
              Überspringen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
