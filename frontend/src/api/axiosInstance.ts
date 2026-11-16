import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Request Interceptor: Add token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hobbook_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response Interceptor: Handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hobbook_token')
      localStorage.removeItem('hobbook_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
