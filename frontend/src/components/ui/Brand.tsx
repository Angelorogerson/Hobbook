import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '@/store/ThemeContext'

/** Brand mark: a lowercase "h" with the ball in play above its shoulder. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="logo-mark">
      <rect width="32" height="32" rx="10" fill="#2f4bff" />
      <path
        d="M10 6.5v19M10 17.5a5.5 5.5 0 0 1 11 0v8"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.5" cy="8" r="3.4" fill="#d4ff3a" />
    </svg>
  )
}

const NEXT: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<ThemePreference, string> = { system: 'System', light: 'Hell', dark: 'Dunkel' }

/** Cycles System → Hell → Dunkel; the label always states the current mode. */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { preference, setPreference } = useTheme()
  const Icon = preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor
  return (
    <button
      type="button"
      className={`btn btn-ghost${withLabel ? '' : ' btn-icon'}`}
      onClick={() => setPreference(NEXT[preference])}
      aria-label={`Farbschema: ${LABEL[preference]}. Wechseln zu ${LABEL[NEXT[preference]]}`}
      title={`Farbschema: ${LABEL[preference]}`}
    >
      <Icon size={20} aria-hidden="true" />
      {withLabel && <span>Farbschema: {LABEL[preference]}</span>}
    </button>
  )
}

/** Explicit three-way choice for the profile page. */
export function ThemeChoice() {
  const { preference, setPreference } = useTheme()
  const options: { key: ThemePreference; icon: typeof Sun }[] = [
    { key: 'system', icon: Monitor },
    { key: 'light', icon: Sun },
    { key: 'dark', icon: Moon },
  ]
  return (
    <div className="theme-choice" role="radiogroup" aria-label="Farbschema">
      {options.map(({ key, icon: Icon }, i) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={preference === key}
          tabIndex={preference === key ? 0 : -1}
          className={`chip${preference === key ? ' is-on' : ''}`}
          onClick={() => setPreference(key)}
          onKeyDown={(e) => {
            const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
            if (!step) return
            e.preventDefault()
            const next = options[(i + step + options.length) % options.length].key
            setPreference(next)
            const group = e.currentTarget.parentElement
            requestAnimationFrame(() => group?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
          }}
        >
          <Icon size={16} aria-hidden="true" /> {LABEL[key]}
        </button>
      ))}
    </div>
  )
}
