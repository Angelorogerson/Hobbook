import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CapacityMeter, DateTile } from './DataPieces'
import { ThemeChoice, ThemeToggle } from './Brand'
import { ThemeProvider } from '@/store/ThemeContext'

describe('CapacityMeter', () => {
  it('exposes taken/max as an accessible meter with a text label', () => {
    render(<CapacityMeter taken={3} max={10} status="open" />)
    const meter = screen.getByRole('meter', { name: 'Belegung' })
    expect(meter).toHaveAttribute('aria-valuenow', '3')
    expect(meter).toHaveAttribute('aria-valuemax', '10')
    expect(meter).toHaveAttribute('aria-valuetext', '3 von 10 Plätzen belegt')
    expect(screen.getByText('7 Plätze frei')).toBeInTheDocument()
    expect(screen.getByText('3/10')).toBeInTheDocument()
  })

  it('states full, last spot and cancelled in words, not only colour', () => {
    const { rerender } = render(<CapacityMeter taken={6} max={6} status="full" />)
    expect(screen.getByText('Voll')).toBeInTheDocument()
    rerender(<CapacityMeter taken={5} max={6} status="open" />)
    expect(screen.getByText('1 Platz frei')).toBeInTheDocument()
    rerender(<CapacityMeter taken={2} max={6} status="cancelled" />)
    expect(screen.getByText('Abgesagt')).toBeInTheDocument()
  })

  it('uses segments up to 16 spots and a bar above', () => {
    const { container, rerender } = render(<CapacityMeter taken={2} max={16} status="open" />)
    expect(container.querySelectorAll('.capacity-seg')).toHaveLength(16)
    rerender(<CapacityMeter taken={20} max={40} status="open" />)
    expect(container.querySelectorAll('.capacity-seg')).toHaveLength(0)
    expect(container.querySelector('.capacity-fill')).toHaveStyle({ transform: 'scaleX(0.5)' })
  })
})

describe('DateTile', () => {
  it('renders weekday, day and month in the event time zone', () => {
    const { container } = render(<DateTile iso="2026-07-01T22:30:00.000Z" timeZone="Europe/Berlin" />)
    // 22:30 UTC is already 2 July in Berlin
    expect(container.querySelector('.date-tile-day')).toHaveTextContent('2')
    expect(container.querySelector('.date-tile-mo')).toHaveTextContent(/Juli|Jul/)
  })
})

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('cycles System → Hell → Dunkel, applies data-theme and remembers the choice', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
    await user.click(screen.getByRole('button', { name: /Farbschema: System/ }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('hobbook_theme')).toBe('light')

    await user.click(screen.getByRole('button', { name: /Farbschema: Hell/ }))
    expect(document.documentElement.dataset.theme).toBe('dark')

    await user.click(screen.getByRole('button', { name: /Farbschema: Dunkel/ }))
    expect(localStorage.getItem('hobbook_theme')).toBeNull()
  })

  it('offers an explicit radio choice in the profile', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeChoice />
      </ThemeProvider>
    )
    await user.click(screen.getByRole('radio', { name: /Dunkel/ }))
    expect(screen.getByRole('radio', { name: /Dunkel/ })).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
