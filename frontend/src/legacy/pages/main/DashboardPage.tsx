import { useNavigate } from 'react-router-dom'
import profileImage from '@/assets/images/picture.png'
import './DashboardPage.css'

const MILESTONES = [
  {
    icon: 'code',
    title: 'Die Vision',
    text: 'Was als Studienprojekt begann, entwickelte sich zur Mission, Sportler digital und lokal zu vernetzen.',
  },
  {
    icon: 'school',
    title: 'HTW Saar Expertise',
    text: 'Fundiertes Know-how aus dem Studium der Kommunikationsinformatik fließt direkt in die Entwicklung ein.',
  },
  {
    icon: 'trending_up',
    title: 'Stetiges Wachstum',
    text: 'Kontinuierliche Verbesserung der Plattform – immer auf der Suche nach neuen technischen Herausforderungen.',
  },
]

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="about-page">

      {/* ── HERO (dark) ── */}
      <section className="about-hero">
        <div className="about-hero-overlay" aria-hidden="true" />

        <div className="about-hero-inner">
          <div className="about-hero-content">
            <div className="about-mission-badge">Meine Mission</div>

            <h1 className="about-hero-title">
              Sport verbindet – Technik macht es möglich
            </h1>

            <p className="about-hero-text">
              Ich bin davon überzeugt, dass Technologie Barrieren abbauen sollte. 
              Hobbook ist mein Projekt, um Hobbysportler in ihrer lokalen Umgebung 
              einfacher und schneller zusammenzubringen.
            </p>

            <div className="about-hero-stats">
              <div className="about-stat">
                <span className="about-stat-val">HTW Saar</span>
                <span className="about-stat-label">Studium</span>
              </div>
              <div className="about-stat">
                <span className="about-stat-val">100%</span>
                <span className="about-stat-label">Eigenentwicklung</span>
              </div>
            </div>
          </div>

          <div className="about-hero-visual">
            <div className="about-hero-visual-inner">
              <span className="material-symbols-outlined about-hero-big-icon material-symbols-filled">
                terminal
              </span>
              <div className="about-hero-visual-tag">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>code</span>
                Passion for Dev
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MILESTONES ── */}
      <section className="about-milestones">
        <div className="about-section-container">
          <div className="about-section-head">
            <h2 className="about-section-title">Der Weg hinter dem Code</h2>
            <div className="about-title-bar" />
          </div>

          <div className="about-milestones-grid">
            {MILESTONES.map(m => (
              <div key={m.title} className="about-milestone-card">
                <div className="about-milestone-icon">
                  <span className="material-symbols-outlined">{m.icon}</span>
                </div>
                <h3 className="about-milestone-title">{m.title}</h3>
                <p className="about-milestone-text">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEVELOPER SECTION (Solo) ── */}
      <section className="about-team">
        <div className="about-section-container">
          <div className="about-section-head" style={{ marginBottom: 10 }}>
            <h2 className="about-team-title">Der Entwickler</h2>
          </div>

          <div className="about-member-solo">
            <div className="about-member-img-wrap">
              <img 
                src={profileImage} 
                alt="Angelo Rogerson Talom Zebaze" 
                className="about-member-photo"
                style={{
                  width: '50%',
                  height: '50%',
                  objectFit: 'cover',
                  borderRadius: '2px',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>
            <h3 className="about-member-name">Angelo Rogerson Talom Zebaze</h3>
            <p className="about-member-role">Full-Stack Developer & Student @ HTW Saar</p>
            
            <div className="about-member-bio-box">
              <p className="about-member-bio">
                Aktuell studiere ich <strong>Kommunikationsinformatik</strong> an der HTW Saar. 
                Als leidenschaftlicher Entwickler hinter Hobbook kombiniere ich meine Begeisterung für 
                sauberen Code mit dem Ziel, echte Probleme im Alltag zu lösen. 
              </p>
              <p className="about-member-bio">
                Ich befinde mich derzeit auf der Suche nach neuen beruflichen Herausforderungen, 
                um mein Wissen in einem professionellen Team einzubringen und gemeinsam innovative 
                Lösungen zu skalieren.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="about-cta-outer">
        <div className="about-section-container">
          <div className="about-cta-box">
            <div className="about-cta-bg" aria-hidden="true" />
            <div className="about-cta-inner">
              <h2 className="about-cta-title">Lust auf Zusammenarbeit?</h2>
              <p className="about-cta-sub">
                Ich bin immer offen für Feedback, Austausch oder spannende Jobangebote.
              </p>
              <div className="about-cta-actions">
                <button
                  className="about-cta-btn about-cta-btn--primary"
                  onClick={() => window.location.href = 'mailto:anta00007@htwsaar.de'}
                >
                  Kontakt aufnehmen
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}