import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, BellRing } from 'lucide-react'
import { createAlert, deleteAlert, findAlert, listAlerts, type SearchAlert } from '@/api/alertApi'
import { apiError } from '@/api/axiosInstance'
import { useAuthContext } from '@/store/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { sportLabel } from '@/constants/sports'

interface Props {
  city: string
  /** Sport key when a sport filter is set; otherwise the alert covers all sports. */
  sport?: string
  /** "primary" for the empty state, "quiet" for the small line below results. */
  variant?: 'primary' | 'quiet'
}

// Discover also renders outside the signed-in app shell (tests, previews): no provider means guest.
function useViewer() {
  try {
    return useAuthContext().authState
  } catch {
    return null
  }
}

/**
 * "Sag mir Bescheid": a search alert for this city (and sport). Guests are sent
 * to the login page and come back to the same search.
 */
export default function AlertButton({ city, sport, variant = 'primary' }: Props) {
  const viewer = useViewer()
  const loggedIn = !!viewer?.isLoggedIn
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [alerts, setAlerts] = useState<SearchAlert[]>([])
  const [busy, setBusy] = useState(false)

  // Signed-in people see at once whether this search already has an alert.
  useEffect(() => {
    if (!loggedIn) {
      setAlerts([])
      return
    }
    let stale = false
    listAlerts()
      .then((list) => {
        if (!stale) setAlerts(list)
      })
      .catch(() => {})
    return () => {
      stale = true
    }
  }, [loggedIn])

  const existing = useMemo(() => findAlert(alerts, city, sport), [alerts, city, sport])
  const what = sport ? `${sportLabel(sport)}-Events` : 'Events'

  const toggle = async () => {
    if (!loggedIn) {
      navigate('/login', { state: { from: location.pathname + location.search, intent: 'alert' } })
      return
    }
    setBusy(true)
    try {
      if (existing) {
        setAlerts(await deleteAlert(existing._id))
        toast('Alarm entfernt.')
      } else {
        const res = await createAlert(city, sport)
        setAlerts(res.alerts)
        toast(`Alarm aktiv – wir sagen dir Bescheid bei neuen ${what} in ${city}.`)
      }
    } catch (err) {
      toast(apiError(err, 'Das hat nicht geklappt. Bitte versuch es noch einmal.').message, 'danger')
    } finally {
      setBusy(false)
    }
  }

  const look = variant === 'quiet' ? 'btn btn-ghost btn-sm' : 'btn btn-secondary'
  return (
    <button
      type="button"
      className={`${look} alert-btn${existing ? ' is-active' : ''}`}
      title={existing ? 'Alarm entfernen' : undefined}
      disabled={busy}
      onClick={toggle}
    >
      {existing ? (
        <>
          <BellRing size={variant === 'quiet' ? 16 : 18} aria-hidden="true" />
          <span>
            Alarm aktiv
            <span className="sr-only">
              {' '}
              für neue {what} in {city}. Tippen zum Entfernen.
            </span>
          </span>
        </>
      ) : (
        <>
          <Bell size={variant === 'quiet' ? 16 : 18} aria-hidden="true" />
          <span>
            Sag mir Bescheid bei neuen {what} in {city}
          </span>
        </>
      )}
    </button>
  )
}
