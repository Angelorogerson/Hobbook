import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthContext } from '../../store/AuthContext'
import { Button, Input, LoadingSpinner } from '../../components/common'
import './RegisterPage.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { authState, register } = useAuthContext()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!name.trim()) {
      errors.name = 'Name is required'
    } else if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters'
    }

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

    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
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
      await register({ name, email, password })
      navigate('/home')
    } catch (error) {
      // Error is handled by authState.error from context
    }
  }

  if (authState.isLoading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1 className="register-title">Create Account</h1>
          <p className="register-subtitle">Join Hobbook Today</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {authState.error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {authState.error}
            </div>
          )}

          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={setName}
            placeholder="Enter your full name"
            error={validationErrors.name}
            disabled={authState.isLoading}
          />

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

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm your password"
            error={validationErrors.confirmPassword}
            disabled={authState.isLoading}
          />

          <Button
            type="submit"
            variant="primary"
            loading={authState.isLoading}
            disabled={authState.isLoading}
            className="register-button"
          >
            Create Account
          </Button>
        </form>

        <div className="register-footer">
          <p className="register-text">
            Already have an account?{' '}
            <Link to="/login" className="register-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
