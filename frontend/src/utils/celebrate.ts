import { MOTION, prefersReducedMotion } from './motion'

interface CelebrateOptions {
  /** Extra colour besides lime, e.g. the sport colour. */
  color?: string
  /** Number of balls (capped at 10). */
  count?: number
  /** Also send a shockwave ring out from the element. */
  ring?: boolean
}

/**
 * "Ball hit": a handful of small balls burst out of an element and fade, plus
 * an optional shockwave ring. Pure transform/opacity, aria-hidden, removed when
 * done. Does nothing with reduced motion or without an element.
 */
export function celebrate(el: Element | null | undefined, { color, count = 8, ring = true }: CelebrateOptions = {}) {
  if (!el || prefersReducedMotion() || typeof document === 'undefined') return
  const rect = el.getBoundingClientRect()
  if (!rect.width && !rect.height) return

  const layer = document.createElement('div')
  layer.className = 'burst'
  layer.setAttribute('aria-hidden', 'true')
  layer.style.left = `${rect.left + rect.width / 2}px`
  layer.style.top = `${rect.top + rect.height / 2}px`

  if (ring) {
    const r = document.createElement('span')
    r.className = 'burst-ring'
    r.style.width = r.style.height = `${Math.max(rect.height, 44)}px`
    layer.appendChild(r)
  }

  const n = Math.min(count, 10)
  for (let i = 0; i < n; i++) {
    const ball = document.createElement('span')
    ball.className = 'burst-ball'
    // Evenly around the circle, slightly jittered, flung upwards more than down
    const angle = (i / n) * Math.PI * 2 + (i % 2 ? 0.25 : -0.15)
    const dist = Math.max(rect.width, rect.height) / 2 + 28 + (i % 3) * 14
    ball.style.setProperty('--bx', `${Math.cos(angle) * dist}px`)
    ball.style.setProperty('--by', `${Math.sin(angle) * dist * 0.8 - 18}px`)
    ball.style.setProperty('--bs', `${6 + (i % 3) * 3}px`)
    if (color && i % 2) ball.style.background = color
    ball.style.animationDelay = `${(i % 4) * 25}ms`
    layer.appendChild(ball)
  }

  document.body.appendChild(layer)
  window.setTimeout(() => layer.remove(), MOTION.dur8 + 100)
}
