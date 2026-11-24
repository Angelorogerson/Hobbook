import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { getUnreadCount } from '@/api/loopApi'
import { usePrevious } from '@/hooks/useOnChange'
import { Presence } from '@/hooks/usePresence'
import { MOTION } from '@/utils/motion'

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

/**
 * Bell with an unread dot. 15 · When more arrive, the bell swings once and the
 * badge hops; when everything is read, the dot fades away instead of vanishing.
 */
export default function NotificationBell({ unread, className = 'nav-link' }: { unread: number; className?: string }) {
  const label = unread ? `Benachrichtigungen, ${unread} ungelesen` : 'Benachrichtigungen'
  const prev = usePrevious(unread)
  const [ring, setRing] = useState(0)
  // The first count after the app opens is not news: only later increases ring.
  const [since] = useState(() => Date.now())
  useEffect(() => {
    if (unread > prev && Date.now() - since > MOTION.dur8 * 3) setRing((n) => n + 1)
  }, [unread, prev, since])
  const shown = unread > 0 ? unread : prev
  return (
    <NavLink to="/benachrichtigungen" className={({ isActive }) => `${className} bell${isActive ? ' active' : ''}`} aria-label={label} title={label}>
      <span key={ring} className={ring ? 'bell-icon is-ringing' : 'bell-icon'}>
        <Bell size={20} aria-hidden="true" />
      </span>
      <Presence show={unread > 0} exitMs={MOTION.dur3Out}>
        <span key={ring} className={`bell-dot num${ring ? ' is-bump' : ''}`} aria-hidden="true">
          {shown > 9 ? '9+' : shown}
        </span>
      </Presence>
    </NavLink>
  )
}
