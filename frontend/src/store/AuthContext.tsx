import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import axiosInstance from '../api/axiosInstance'

export interface User {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  city?: string
  phone?: string
  sports?: string[]
  avatar?: string
  isActive?: boolean
}

export interface AuthState {
  isLoading: boolean
  isLoggedIn: boolean
  user: User | null
  token: string | null
  error: string | null
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { token: string; user: User } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_ERROR'; payload: string | null }

const initialState: AuthState = {
  isLoading: true,
  isLoggedIn: false,
  user: null,
  token: null,
  error: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      }
    case 'LOGOUT':
      return { ...initialState, isLoading: false }
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    default:
      return state
  }
}

const AuthContext = createContext<{
  authState: AuthState
  login: (email: string, password: string) => Promise<void>
  register: (userData: { name: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => Promise<void>
  clearError: () => void
} | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, dispatch] = useReducer(authReducer, initialState)

  // Initialize auth on mount: check localStorage and validate token with GET /api/auth/me
  useEffect(() => {
    const initializeAuth = async () => {
      dispatch({ type: 'SET_LOADING', payload: true })
      const storedToken = localStorage.getItem('hobbook_token')

      if (storedToken) {
        try {
          // Validate token by calling GET /auth/me
          const { data } = await axiosInstance.get('/auth/me')
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { token: storedToken, user: data.data || data.user },
          })
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('hobbook_token')
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    try {
      const { data } = await axiosInstance.post('/auth/login', { email, password })
      const { token, user } = data.data || data

      localStorage.setItem('hobbook_token', token)
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { token, user },
      })
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }

  const register = async (userData: { name: string; email: string; password: string }) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    try {
      const { data } = await axiosInstance.post('/auth/register', userData)
      const { token, user } = data.data || data

      localStorage.setItem('hobbook_token', token)
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { token, user },
      })
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }

  const logout = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      await axiosInstance.post('/auth/logout')
    } catch (error) {
      // Logout on client side even if server fails
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('hobbook_token')
      dispatch({ type: 'LOGOUT' })
    }
  }

  const updateUser = async (userData: Partial<User>) => {
    dispatch({ type: 'SET_ERROR', payload: null })
    try {
      const { data } = await axiosInstance.put('/users/me', userData)
      dispatch({
        type: 'UPDATE_USER',
        payload: data.data || data.user,
      })
    } catch (error: any) {
      const message = error.response?.data?.message || 'Update failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }

  return (
    <AuthContext.Provider value={{ authState, login, register, logout, updateUser, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
