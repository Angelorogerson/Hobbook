import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { getUnreadCount } from '@/api/loopApi'

const POLL_MS = 60_000

/** Unread count for the bell: polled while the tab is visible, refreshed on navigation. */
export function useUnreadCount(enabled: boolean) {
  const [unread, setUnread] = useState(0)
  const { pathname } = useLocation()

  useEffect(() => {
    if (!enabled) {
      setUnread(0)
      return
    }
    let active = true
    const load = () => {
      if (document.visibilityState !== 'visible') return
      getUnreadCount()
        .then((n) => active && setUnread(n))
        .catch(() => {})
    }
    load()
    const timer = window.setInterval(load, POLL_MS)
    const onVisible = () => load()
    const onRead = (e: Event) => setUnread((e as CustomEvent<number>).detail ?? 0)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('hobbook:notifications-read', onRead)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('hobbook:notifications-read', onRead)
    }
  }, [enabled, pathname])

  return unread
}

/** Bell with an unread dot. The dot appears with a small fade and scale; it never shakes. */
export default function NotificationBell({ unread, className = 'nav-link' }: { unread: number; className?: string }) {
  const label = unread ? `Benachrichtigungen, ${unread} ungelesen` : 'Benachrichtigungen'
  return (
    <NavLink to="/benachrichtigungen" className={({ isActive }) => `${className} bell${isActive ? ' active' : ''}`} aria-label={label} title={label}>
      <Bell size={20} aria-hidden="true" />
      {unread > 0 && (
        <span className="bell-dot num" aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </NavLink>
  )
}
