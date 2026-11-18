import { useEffect, useLayoutEffect, useRef } from 'react'
import { useReducedMotion } from '@/utils/motion'

/**
 * One observer for a whole page: every `[data-reveal]` element inside the
 * returned ref gets `is-in` once it scrolls into view (never re-triggers).
 *
 * Content is visible by default. The hidden start state only applies under
 * `html.reveal-ready`, set by useRevealReady when IntersectionObserver exists
 * and motion is welcome (see styles/motion.css).
 */
export function useRevealScope<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const targets = () => Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)'))
    if (!('IntersectionObserver' in window)) {
      targets().forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          io.unobserve(entry.target)
        }
      },
      // Reveal a little before the element is fully in view, never after it has passed.
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )
    const observeAll = () => targets().forEach((el) => io.observe(el))
    observeAll()
    // Sections that render later (data arrives) are picked up too.
    const mo = new MutationObserver(observeAll)
    mo.observe(root, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      io.disconnect()
    }
  }, [])

  return ref
}

/** Opt the document into reveal and entrance animations while motion is welcome. */
export function useRevealReady() {
  const reduced = useReducedMotion()
  // Before the first paint, so entrance states never flash visible-then-hidden.
  useLayoutEffect(() => {
    const root = document.documentElement
    if ('IntersectionObserver' in window && !reduced) root.classList.add('reveal-ready')
    else root.classList.remove('reveal-ready')
    return () => root.classList.remove('reveal-ready')
  }, [reduced])
}
