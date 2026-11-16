import { Navigate, Outlet } from 'react-router-dom'
import { useAuthContext } from '../../store/AuthContext'

interface Props {
  adminOnly?: boolean
}

export default function ProtectedRoute({ adminOnly = false }: Props) {
  const { authState } = useAuthContext()

  if (authState.isLoading) {
    return <div className="loading">Laden...</div>
  }

  if (!authState.isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && authState.user?.role !== 'admin') {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
