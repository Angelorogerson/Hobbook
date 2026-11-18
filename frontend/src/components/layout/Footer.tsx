import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Logo } from '../ui/Brand'

// Only https links are accepted, so a misconfigured value can never become a script URL.
const rawSupportUrl = import.meta.env.VITE_SUPPORT_URL || ''
const SUPPORT_URL = rawSupportUrl.startsWith('https://') ? rawSupportUrl : ''

export default function Footer() {
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
          <Link to="/ueber">Über Hobbook</Link>
          <Link to="/datenschutz">Datenschutz</Link>
          <Link to="/impressum">Impressum</Link>
        </nav>
      </div>
    </footer>
  )
}
