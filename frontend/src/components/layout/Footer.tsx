import { Link, useLocation } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Logo, ThemeToggle } from '../ui/Brand'

// Only https links are accepted, so a misconfigured value can never become a script URL.
const rawSupportUrl = import.meta.env.VITE_SUPPORT_URL || ''
const SUPPORT_URL = rawSupportUrl.startsWith('https://') ? rawSupportUrl : ''

export default function Footer() {
  const { pathname } = useLocation()
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span className="site-footer-brand">
          <Logo size={20} /> Hobbook · kostenlose Community-Sport-Events
        </span>
        <nav aria-label="Rechtliches">
          {SUPPORT_URL && (
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="site-footer-support">
              <Heart size={16} aria-hidden="true" /> Hobbook unterstützen
            </a>
          )}
          <Link to="/ueber">So funktioniert’s</Link>
          <Link to="/regeln">Regeln</Link>
          <Link to="/feedback" state={{ from: pathname }}>
            Feedback
          </Link>
          <Link to="/datenschutz">Datenschutz</Link>
          <Link to="/impressum">Impressum</Link>
          <ThemeToggle />
        </nav>
      </div>
    </footer>
  )
}
