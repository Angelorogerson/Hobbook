import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarPlus, Check, LocateFixed, Navigation, Plus, Share2, Users, Zap } from 'lucide-react'
import EventCard from '@/components/events/EventCard'
import SportIcon from '@/components/ui/SportIcon'
import { DateTile, EventCardSkeleton } from '@/components/ui/DataPieces'
import { SPORTS, sportColor, sportLabel } from '@/constants/sports'
import { formatEventDate } from '@/utils/format'
import { useReveal, useRevealReady } from '@/hooks/useReveal'
import type { SportEvent } from '@/api/eventApi'
import { CitySearch, DISCOVER, WordRoller, useActiveStep, useDrift, useLandingEvents } from './parts'
import './landing.css'

const ROLLER_WORDS = ['Fußball', 'Basketball', 'Laufen', 'Volleyball', 'Tennis', 'Radfahren']

const STEPS = [
  {
    title: 'Finden',
    text: 'Such nach deiner Stadt oder tippe auf „In meiner Nähe“. Liste und Karte zeigen dir, was heute, morgen oder am Wochenende läuft – und wie weit es ist.',
  },
  {
    title: 'Mitmachen',
    text: 'Ein Tipp auf „Mitmachen“ und dein Platz ist reserviert. Kostenlos. Kommt etwas dazwischen, trittst du genauso schnell wieder aus.',
  },
  {
    title: 'Hingehen',
    text: 'Treffpunkt, Uhrzeit und Route stehen im Event. Pack es in deinen Kalender, schnapp dir deine Sachen – und triff die anderen auf dem Platz.',
  },
]

/**
 * Public start page. Real events come first; motion explains the product
 * ("the ball is rolling") instead of decorating it, and everything stays
 * readable and usable with reduced motion.
 */
export default function LandingPage() {
  const { events, loading, failed } = useLandingEvents()
  useRevealReady()

  // Warm up the Discover chunk so the first tap into the app feels instant.
  useEffect(() => {
    const t = window.setTimeout(() => void import('@/pages/events/DiscoverPage'), 2000)
    return () => window.clearTimeout(t)
  }, [])

  const list = events || []
  const railRef = useDrift<HTMLUListElement>(list.length > 1)
  const sportsRef = useReveal<HTMLElement>(0.3)
  const hostRef = useReveal<HTMLElement>()
  const finalRef = useReveal<HTMLElement>()

  return (
    <div className="lp">
      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-inner">
          <p className="lp-kicker">
            <Zap size={16} aria-hidden="true" /> Kostenlos · von der Community · ohne Verein
          </p>
          <h1 className="lp-h1">
            Finde dein nächstes <span className="lp-h1-mark">Spiel.</span>
            <span className="lp-ball" aria-hidden="true" />
          </h1>
          <p className="lp-sub">
            <span className="lp-sub-roll">
              <WordRoller words={ROLLER_WORDS} />
              <span className="sr-only">Fußball, Basketball, Laufen und mehr</span>
            </span>
            in deiner Nähe – finden, mitmachen, Leute treffen.
          </p>
          <CitySearch id="lp-city-hero" />
          <div className="lp-cta">
            <Link to={DISCOVER} className="btn btn-primary btn-lg">
              Events entdecken <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/events/neu" className="btn btn-secondary btn-lg">
              <Plus size={18} aria-hidden="true" /> Event erstellen
            </Link>
          </div>
        </div>

        {/* Real events, right away */}
        <div className="lp-live">
          <div className="lp-wrap lp-live-head">
            <h2 className="lp-live-title">
              <span className="lp-live-dot" aria-hidden="true" /> Das läuft gerade
            </h2>
            <Link to={DISCOVER} className="lp-more">
              Alle ansehen <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {loading && (
            <div className="lp-rail" aria-hidden="true">
              <div className="lp-rail-item">
                <EventCardSkeleton />
              </div>
              <div className="lp-rail-item">
                <EventCardSkeleton />
              </div>
              <div className="lp-rail-item">
                <EventCardSkeleton />
              </div>
            </div>
          )}
          {!loading && list.length > 0 && (
            <ul className="lp-rail" aria-label="Aktuelle Events" ref={railRef}>
              {list.map((e, i) => (
                <li key={e._id} className="lp-rail-item" style={{ ['--i' as string]: i }}>
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          )}
          {!loading && list.length === 0 && (
            <div className="lp-wrap">
              <p className="lp-empty">
                {failed ? (
                  <>
                    <strong>Events konnten gerade nicht geladen werden.</strong> Schau gleich noch einmal in die Liste.
                  </>
                ) : (
                  <>
                    <strong>Noch keine Events.</strong> Mach den Anfang und starte das erste in deiner Stadt.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Sports ── */}
      <section className="lp-sports reveal" ref={sportsRef} aria-labelledby="lp-sports-h">
        <div className="lp-wrap">
          <h2 id="lp-sports-h" className="lp-h2">
            Worauf hast du Lust?
          </h2>
          <ul className="lp-sport-list" aria-label="Direkt zur Sportart">
            {SPORTS.map((s, i) => (
              <li key={s.key} style={{ ['--i' as string]: i }}>
                <Link to={`${DISCOVER}?sport=${s.key}`} className="lp-sport" style={{ ['--sport-color' as string]: sportColor(s.key) }}>
                  <SportIcon sport={s.key} size={20} />
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HowItWorks event={list[0]} />

      {/* ── Organize ── */}
      <section className="lp-host reveal" ref={hostRef} aria-labelledby="lp-host-h">
        <div className="lp-wrap lp-host-inner">
          <div>
            <h2 id="lp-host-h" className="lp-h2">
              Nichts Passendes dabei? Starte dein eigenes Event.
            </h2>
            <p className="lp-lead">Sportart antippen, Zeit und Treffpunkt wählen, veröffentlichen. Das dauert etwa eine Minute.</p>
            <Link to="/events/neu" className="btn btn-ink btn-lg">
              <Plus size={18} aria-hidden="true" /> Event erstellen
            </Link>
          </div>
          <ul className="lp-host-facts">
            <li>
              <Users size={22} aria-hidden="true" />
              <span>
                <strong>Du legst die Plätze fest.</strong> Wer mitmacht, siehst du sofort.
              </span>
            </li>
            <li>
              <Share2 size={22} aria-hidden="true" />
              <span>
                <strong>Ein Link zum Teilen.</strong> Öffentlich in Liste und Karte – oder nur für deine Leute.
              </span>
            </li>
            <li>
              <Check size={22} aria-hidden="true" />
              <span>
                <strong>Immer kostenlos.</strong> Keine Gebühren, keine Buchungen, keine Werbung.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Final ── */}
      <section className="lp-final reveal" ref={finalRef} aria-labelledby="lp-final-h">
        <div className="lp-wrap lp-final-inner">
          <span className="lp-final-ball" aria-hidden="true" />
          <h2 id="lp-final-h" className="lp-h2">
            Wo spielst du als Nächstes?
          </h2>
          <CitySearch id="lp-city-final" tone="stage" />
          <p className="lp-final-links">
            <Link to="/ueber">So funktioniert Hobbook</Link> · <Link to="/regeln">Community-Regeln</Link>
          </p>
        </div>
      </section>
    </div>
  )
}

/**
 * Scroll scene: while the three steps scroll past, one event on the pinned
 * "phone" goes from found, to joined, to "on my way". The stage is decorative
 * (the steps carry the meaning) and shows a real event when there is one.
 */
function HowItWorks({ event }: { event?: SportEvent }) {
  const { active, setRef } = useActiveStep(STEPS.length)
  const start = event?.startAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  const sport = event?.sport || 'football'
  const time = event ? formatEventDate(event.startAt, event.endAt, event.timezone).time : '18:00–20:00 Uhr'
  const taken = event ? Math.min(event.participantCount, 5) : 3

  return (
    <section className="lp-how" aria-labelledby="lp-how-h">
      <div className="lp-wrap">
        <h2 id="lp-how-h" className="lp-h2">
          In drei Schritten auf dem Platz
        </h2>
        <div className="lp-how-grid">
          <div className="lp-stage" data-step={active} aria-hidden="true" style={{ ['--sport-color' as string]: sportColor(sport) }}>
            <div className="lp-phone">
              <div className="lp-phone-chips">
                <span className="lp-chip lp-chip--near">
                  <LocateFixed size={14} /> In meiner Nähe
                </span>
                <span className="lp-chip">Heute</span>
                <span className="lp-chip">Wochenende</span>
              </div>
              <div className="lp-mock-card">
                <DateTile iso={start} timeZone={event?.timezone} />
                <div className="lp-mock-body">
                  <span className="lp-mock-sport">
                    <SportIcon sport={sport} size={14} /> {sportLabel(sport)}
                  </span>
                  <strong className="lp-mock-title">{event?.title || 'Dein nächstes Spiel'}</strong>
                  <span className="lp-mock-meta">
                    {time} · {event?.location.placeName || 'Sportplatz um die Ecke'}
                  </span>
                  <span className="lp-mock-dots">
                    {Array.from({ length: 6 }, (_, i) => (
                      <i key={i} className={i < taken ? 'is-taken' : i === taken ? 'is-me' : ''} />
                    ))}
                  </span>
                </div>
              </div>
              <div className="lp-mock-join">
                <span className="lp-mock-join-a">Mitmachen</span>
                <span className="lp-mock-join-b">
                  <Check size={16} /> Du bist dabei
                </span>
              </div>
              <div className="lp-mock-go">
                <span>
                  <Navigation size={14} /> Route
                </span>
                <span>
                  <CalendarPlus size={14} /> In Kalender
                </span>
              </div>
              <svg className="lp-mock-route" viewBox="0 0 280 60" preserveAspectRatio="none">
                <path d="M8 50 C 60 10, 120 58, 170 28 S 250 12, 270 16" pathLength={1} />
                <circle cx="8" cy="50" r="5" className="lp-mock-route-me" />
                <circle cx="270" cy="16" r="6" className="lp-mock-route-pin" />
              </svg>
            </div>
          </div>

          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} ref={setRef(i)} data-step={i} className={`lp-step${active === i ? ' is-active' : ''}`}>
                <span className="lp-step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
