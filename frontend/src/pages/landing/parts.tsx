import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { listEvents, type SportEvent } from '@/api/eventApi'
import { MOTION, prefersReducedMotion, useReducedMotion } from '@/utils/motion'

export const DISCOVER = '/entdecken'


/** Real upcoming public events for the landing page (never invented). */
export function useLandingEvents() {
  const [events, setEvents] = useState<SportEvent[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const ctrl = new AbortController()
    listEvents({ limit: 6 }, ctrl.signal)
      .then((r) => setEvents(r.events))
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setFailed(true)
          setEvents([])
        }
      })
    return () => ctrl.abort()
  }, [])
  return { events, loading: events === null, failed }
}

/** City search that hands off to Discover with the city filter set. */
export function CitySearch({ id, tone = 'plain' }: { id: string; tone?: 'stage' | 'plain' }) {
  const navigate = useNavigate()
  const [city, setCity] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const c = city.trim()
    navigate(c ? `${DISCOVER}?stadt=${encodeURIComponent(c)}` : DISCOVER)
  }
  return (
    <form className={`city-search city-search--${tone}`} role="search" onSubmit={submit}>
      <label htmlFor={id} className="city-search-label">
        Wo willst du spielen?
      </label>
      <div className="city-search-row">
        <Search size={20} className="city-search-icon" aria-hidden="true" />
        <input
          id={id}
          className="city-search-input"
          type="search"
          placeholder="Stadt, z. B. Köln"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="address-level2"
          enterKeyHint="search"
        />
        <button type="submit" className="city-search-btn" aria-label="Events in dieser Stadt suchen">
          <span>Suchen</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}

/**
 * Names a few sports like a scoreboard, then settles on the last word and
 * stays there. The whole run is shorter than five seconds (WCAG 2.2.2), it
 * never scrolls backwards, and with reduced motion only the last word shows.
 * Decorative: screen readers read the static sentence next to it.
 */
export function WordRoller({ words, every = MOTION.dur5 * 3 }: { words: string[]; every?: number }) {
  const reduced = useReducedMotion()
  const last = words.length - 1
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (reduced) {
      setIndex(last)
      return
    }
    if (last < 1) return
    const t = window.setInterval(() => {
      setIndex((i) => {
        if (i + 1 >= last) window.clearInterval(t)
        return Math.min(i + 1, last)
      })
    }, every)
    return () => window.clearInterval(t)
  }, [reduced, last, every])
  return (
    <span className="roller" aria-hidden="true">
      <span className="roller-track" style={{ transform: `translateY(${-index * 1.35}em)` }}>
        {words.map((w) => (
          <span key={w} className="roller-word">
            {w}
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * Nudges a horizontal rail once ("there is more this way") and brings it back
 * to the start. Cancelled by the first touch, hover, focus or manual scroll,
 * and never runs with reduced motion.
 */
export function useDrift<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !active || prefersReducedMotion()) return
    let raf = 0
    let stopped = false
    let startTime = 0
    const stop = () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
    const DURATION = MOTION.dur7 * 3
    const tick = (now: number) => {
      if (stopped) return
      if (!startTime) startTime = now
      const t = Math.min(1, (now - startTime) / DURATION)
      const reach = Math.min(160, el.scrollWidth - el.clientWidth)
      // Out and back on one smooth curve
      el.scrollLeft = reach > 8 ? Math.sin(t * Math.PI) * reach : 0
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    const names = ['pointerdown', 'wheel', 'touchstart', 'focusin', 'mouseenter'] as const
    names.forEach((n) => el.addEventListener(n, stop, { passive: true, once: true }))
    // Starts once the hero sequence has settled
    const timer = window.setTimeout(() => (raf = requestAnimationFrame(tick)), MOTION.dur6 + MOTION.dur7)
    return () => {
      stop()
      window.clearTimeout(timer)
      names.forEach((n) => el.removeEventListener(n, stop))
    }
  }, [active])
  return ref
}

/** Which of several stacked steps is currently in the middle of the viewport. */
export function useActiveStep(count: number) {
  const refs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)
  /** Vertical position of each step marker, for the ball that travels along the steps. */
  const [marks, setMarks] = useState<number[]>([])
  useEffect(() => {
    const measure = () =>
      setMarks(
        refs.current.slice(0, count).map((el) => {
          const n = el?.querySelector<HTMLElement>('.lp-step-n')
          // Both offsets are relative to the positioned step list
          return el && n ? n.offsetTop + n.offsetHeight / 2 : 0
        })
      )
    measure()
    if (!('ResizeObserver' in window)) return
    const ro = new ResizeObserver(measure)
    refs.current.slice(0, count).forEach((el) => el && ro.observe(el))
    return () => ro.disconnect()
  }, [count])
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step))
        }
      },
      // A thin band around the middle of the screen decides which step is "on".
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )
    refs.current.slice(0, count).forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [count])
  return { active, marks, setRef: (i: number) => (el: HTMLElement | null) => void (refs.current[i] = el) }
}

/**
 * Anstoß: measures where the logo's dot is relative to the headline ball, so
 * the ball can start its flight exactly there (CSS vars --kick-x / --kick-y),
 * and marks the page while the dot is "in play". Once per visit; nothing with
 * reduced motion (the CSS only runs under html.reveal-ready).
 */
export function useKickoff() {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const ball = ref.current
    const dot = document.querySelector('.brand .logo-mark circle')
    if (!ball || prefersReducedMotion()) return
    // The ball rests right after "Spiel."; measure that word (it is not moved
    // sideways by any animation) and the logo dot, and again once the web font
    // has loaded and the headline has its final width. Only CSS vars change,
    // so the running animation simply follows.
    const mark = document.querySelector('.lp-h1-mark')
    const measure = () => {
      if (!dot || !mark) return
      const d = dot.getBoundingClientRect()
      const m = mark.getBoundingClientRect()
      const size = ball.offsetWidth || 20
      const restX = m.right + size * 0.6
      const restY = m.top + m.height * 0.62
      ball.style.setProperty('--kick-x', `${d.left + d.width / 2 - restX}px`)
      ball.style.setProperty('--kick-y', `${d.top + d.height / 2 - restY}px`)
    }
    measure()
    document.fonts?.ready.then(measure).catch(() => {})
    const root = document.documentElement
    root.classList.add('lp-kickoff')
    const t = window.setTimeout(() => root.classList.remove('lp-kickoff'), MOTION.dur5 + MOTION.dur8 + 100)
    return () => {
      window.clearTimeout(t)
      root.classList.remove('lp-kickoff')
    }
  }, [])
  return ref
}
