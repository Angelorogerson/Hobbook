import { useState } from 'react'
import Modal from '@/components/common/Modal'
import { createReport, reportPerson, REPORT_REASONS } from '@/api/reportApi'
import { apiError } from '@/api/axiosInstance'

interface Props {
  /** Report an event … */
  eventId?: string
  /** … or a person (exactly one of the two). */
  person?: { id: string; name: string }
  onClose: () => void
}

export default function ReportDialog({ eventId, person, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  if (done) {
    return (
      <Modal title="Meldung gesendet" onClose={onClose}>
        <p role="status">{done}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Schließen
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={person ? `${person.name} melden` : 'Event melden'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!reason) {
            setError('Bitte wähle einen Grund aus.')
            return
          }
          setBusy(true)
          setError('')
          try {
            const details = text.trim() || undefined
            setDone(person ? await reportPerson(person.id, reason, details) : await createReport(eventId!, reason, details))
          } catch (err) {
            setError(apiError(err).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <fieldset className="field">
          <legend className="label">Was ist das Problem?</legend>
          {REPORT_REASONS.filter((r) => !person || r.key !== 'wrong_info').map((r) => (
            <label key={r.key} className="radio-row">
              <input type="radio" name="reason" value={r.key} checked={reason === r.key} onChange={() => setReason(r.key)} />
              {r.label}
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="report-text">Details (optional)</label>
          <textarea id="report-text" className="textarea" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Wird gesendet …' : 'Melden'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
