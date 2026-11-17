import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Compass, Map as MapIcon, Plus, CalendarCheck, User, Shield, LogIn, LogOut } from 'lucide-react'
import { useAuthContext } from '../../store/AuthContext'
import { Logo, ThemeToggle } from '../ui/Brand'
import './Navbar.css'

const linkClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`

/** Top bar on desktop/tablet, bottom tab bar on phones. Create stays prominent in both. */
export default function Navbar() {
  const { authState, logout } = useAuthContext()
  const navigate = useNavigate()
  const isAdmin = authState.user?.role === 'admin'

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="Hobbook Startseite">
            <Logo />
            <span className="brand-name">Hobbook</span>
          </Link>

          <nav className="topnav" aria-label="Hauptnavigation">
            <NavLink to="/entdecken" className={linkClass}>
              <Compass size={18} aria-hidden="true" /> Entdecken
            </NavLink>
            <NavLink to="/karte" className={linkClass}>
              <MapIcon size={18} aria-hidden="true" /> Karte
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
            <ThemeToggle />
            <Link to="/events/neu" className="btn btn-primary create-btn">
              <Plus size={18} aria-hidden="true" /> Event erstellen
            </Link>
            {authState.isLoggedIn ? (
              <>
                <NavLink to="/profil" className={linkClass}>
                  <User size={18} aria-hidden="true" />
                  <span className="nav-username">{authState.user?.name?.split(' ')[0]}</span>
                </NavLink>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  aria-label="Abmelden"
                  title="Abmelden"
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                >
                  <LogOut size={18} aria-hidden="true" />
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-secondary">
                <LogIn size={16} aria-hidden="true" /> Anmelden
              </Link>
            )}
          </div>

          {/* Phones: theme toggle stays reachable in the slim top bar */}
          <div className="topbar-mobile-actions">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <nav className="bottomnav" aria-label="Hauptnavigation (mobil)">
        <NavLink to="/entdecken" className={linkClass}>
          <Compass size={22} aria-hidden="true" />
          <span>Entdecken</span>
        </NavLink>
        <NavLink to="/karte" className={linkClass}>
          <MapIcon size={22} aria-hidden="true" />
          <span>Karte</span>
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
