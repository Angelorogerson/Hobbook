import { useEffect, useRef, useState } from 'react'

/**
 * True for one render cycle after `value` changes, never on the first render.
 * Celebrations use it so they play for the event itself, not on every reload.
 * The flag clears again after `holdMs`, so the class can be re-applied later.
 */
export function useOnChange<T>(value: T, holdMs = 1200) {
  const first = useRef(true)
  const previous = useRef(value)
  const [changed, setChanged] = useState(false)

  useEffect(() => {
    if (first.current) {
      first.current = false
      previous.current = value
      return
    }
    if (Object.is(previous.current, value)) return
    previous.current = value
    setChanged(true)
    const t = window.setTimeout(() => setChanged(false), holdMs)
    return () => window.clearTimeout(t)
  }, [value, holdMs])

  return changed
}

/** The previous value of something, for "from → to" animations. */
export function usePrevious<T>(value: T) {
  const ref = useRef<T>(value)
  const [prev, setPrev] = useState<T>(value)
  useEffect(() => {
    if (Object.is(ref.current, value)) return
    setPrev(ref.current)
    ref.current = value
  }, [value])
  return prev
}
