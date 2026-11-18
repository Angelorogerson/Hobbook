import { createElement, useEffect, useRef, useState, type ReactNode } from 'react'
import { MOTION, prefersReducedMotion } from '@/utils/motion'

export type PresenceState = 'enter' | 'exit'

/**
 * Keeps something mounted until its exit motion has finished.
 * `state` is 'enter' while shown and 'exit' during the leave animation.
 */
export function usePresence(show: boolean, exitMs: number = MOTION.dur4Out) {
  const [mounted, setMounted] = useState(show)
  const [state, setState] = useState<PresenceState>(show ? 'enter' : 'exit')

  useEffect(() => {
    if (show) {
      setMounted(true)
      setState('enter')
      return
    }
    setState('exit')
    const t = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : exitMs)
    return () => window.clearTimeout(t)
  }, [show, exitMs])

  return { mounted, state }
}

/**
 * Renders its children while `show` is true and keeps the last children on
 * screen for their exit. Descendants style themselves with
 * `[data-presence='exit'] …` (see styles/motion.css).
 */
export function Presence({ show, exitMs, children }: { show: boolean; exitMs?: number; children: ReactNode }) {
  const last = useRef<ReactNode>(children)
  if (show) last.current = children
  const { mounted, state } = usePresence(show, exitMs)
  if (!mounted) return null
  return createElement('div', { className: 'presence', 'data-presence': state }, show ? children : last.current)
}
