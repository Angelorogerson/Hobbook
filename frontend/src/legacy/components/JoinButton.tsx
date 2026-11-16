import { useState } from 'react'
import { useEventContext } from '../../store/EventContext'
import './JoinButton.css'

interface JoinButtonProps {
  eventId: string
  isParticipant: boolean
  onJoinSuccess?: () => void
  onLeaveSuccess?: () => void
  className?: string
}

export function JoinButton({
  eventId,
  isParticipant,
  onJoinSuccess,
  onLeaveSuccess,
  className = '',
}: JoinButtonProps) {
  const { joinEvent, leaveEvent } = useEventContext()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isParticipant) {
        await leaveEvent(eventId)
        onLeaveSuccess?.()
      } else {
        await joinEvent(eventId)
        onJoinSuccess?.()
      }
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`join-button-container ${className}`}>
      <button
        className={`join-button ${isParticipant ? 'joined' : 'not-joined'}`}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? '...' : isParticipant ? 'Beigetreten ✓' : 'Beitreten'}
      </button>
      {error && <p className="join-button-error">{error}</p>}
    </div>
  )
}
