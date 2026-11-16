import { useState } from 'react'
import Modal from '@/components/common/Modal'
import { cancelEvent, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'

interface Props {
  event: SportEvent
  onClose: () => void
  onCancelled: (e: SportEvent) => void
}

export default function CancelEventDialog({ event, onClose, onCancelled }: Props) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return (
    <Modal title="Event absagen?" onClose={onClose}>
      <p style={{ marginBottom: 12 }}>
        „{event.title}“ bleibt sichtbar und wird als <strong>abgesagt</strong> markiert, damit alle{' '}
        {event.participantCount} Angemeldeten Bescheid wissen.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          try {
            onCancelled(await cancelEvent(event._id, reason.trim() || undefined))
          } catch (err) {
            setError(apiError(err).message)
            setBusy(false)
          }
        }}
      >
        <div className="field">
          <label htmlFor="cancel-reason">Grund (optional, für Teilnehmende sichtbar)</label>
          <textarea
            id="cancel-reason"
            className="textarea"
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z. B. Platz gesperrt, Unwetter"
          />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Zurück
          </button>
          <button type="submit" className="btn btn-danger" disabled={busy}>
            {busy ? 'Wird abgesagt …' : 'Event absagen'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
