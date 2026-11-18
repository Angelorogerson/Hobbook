import { useEffect, useState } from 'react'

/**
 * JS mirror of the motion tokens in styles/tokens.css, for things CSS cannot
 * time: MapLibre camera moves, toast lifetimes, exit timers, scroll behaviour.
 * Keep the numbers in sync with tokens.css.
 */
export const MOTION = {
  dur1: 100,
  dur2: 150,
  dur3: 200,
  dur4: 250,
  dur5: 400,
  dur6: 600,
  dur7: 900,
  dur3Out: 140,
  dur4Out: 180,
  /** Map camera: selecting a pin, zooming into a cluster, recentering. */
  camera: 400,
  /** Map camera: larger moves (3D tilt, placing the create-form pin). */
  cameraLarge: 600,
  /** How long confirmations stay readable before they leave. */
  toastSuccess: 3500,
  toastError: 6000,
} as const

const QUERY = '(prefers-reduced-motion: reduce)'

export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches

/** Live reduced-motion preference: follows the system setting while the page is open. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY)
    if (!mq) return
    const onChange = () => setReduced(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Smooth scrolling only when motion is welcome. */
export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth')
