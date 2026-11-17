import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'sm' | 'lg'
  fullScreen?: boolean
  label?: string
}

export default function LoadingSpinner({ size = 'lg', fullScreen = false, label = 'Wird geladen …' }: LoadingSpinnerProps) {
  const spinner = <span className={`spinner spinner-${size}`} aria-hidden="true" />
  return (
    <div className={fullScreen ? 'spinner-fullscreen' : 'spinner-block'} role="status">
      {spinner}
      <span className="sr-only">{label}</span>
    </div>
  )
}
