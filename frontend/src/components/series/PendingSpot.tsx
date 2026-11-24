import { useEffect, useRef, useState } from 'react'
import { Check, Hourglass, X } from 'lucide-react'
import { answerEvent, confirmSpot, leaveEvent, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import { formatShortWhen, relativeUntil } from '@/utils/format'
import { celebrate } from '@/utils/celebrate'

/** The ticket entrance plays once per promotion, not on every visit. */
function firstSighting(key: string) {
  try {
    const seen = sessionStorage.getItem('hobbook_seen_promotion')
    if (seen === key) return false
    sessionStorage.setItem('hobbook_seen_promotion', key)
  } catch {
    /* storage unavailable: just show it */
  }
  return true
}

/**
 * Moved up from the waiting list shortly before kick-off: the spot is held for
 * you until `confirmBy`. "Ich komme" keeps it, "Doch nicht" passes it on.
 */
export default function PendingSpot({ event, onChange }: { event: SportEvent; onChange: (e: SportEvent) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [, tick] = useState(0)
  const pending = event.myPendingPromotion
  const [fresh] = useState(() => !!pending && firstSighting(`${event._id}:${pending.confirmBy}`))
  const comeRef = useRef<HTMLButtonElement>(null)
  // Keep the countdown honest while the page is open.
  useEffect(() => {
    if (!pending) return
    const t = window.setInterval(() => tick((n) => n + 1), 30_000)
    return () => window.clearInterval(t)
  }, [pending])
  if (!pending) return null

  const act = async (fn: () => Promise<SportEvent>, cheer = false) => {
    setBusy(true)
    setError('')
    try {
      const next = await fn()
      if (cheer) celebrate(comeRef.current, { count: 10 })
      onChange(next)
    } catch (err) {
      setError(apiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`pending-spot${fresh ? ' is-fresh' : ''}`} role="status">
      <p>
        <span className="pending-clock" aria-hidden="true">
          <svg viewBox="0 0 36 36" width="36" height="36">
            <circle cx="18" cy="18" r="15" />
          </svg>
          <Hourglass size={16} />
        </span>
        <span>
          <strong>Du bist nachgerückt.</strong> Bitte bestätige bis {formatShortWhen(pending.confirmBy, event.timezone)} (
          {relativeUntil(pending.confirmBy)}), sonst geht der Platz an die nächste Person.
        </span>
      </p>
      <div className="pending-spot-actions">
        <button
          type="button"
          ref={comeRef}
          className="btn btn-primary"
          disabled={busy}
          onClick={() => act(() => (event.series ? answerEvent(event._id, 'in') : confirmSpot(event._id)), true)}
        >
          <Check size={16} aria-hidden="true" /> Ich komme
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => act(() => (event.series ? answerEvent(event._id, 'out') : leaveEvent(event._id)))}
        >
          <X size={16} aria-hidden="true" /> Doch nicht
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
