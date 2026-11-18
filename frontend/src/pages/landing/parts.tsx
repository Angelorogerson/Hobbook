import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { listEvents, type SportEvent } from '@/api/eventApi'

export const DISCOVER = '/entdecken'

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

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
 * One word at a time, rolling upwards like a scoreboard. Decorative: screen
 * readers get the static sentence next to it, reduced motion gets the first word.
 */
export function WordRoller({ words, every = 2200 }: { words: string[]; every?: number }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (prefersReducedMotion() || words.length < 2) return
    const t = window.setInterval(() => setIndex((i) => (i + 1) % words.length), every)
    return () => window.clearInterval(t)
  }, [words.length, every])
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
    const DURATION = 2600
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
    const timer = window.setTimeout(() => (raf = requestAnimationFrame(tick)), 1600)
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
  return { active, setRef: (i: number) => (el: HTMLElement | null) => void (refs.current[i] = el) }
}
