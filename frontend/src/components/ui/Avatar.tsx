import './Avatar.css'

/** "Max M." → "MM"; a single name gives one letter. */
export function initials(name: string) {
  const parts = name.replace(/\./g, '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase()
}

// Stable tint per name so the same person always looks the same.
const tint = (name: string) => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 6
  return h
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`avatar avatar--${size} avatar--t${tint(name)}`} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

/** Overlapping initials for "who's in": names when known, otherwise a plain count. */
export function AvatarStack({ names, total, max = 4 }: { names: string[]; total: number; max?: number }) {
  const shown = names.slice(0, max)
  const rest = total - shown.length
  return (
    <span className="avatar-stack">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size="sm" />
      ))}
      {rest > 0 && (
        <span className="avatar avatar--sm avatar--more" aria-hidden="true">
          +{rest}
        </span>
      )}
    </span>
  )
}
