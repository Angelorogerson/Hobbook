import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react'
import api, { TOKEN_KEY } from '../api/axiosInstance'

export interface User {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  city?: string
  sports?: string[]
}

export interface AuthState {
  isLoading: boolean
  isLoggedIn: boolean
  user: User | null
  token: string | null
}

type AuthAction =
  | { type: 'READY' }
  | { type: 'LOGIN_SUCCESS'; payload: { token: string; user: User } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }

const initialState: AuthState = { isLoading: true, isLoggedIn: false, user: null, token: null }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'READY':
      return { ...state, isLoading: false }
    case 'LOGIN_SUCCESS':
      return { isLoading: false, isLoggedIn: true, user: action.payload.user, token: action.payload.token }
    case 'LOGOUT':
      return { ...initialState, isLoading: false }
    case 'UPDATE_USER':
      return { ...state, user: state.user ? { ...state.user, ...action.payload } : null }
    default:
      return state
  }
}

interface RegisterInput {
  name: string
  email: string
  password: string
  /** The person confirmed they are at least 16 years old. */
  ageConfirmed: boolean
}

interface AuthContextValue {
  authState: AuthState
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterInput) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<Pick<User, 'name' | 'city' | 'sports'>>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, dispatch] = useReducer(authReducer, initialState)

  // Restore the session from localStorage and validate it once.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      dispatch({ type: 'READY' })
      return
    }
    api
      .get('/auth/me')
      .then(({ data }) => dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user: data.user } }))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        dispatch({ type: 'LOGOUT' })
      })
  }, [])

  // The API client signals an expired session (401) without redirecting.
  useEffect(() => {
    const onExpired = () => dispatch({ type: 'LOGOUT' })
    window.addEventListener('hobbook:session-expired', onExpired)
    return () => window.removeEventListener('hobbook:session-expired', onExpired)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem(TOKEN_KEY, data.token)
    dispatch({ type: 'LOGIN_SUCCESS', payload: { token: data.token, user: data.user } })
  }, [])

  const register = useCallback(async (userData: RegisterInput) => {
    const { data } = await api.post('/auth/register', userData)
    localStorage.setItem(TOKEN_KEY, data.token)
    dispatch({ type: 'LOGIN_SUCCESS', payload: { token: data.token, user: data.user } })
  }, [])

  // JWTs are stateless; logging out clears the local session.
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    dispatch({ type: 'LOGOUT' })
  }, [])

  const updateUser = useCallback(async (userData: Partial<Pick<User, 'name' | 'city' | 'sports'>>) => {
    const { data } = await api.put('/users/me', userData)
    dispatch({ type: 'UPDATE_USER', payload: data.user })
  }, [])

  return (
    <AuthContext.Provider value={{ authState, login, register, logout, updateUser }}>{children}</AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuthContext must be used within AuthProvider')
  return context
}
