import sportsJson from './sports.json'

// Identical copy of backend/config/sports.json (checked by a backend test).
export interface Sport {
  key: string
  label: string
}

export const SPORTS: Sport[] = sportsJson

export const SPORT_LABELS: Record<string, string> = Object.fromEntries(SPORTS.map((s) => [s.key, s.label]))

export const sportLabel = (key: string) => SPORT_LABELS[key] || key

/** Sport data colour as a theme-aware CSS variable (tokens.css; always paired with a text label). */
export const sportColor = (key: string) => `var(--sport-${key}, var(--sport-other))`

export const LEVELS: { key: string; label: string }[] = [
  { key: 'all', label: 'Alle Niveaus' },
  { key: 'beginner', label: 'Einsteiger' },
  { key: 'intermediate', label: 'Fortgeschritten' },
  { key: 'advanced', label: 'Erfahren' },
]

export const levelLabel = (key: string) => LEVELS.find((l) => l.key === key)?.label || key

export const STATUS_LABELS: Record<string, string> = {
  open: 'Plätze frei',
  full: 'Voll',
  cancelled: 'Abgesagt',
  completed: 'Vorbei',
}
