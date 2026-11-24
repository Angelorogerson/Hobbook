// /email-bestaetigen/:token: confirm the email address with the link from the email.
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { apiError } from '@/api/axiosInstance'
import { isLinkToken, verifyEmail } from '@/api/authApi'
import { useAuthContext } from '@/store/AuthContext'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import './auth.css'
import DrawnCheck from '@/components/ui/DrawnCheck'

type Status = 'working' | 'done' | 'failed'

export default function VerifyEmailPage() {
  const { token } = useParams()
  const { authState, refreshUser } = useAuthContext()
  const [status, setStatus] = useState<Status>(isLinkToken(token) ? 'working' : 'failed')
  const [message, setMessage] = useState('')

  // The link works once, so it is sent exactly once per token. The ref survives
  // React StrictMode running effects twice; the result is deliberately not
  // dropped on cleanup, or the second run would never show it.
  const sentFor = useRef<string | null>(null)
  useEffect(() => {
    if (!isLinkToken(token)) {
      setStatus('failed')
      return
    }
    if (sentFor.current === token) return
    sentFor.current = token
    setStatus('working')
    verifyEmail(token)
      .then((res) => {
        setMessage(res.alreadyVerified ? 'Deine E-Mail-Adresse ist schon bestätigt.' : 'Deine E-Mail-Adresse ist bestätigt.')
        setStatus('done')
      })
      .catch((err) => {
        const info = apiError(err, 'Die Bestätigung hat nicht geklappt. Bitte versuche es erneut.')
        // A dead link gets the full explanation below; other problems (no connection, too many tries) their own message.
        setMessage(info.errors.token ? '' : info.message)
        setStatus('failed')
      })
  }, [token])

  // Once confirmed, bring the signed-in account up to date (the hint in the profile disappears).
  // Waits until the stored session has been restored, so the fresh answer is not overwritten.
  const refreshed = useRef(false)
  useEffect(() => {
    if (status !== 'done' || authState.isLoading || !authState.isLoggedIn || refreshed.current) return
    refreshed.current = true
    refreshUser().catch(() => {})
  }, [status, authState.isLoading, authState.isLoggedIn, refreshUser])

  return (
    <div className="auth-page">
      <div className="auth-card card">
        {status === 'working' && (
          <>
            <h1>E-Mail-Adresse bestätigen</h1>
            <LoadingSpinner label="Deine E-Mail-Adresse wird bestätigt …" />
            <p className="auth-text auth-center" aria-hidden="true">
              Einen Moment …
            </p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="done-hit">
              <DrawnCheck size={72} />
              <h1>Bestätigt</h1>
            </div>
            <div className="notice notice-success" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              <p>{message} Danke!</p>
            </div>
            <div className="auth-actions">
              <Link to="/" className="btn btn-primary btn-block">
                Zu den Events
              </Link>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <h1>Das hat nicht geklappt</h1>
            <div className="notice notice-danger" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <p>{message || 'Der Link ist ungültig, abgelaufen oder wurde schon benutzt. Ein Link gilt 7 Tage.'}</p>
            </div>
            {authState.isLoggedIn ? (
              <>
                <p className="auth-text">In deinem Profil kannst du dir einen neuen Link schicken lassen.</p>
                <div className="auth-actions">
                  <Link to="/profil" className="btn btn-primary btn-block">
                    Zum Profil
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="auth-text">Melde dich an. In deinem Profil kannst du dir dann einen neuen Link schicken lassen.</p>
                <div className="auth-actions">
                  <Link to="/login" state={{ from: '/profil' }} className="btn btn-primary btn-block">
                    Anmelden
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
