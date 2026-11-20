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
      <NavLink to="/admin/kennzahlen" className={({ isActive }) => `tab${isActive ? ' tab-active' : ''}`}>
        Kennzahlen
      </NavLink>
      <NavLink to="/admin/feedback" className={({ isActive }) => `tab${isActive ? ' tab-active' : ''}`}>
        Feedback
      </NavLink>
    </nav>
  )
}
