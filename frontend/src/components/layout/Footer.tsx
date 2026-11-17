import { Link } from 'react-router-dom'
import { Logo } from '../ui/Brand'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span className="site-footer-brand">
          <Logo size={20} /> Hobbook · kostenlose Community-Sport-Events
        </span>
        <nav aria-label="Rechtliches">
          <Link to="/ueber">Über Hobbook</Link>
          <Link to="/datenschutz">Datenschutz</Link>
          <Link to="/impressum">Impressum</Link>
        </nav>
      </div>
    </footer>
  )
}
