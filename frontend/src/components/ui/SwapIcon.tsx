import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import './SwapIcon.css'

/**
 * An icon that turns into a check for a moment after an action ("Link kopiert"),
 * then turns back. Decorative: the toast or text says what happened.
 */
export function SwapIcon({ done, children, size = 16 }: { done: boolean; children: ReactNode; size?: number }) {
  return (
    <span className={`swap-icon${done ? ' is-done' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <span className="swap-icon-a">{children}</span>
      <span className="swap-icon-b">
        <Check size={size} />
      </span>
    </span>
  )
}

/** Which action just succeeded (by key), cleared again after `ms`. */
export function useFlash(ms = 1600) {
  const [key, setKey] = useState<string | null>(null)
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const flash = useCallback(
    (k: string) => {
      setKey(k)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setKey(null), ms)
    },
    [ms]
  )
  return [key, flash] as const
}
