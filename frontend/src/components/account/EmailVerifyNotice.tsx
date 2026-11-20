// Profile: hint while the email address is unconfirmed, with a way to get a new link.
import { useState } from 'react'
import { MailWarning } from 'lucide-react'
import { apiError } from '@/api/axiosInstance'
import { resendVerification } from '@/api/authApi'
import { useAuthContext } from '@/store/AuthContext'
import { useToast } from '@/components/ui/Toast'

type State = { kind: 'idle' } | { kind: 'busy' } | { kind: 'sent' } | { kind: 'error'; text: string }

export default function EmailVerifyNotice() {
  const { authState, refreshUser } = useAuthContext()
  const toast = useToast()
  const [state, setState] = useState<State>({ kind: 'idle' })
  const user = authState.user

  // Only for accounts we know to be unconfirmed; nothing is blocked either way.
  if (!user || user.emailVerified !== false) return null

  const resend = async () => {
    setState({ kind: 'busy' })
    try {
      const res = await resendVerification()
      if (res.emailVerified) {
        // Confirmed in the meantime (e.g. on the phone): the hint just goes away.
        toast('Deine E-Mail-Adresse ist schon bestätigt.')
        await refreshUser().catch(() => {})
        setState({ kind: 'idle' })
        return
      }
      setState({ kind: 'sent' })
    } catch (err) {
      setState({ kind: 'error', text: apiError(err, 'Der Link konnte nicht gesendet werden. Bitte versuche es erneut.').message })
    }
  }

  return (
    <section className="notice notice-warning" aria-label="E-Mail-Adresse bestätigen">
      <MailWarning size={20} aria-hidden="true" />
      <div className="notice-body">
        <p>
          <strong>Deine E-Mail-Adresse ist noch nicht bestätigt.</strong> Öffne den Link in der E-Mail, die wir dir geschickt haben. So wissen wir,
          dass Nachrichten zu deinen Events bei dir ankommen.
        </p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={resend} disabled={state.kind === 'busy'}>
          {state.kind === 'busy' ? 'Wird gesendet …' : 'Link erneut senden'}
        </button>
        {state.kind === 'sent' && (
          <p role="status">Neuer Link ist unterwegs. Schau in dein Postfach, auch im Spam-Ordner. Er gilt 7 Tage.</p>
        )}
        {state.kind === 'error' && (
          <p className="error" role="alert">
            {state.text}
          </p>
        )}
      </div>
    </section>
  )
}
