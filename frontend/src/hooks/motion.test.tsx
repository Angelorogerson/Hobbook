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

import { useOnChange } from './useOnChange'
import RollingNumber from '@/components/ui/RollingNumber'
import { celebrate } from '@/utils/celebrate'

describe('useOnChange', () => {
  it('never fires on the first render, only when the value changes', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ v }) => useOnChange(v, 500), { initialProps: { v: 'open' } })
    expect(result.current).toBe(false)
    rerender({ v: 'on' })
    expect(result.current).toBe(true)
    act(() => vi.advanceTimersByTime(500))
    expect(result.current).toBe(false)
    vi.useRealTimers()
  })
})

describe('RollingNumber', () => {
  it('keeps one readable value; the old one is only drawn by CSS', () => {
    const { container, rerender } = render(<RollingNumber value={3} text="3 von 10" />)
    expect(container.textContent).toBe('3 von 10')
    rerender(<RollingNumber value={4} text="4 von 10" />)
    expect(container.textContent).toBe('4 von 10')
    expect(container.querySelector('.rolling')).toHaveAttribute('data-from', '3 von 10')
    expect(container.querySelector('.rolling')).toHaveAttribute('data-dir', 'up')
  })
})

describe('celebrate', () => {
  it('adds nothing to the page when motion is reduced', () => {
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} })) as never
    const el = document.createElement('button')
    document.body.appendChild(el)
    celebrate(el)
    expect(document.querySelector('.burst')).toBeNull()
    window.matchMedia = original
    el.remove()
  })
})
