import { useEffect, useState } from 'react'
import { Hourglass } from 'lucide-react'
import { SLOW_EVENT } from '@/api/axiosInstance'

/**
 * Shown while an API request has been pending for several seconds. On free
 * hosting the server sleeps when idle, so the first request can take up to a minute.
 */
export default function ServerWakeNotice() {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const onSlow = (e: Event) => setSlow((e as CustomEvent<boolean>).detail)
    window.addEventListener(SLOW_EVENT, onSlow)
    return () => window.removeEventListener(SLOW_EVENT, onSlow)
  }, [])

  if (!slow) return null
  return (
    <p className="wake-notice notice notice-info" role="status">
      <Hourglass size={18} aria-hidden="true" />
      Der Server startet gerade. Das kann beim ersten Aufruf bis zu einer Minute dauern.
    </p>
  )
}
