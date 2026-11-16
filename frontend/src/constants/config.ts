export const APP_NAME = 'Hobbook'
export const APP_VERSION = '1.0.0'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const STORAGE_KEYS = {
  TOKEN: 'hobbook_token',
  USER: 'hobbook_user',
  FAVORITES: 'hobbook_favorites',
  RECENT_SEARCHES: 'hobbook_recent_searches',
}

export const SPORTS = [
  { id: 'football', label: '⚽ Fußball', icon: '⚽' },
  { id: 'basketball', label: '🏀 Basketball', icon: '🏀' },
]

export const SKILL_LEVELS = [
  { id: 'beginner', label: 'Anfänger' },
  { id: 'intermediate', label: 'Fortgeschritten' },
  { id: 'advanced', label: 'Professionell' },
  { id: 'all', label: 'Alle Levels' },
]

export const BOOKING_STATUS = {
  pending: 'Ausstehend',
  confirmed: 'Bestätigt',
  cancelled: 'Storniert',
  completed: 'Abgeschlossen',
}

export const PAYMENT_STATUS = {
  unpaid: 'Unbezahlt',
  paid: 'Bezahlt',
  refunded: 'Rückerstattung',
}

export const EVENT_STATUS = {
  open: 'Offen',
  full: 'Voll',
  cancelled: 'Storniert',
  completed: 'Abgeschlossen',
}

export const PAGINATION_LIMIT = 10

export const DEBOUNCE_DELAY = 300

export const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
