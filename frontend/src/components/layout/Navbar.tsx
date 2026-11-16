import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../store/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { authState, logout } = useAuthContext()
  const location = useLocation()
  const navigate = useNavigate()

  const isAuthPage = ['/login', '/register'].includes(location.pathname)

  if (isAuthPage) {
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinks = [
    { label: '🏠 Home', path: '/home' },
     { label: '🤝 Connect', path: '/connect' },
    { label: '🔍 Venue ', path: '/search' },
  
    { label: '📊 About us', path: '/dashboard' },
    { label: '📅 Buchungen', path: '/bookings' },
    { label: '❤️ Favoriten', path: '/favorites' },
    { label: '👤 Profil', path: '/profile' },
  ]

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/home" className="navbar-brand">
           HOBBOOK
        </Link>

        <ul className="navbar-links">
          {navLinks.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            </li>
          ))}

          {authState.user?.role === 'admin' && (
            <li>
              <Link to="/admin" className={`navbar-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                ⚙️ Admin
              </Link>
            </li>
          )}
        </ul>

        <div className="navbar-right">
          <span className="user-badge">{authState.user?.name}</span>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
