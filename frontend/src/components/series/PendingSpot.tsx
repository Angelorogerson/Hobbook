import { useEffect, useState } from 'react'
import { Check, Hourglass, X } from 'lucide-react'
import { answerEvent, confirmSpot, leaveEvent, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import { formatShortWhen, relativeUntil } from '@/utils/format'

/**
 * Moved up from the waiting list shortly before kick-off: the spot is held for
 * you until `confirmBy`. "Ich komme" keeps it, "Doch nicht" passes it on.
 */
export default function PendingSpot({ event, onChange }: { event: SportEvent; onChange: (e: SportEvent) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [, tick] = useState(0)
  const pending = event.myPendingPromotion
  // Keep the countdown honest while the page is open.
  useEffect(() => {
    if (!pending) return
    const t = window.setInterval(() => tick((n) => n + 1), 30_000)
    return () => window.clearInterval(t)
  }, [pending])
  if (!pending) return null

  const act = async (fn: () => Promise<SportEvent>) => {
    setBusy(true)
    setError('')
    try {
      onChange(await fn())
    } catch (err) {
      setError(apiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pending-spot" role="status">
      <p>
        <Hourglass size={18} aria-hidden="true" />
        <span>
          <strong>Du bist nachgerückt.</strong> Bitte bestätige bis {formatShortWhen(pending.confirmBy, event.timezone)} (
          {relativeUntil(pending.confirmBy)}), sonst geht der Platz an die nächste Person.
        </span>
      </p>
      <div className="pending-spot-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => act(() => (event.series ? answerEvent(event._id, 'in') : confirmSpot(event._id)))}
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
