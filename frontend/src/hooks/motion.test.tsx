import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import { Presence } from './usePresence'
import { MOTION, useReducedMotion } from '@/utils/motion'

describe('Presence', () => {
  afterEach(() => vi.useRealTimers())

  it('keeps the last content for its exit, then removes it', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Presence show>{<p>Dialog</p>}</Presence>)
    expect(screen.getByText('Dialog').closest('[data-presence]')).toHaveAttribute('data-presence', 'enter')

    // The caller unmounts its content at once; Presence keeps showing the last version
    rerender(<Presence show={false}>{false}</Presence>)
    expect(screen.getByText('Dialog').closest('[data-presence]')).toHaveAttribute('data-presence', 'exit')

    act(() => vi.advanceTimersByTime(MOTION.dur4Out))
    expect(screen.queryByText('Dialog')).not.toBeInTheDocument()
  })

  it('removes content at once when motion is reduced', () => {
    vi.useFakeTimers()
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} })) as never
    const { rerender } = render(<Presence show>{<p>Dialog</p>}</Presence>)
    rerender(<Presence show={false}>{false}</Presence>)
    act(() => vi.advanceTimersByTime(0))
    expect(screen.queryByText('Dialog')).not.toBeInTheDocument()
    window.matchMedia = original
  })
})

describe('useReducedMotion', () => {
  it('follows the system setting while the page is open', () => {
    let listener: () => void = () => {}
    const mq = { matches: false, addEventListener: (_: string, l: () => void) => (listener = l), removeEventListener() {} }
    const original = window.matchMedia
    window.matchMedia = (() => mq) as never
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    mq.matches = true
    act(() => listener())
    expect(result.current).toBe(true)
    window.matchMedia = original
  })
})
