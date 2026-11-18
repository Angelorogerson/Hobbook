import axios, { AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
export const TOKEN_KEY = 'hobbook_token'

/** Fired with `detail: boolean` when a request has been pending for a while (server waking up). */
export const SLOW_EVENT = 'hobbook:server-slow'
const SLOW_AFTER_MS = 4000

const api = axios.create({
  baseURL: BASE_URL,
  // Free hosting puts the API to sleep when idle; the first request may take up to a minute.
  timeout: 70000,
  headers: { 'Content-Type': 'application/json' },
})

let pending = 0
let slowTimer: ReturnType<typeof setTimeout> | null = null
let slowShown = false

function requestStarted() {
  pending += 1
  if (!slowTimer && !slowShown) {
    slowTimer = setTimeout(() => {
      slowTimer = null
      slowShown = true
      window.dispatchEvent(new CustomEvent(SLOW_EVENT, { detail: true }))
    }, SLOW_AFTER_MS)
  }
}

function requestFinished() {
  pending = Math.max(0, pending - 1)
  if (pending > 0) return
  if (slowTimer) {
    clearTimeout(slowTimer)
    slowTimer = null
  }
  if (slowShown) {
    slowShown = false
    window.dispatchEvent(new CustomEvent(SLOW_EVENT, { detail: false }))
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  requestStarted()
  return config
})

// A 401 means the stored session is no longer valid. We don't hard-redirect:
// public pages keep working, and AuthContext reacts to the event.
api.interceptors.response.use(
  (response) => {
    requestFinished()
    return response
  },
  (error: AxiosError) => {
    requestFinished()
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('hobbook:session-expired'))
    }
    return Promise.reject(error)
  }
)

export interface ApiErrorInfo {
  message: string
  errors: Record<string, string>
  status?: number
}

/** Normalise any API/network error into a user-facing German message + field errors. */
export function apiError(err: unknown, fallback = 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'): ApiErrorInfo {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return { message: 'Keine Verbindung zum Server. Prüfe deine Internetverbindung.', errors: {} }
    }
    const data = err.response.data as { message?: string; errors?: Record<string, string> } | undefined
    return {
      message: data?.message || fallback,
      errors: data?.errors || {},
      status: err.response.status,
    }
  }
  return { message: fallback, errors: {} }
}

export default api
