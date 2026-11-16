import { useNavigate, useLocation } from 'react-router-dom'

const LINKS = [
  { label: 'Übersicht', path: '/admin', icon: 'dashboard' },
  { label: 'Venues', path: '/admin/venues', icon: 'stadium' },
  { label: 'Events', path: '/admin/events', icon: 'event_note' },
  { label: 'Buchungen', path: '/admin/bookings', icon: 'calendar_month' },
]

export default function AdminNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="adm-subnav">
      <div className="adm-subnav-inner">
        {LINKS.map(link => (
          <button
            key={link.path}
            className={`adm-subnav-link ${isActive(link.path) ? 'adm-subnav-link--active' : ''}`}
            onClick={() => navigate(link.path)}
          >
            <span className="material-symbols-outlined adm-subnav-icon">{link.icon}</span>
            {link.label}
          </button>
        ))}
        <div className="adm-subnav-sep" />
        <span className="adm-subnav-badge">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>shield</span>
          Admin
        </span>
      </div>
    </nav>
  )
}
