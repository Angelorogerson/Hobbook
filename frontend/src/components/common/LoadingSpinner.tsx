import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'sm' | 'lg'
  fullScreen?: boolean
}

export default function LoadingSpinner({ size = 'lg', fullScreen = false }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="spinner-fullscreen">
        <div className={`spinner spinner-${size}`}></div>
      </div>
    )
  }

  return <div className={`spinner spinner-${size}`}></div>
}
