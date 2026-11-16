import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <span>Hobbook – kostenlose Community-Sport-Events</span>
      <nav aria-label="Rechtliches">
        <Link to="/datenschutz">Datenschutz</Link>
        <Link to="/impressum">Impressum</Link>
        <Link to="/ueber">Über Hobbook</Link>
      </nav>
    </footer>
  )
}
