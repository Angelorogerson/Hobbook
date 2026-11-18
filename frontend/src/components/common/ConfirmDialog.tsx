import { useState, type ReactNode } from 'react'
import Modal from './Modal'

interface Props {
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

/** One confirmation pattern for destructive actions: explain, then Abbrechen / confirm. */
export default function ConfirmDialog({ title, children, confirmLabel, onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal title={title} onClose={onClose}>
      {children}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Abbrechen
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await onConfirm()
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
