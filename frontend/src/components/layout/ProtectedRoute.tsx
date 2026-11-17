import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../store/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

interface Props {
  adminOnly?: boolean
}

/** Guards routes that change data. Public discovery routes are not wrapped. */
export default function ProtectedRoute({ adminOnly = false }: Props) {
  const { authState } = useAuthContext()
  const location = useLocation()

  if (authState.isLoading) return <LoadingSpinner fullScreen />

  if (!authState.isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (adminOnly && authState.user?.role !== 'admin') return <Navigate to="/entdecken" replace />

  return <Outlet />
}
