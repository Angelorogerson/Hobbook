import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, Mail, ShieldCheck, Smartphone } from 'lucide-react'
import { useAuthContext } from '@/store/AuthContext'
import { apiError } from '@/api/axiosInstance'
import { getProfile, type PublicProfile } from '@/api/loopApi'
import { currentPushSubscription, disablePush, enablePush, pushSupported } from '@/utils/push'
import { ReliabilityFacts } from './PublicProfilePage'

/** Profile → "Benachrichtigungen": email on/off, push on this device, and your own reliability facts. */
export default function NotificationSettings() {
  const { authState, updateUser } = useAuthContext()
  const user = authState.user!
  const [emailOn, setEmailOn] = useState(user.emailNotifications !== false)
  const [pushOn, setPushOn] = useState(false)
  const [busy, setBusy] = useState<'email' | 'push' | null>(null)
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const [me, setMe] = useState<PublicProfile | null>(null)

  useEffect(() => {
    currentPushSubscription()
      .then((s) => setPushOn(!!s))
      .catch(() => {})
    getProfile(user._id)
      .then(setMe)
      .catch(() => {})
  }, [user._id])

  const toggleEmail = async (on: boolean) => {
    setBusy('email')
    setMsg(null)
    try {
      await updateUser({ emailNotifications: on })
      setEmailOn(on)
      setMsg({ tone: 'success', text: on ? 'E-Mails sind an.' : 'E-Mails sind aus. In der App siehst du weiterhin alles.' })
    } catch (err) {
      setMsg({ tone: 'danger', text: apiError(err).message })
    } finally {
      setBusy(null)
    }
  }

  const togglePush = async (on: boolean) => {
    setBusy('push')
    setMsg(null)
    try {
      if (on) await enablePush()
      else await disablePush()
      setPushOn(on)
      setMsg({ tone: 'success', text: on ? 'Push ist auf diesem Gerät an.' : 'Push ist auf diesem Gerät aus.' })
    } catch (err) {
      setMsg({ tone: 'danger', text: err instanceof Error ? err.message : 'Das hat nicht geklappt.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <section className="card profile-section" id="benachrichtigungen">
        <h2>Benachrichtigungen</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          <BellRing size={14} aria-hidden="true" /> In der App (Glocke) siehst du immer alles. Pro Termin schicken wir höchstens: Einladung, eine Erinnerung,
          ob's stattfindet, und kurz vorher die Erinnerung. Absagen und Änderungen kommen immer.
        </p>
        <label className="check-row">
          <input type="checkbox" checked={emailOn} disabled={busy === 'email'} onChange={(e) => toggleEmail(e.target.checked)} />
          <span>
            <Mail size={16} aria-hidden="true" /> E-Mails an {user.email}
          </span>
        </label>
        {pushSupported() && (
          <label className="check-row">
            <input type="checkbox" checked={pushOn} disabled={busy === 'push'} onChange={(e) => togglePush(e.target.checked)} />
            <span>
              <Smartphone size={16} aria-hidden="true" /> Push auf diesem Gerät
            </span>
          </label>
        )}
        <p className="hint">Einzelne Stammspiele kannst du auf ihrer Seite stummschalten.</p>
        {msg && (
          <p className={`notice notice-${msg.tone}`} role={msg.tone === 'danger' ? 'alert' : 'status'}>
            {msg.text}
          </p>
        )}
      </section>

      {me?.reliability && (
        <section className="card profile-section">
          <h2>
            <ShieldCheck size={18} aria-hidden="true" /> Deine Verlässlichkeit
          </h2>
          <ReliabilityFacts r={me.reliability} self />
          <p className="hint">
            So sehen andere dich: <Link to={`/leute/${user._id}`}>dein öffentliches Profil</Link>.
          </p>
        </section>
      )}
    </>
  )
}
