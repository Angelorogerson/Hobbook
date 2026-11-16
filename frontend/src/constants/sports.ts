import sportsJson from './sports.json'

// Identical copy of backend/config/sports.json (checked by a backend test).
export interface Sport {
  key: string
  label: string
}

export const SPORTS: Sport[] = sportsJson

export const SPORT_LABELS: Record<string, string> = Object.fromEntries(SPORTS.map((s) => [s.key, s.label]))

export const sportLabel = (key: string) => SPORT_LABELS[key] || key

/** Distinct, accessible marker colours (always paired with a text label). */
const SPORT_COLORS: Record<string, string> = {
  football: '#1e7d3a',
  basketball: '#c2410c',
  volleyball: '#a16207',
  beach_volleyball: '#b45309',
  running: '#7c3aed',
  cycling: '#0e7490',
  tennis: '#4d7c0f',
  table_tennis: '#be123c',
  badminton: '#0369a1',
  frisbee: '#9d174d',
  fitness: '#334155',
  other: '#475569',
}

export const sportColor = (key: string) => SPORT_COLORS[key] || '#004e89'

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
