import { useEffect, useRef } from 'react'

/**
 * Adds `is-in` to the element once it scrolls into view (once, no re-trigger).
 * Content is visible by default: the hidden start state only applies under
 * `.reveal-ready`, which is set on <html> when IntersectionObserver exists and
 * the user hasn't asked for reduced motion (see landing.css).
 */
export function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-in')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io.unobserve(entry.target)
          }
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return ref
}

/** Opt the document into reveal animations (call once on the landing page). */
export function useRevealReady() {
  useEffect(() => {
    const root = document.documentElement
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if ('IntersectionObserver' in window && !reduce) root.classList.add('reveal-ready')
    return () => root.classList.remove('reveal-ready')
  }, [])
}
