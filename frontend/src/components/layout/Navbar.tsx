import { NavLink, Link, useLocation } from 'react-router-dom'
import { Compass, Home, Plus, CalendarCheck, User, Shield, LogIn } from 'lucide-react'
import { useAuthContext } from '../../store/AuthContext'
import { Logo } from '../ui/Brand'
import './Navbar.css'

const linkClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`

/**
 * Top bar on desktop/tablet, bottom tab bar on phones. Both show the same four
 * destinations (Start, Entdecken, Meine Events, Profil) plus the create action.
 * List and map are one place: /karte counts as Entdecken.
 */
export default function Navbar() {
  const { authState } = useAuthContext()
  const { pathname } = useLocation()
  const isAdmin = authState.user?.role === 'admin'
  const discoverClass = ({ isActive }: { isActive: boolean }) => linkClass({ isActive: isActive || pathname === '/karte' })

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="Hobbook Startseite">
            <Logo />
            <span className="brand-name">Hobbook</span>
          </Link>

          <nav className="topnav" aria-label="Hauptnavigation">
            <NavLink to="/" end className={linkClass}>
              <Home size={18} aria-hidden="true" /> Start
            </NavLink>
            <NavLink to="/entdecken" className={discoverClass}>
              <Compass size={18} aria-hidden="true" /> Entdecken
            </NavLink>
            <NavLink to="/meine-events" className={linkClass}>
              <CalendarCheck size={18} aria-hidden="true" /> Meine Events
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={linkClass}>
                <Shield size={18} aria-hidden="true" /> Moderation
              </NavLink>
            )}
          </nav>

          <div className="topbar-actions">
            <Link to="/events/neu" className="btn btn-primary create-btn">
              <Plus size={18} aria-hidden="true" /> Event erstellen
            </Link>
            {authState.isLoggedIn ? (
              <NavLink to="/profil" className={linkClass} aria-label={`Profil von ${authState.user?.name?.split(' ')[0] || 'dir'}`}>
                <User size={18} aria-hidden="true" />
                <span className="nav-username">{authState.user?.name?.split(' ')[0]}</span>
              </NavLink>
            ) : (
              <Link to="/login" className="btn btn-secondary">
                <LogIn size={16} aria-hidden="true" /> Anmelden
              </Link>
            )}
          </div>

        </div>
      </header>

      <nav className="bottomnav" aria-label="Hauptnavigation (mobil)">
        <NavLink to="/" end className={linkClass}>
          <Home size={22} aria-hidden="true" />
          <span>Start</span>
        </NavLink>
        <NavLink to="/entdecken" className={discoverClass}>
          <Compass size={22} aria-hidden="true" />
          <span>Entdecken</span>
        </NavLink>
        <NavLink to="/events/neu" className="bottomnav-create" aria-label="Event erstellen">
          <Plus size={26} aria-hidden="true" />
        </NavLink>
        <NavLink to="/meine-events" className={linkClass}>
          <CalendarCheck size={22} aria-hidden="true" />
          <span>Meine</span>
        </NavLink>
        <NavLink to={authState.isLoggedIn ? '/profil' : '/login'} className={linkClass}>
          <User size={22} aria-hidden="true" />
          <span>{authState.isLoggedIn ? 'Profil' : 'Anmelden'}</span>
        </NavLink>
      </nav>
    </>
  )
}
