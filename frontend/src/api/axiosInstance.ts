import axios, { AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
export const TOKEN_KEY = 'hobbook_token'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A 401 means the stored session is no longer valid. We don't hard-redirect:
// public pages keep working, and AuthContext reacts to the event.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
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
