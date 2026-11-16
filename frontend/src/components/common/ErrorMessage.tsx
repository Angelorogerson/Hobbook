import './ErrorMessage.css'

interface ErrorMessageProps {
  message: string
  onClose?: () => void
  type?: 'error' | 'warning' | 'info'
}

export default function ErrorMessage({
  message,
  onClose,
  type = 'error',
}: ErrorMessageProps) {
  const icons = {
    error: '⚠️',
    warning: '⚡',
    info: 'ℹ️',
  }

  return (
    <div className={`error-banner error-banner-${type}`}>
      <div className="error-banner-content">
        <span className="error-banner-icon">{icons[type]}</span>
        <span className="error-banner-text">{message}</span>
      </div>
      {onClose && (
        <button className="error-banner-close" onClick={onClose} type="button">
          ✕
        </button>
      )}
    </div>
  )
}
