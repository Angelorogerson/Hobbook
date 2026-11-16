import { NavLink } from 'react-router-dom'

export default function AdminNav() {
  return (
    <nav className="tabs" aria-label="Moderation">
      <NavLink to="/admin" end className={({ isActive }) => `tab${isActive ? ' tab-active' : ''}`}>
        Meldungen
      </NavLink>
      <NavLink to="/admin/events" className={({ isActive }) => `tab${isActive ? ' tab-active' : ''}`}>
        Alle Events
      </NavLink>
    </nav>
  )
}
