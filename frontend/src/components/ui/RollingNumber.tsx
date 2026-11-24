import { useEffect, useRef, useState } from 'react'
import { MOTION } from '@/utils/motion'
import './RollingNumber.css'

/**
 * A short count text ("6 Plätze frei", "4 von 10", "12") that rolls to its new
 * value like a scoreboard when `value` changes: counting up rolls upwards,
 * counting down rolls downwards.
 * The visible text is always ONE text node (screen readers, copy/paste and
 * tests read exactly one value); the old text is drawn by a CSS pseudo-element
 * (data-from). First render and reduced motion: no roll.
 */
export default function RollingNumber({ value, text, className = '' }: { value: number; text?: string; className?: string }) {
  const shown = text ?? String(value)
  const last = useRef({ value, shown })
  const [roll, setRoll] = useState<{ from: string; dir: 'up' | 'down'; key: number } | null>(null)

  useEffect(() => {
    const prev = last.current
    if (prev.value === value) {
      last.current = { value, shown }
      return
    }
    last.current = { value, shown }
    setRoll({ from: prev.shown, dir: value > prev.value ? 'up' : 'down', key: Date.now() })
    const t = window.setTimeout(() => setRoll(null), MOTION.dur4 + 50)
    return () => window.clearTimeout(t)
  }, [value, shown])

  return (
    <span className={`rolling ${className}`} data-dir={roll?.dir} data-from={roll?.from}>
      <span key={roll?.key ?? 0} className={roll ? 'rolling-now is-rolling' : 'rolling-now'}>
        {shown}
      </span>
    </span>
  )
}
