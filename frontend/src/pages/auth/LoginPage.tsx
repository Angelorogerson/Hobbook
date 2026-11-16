import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthContext } from '../../store/AuthContext'
import { Button, Input, LoadingSpinner } from '../../components/common'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { authState, login } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email'
    }

    if (!password.trim()) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    if (!validateForm()) {
      return
    }

    try {
      await login(email, password)
      navigate('/home')
    } catch (error) {
      // Error is handled by authState.error from context
    }
  }

  if (authState.isLoading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Hobbook</h1>
          <p className="login-subtitle">Sports Booking Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {authState.error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {authState.error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="Enter your email"
            error={validationErrors.email}
            disabled={authState.isLoading}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            error={validationErrors.password}
            disabled={authState.isLoading}
          />

          <Button
            type="submit"
            variant="primary"
            loading={authState.isLoading}
            disabled={authState.isLoading}
            className="login-button"
          >
            Sign In
          </Button>
        </form>

        <div className="login-footer">
          <p className="login-text">
            Don't have an account?{' '}
            <Link to="/register" className="login-link">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
