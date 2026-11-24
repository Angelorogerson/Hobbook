import { useEffect, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarPlus,
  Check,
  Flag,
  Gift,
  LocateFixed,
  Navigation,
  Plus,
  Share2,
  ShieldCheck,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
import EventCard from '@/components/events/EventCard'
import SportIcon from '@/components/ui/SportIcon'
import { DateTile, EventCardSkeleton } from '@/components/ui/DataPieces'
import { SPORTS, sportColor, sportLabel } from '@/constants/sports'
import { formatEventDate } from '@/utils/format'
import { useRevealReady, useRevealScope } from '@/hooks/useReveal'
import type { SportEvent } from '@/api/eventApi'
import { CitySearch, DISCOVER, WordRoller, useActiveStep, useDrift, useKickoff, useLandingEvents } from './parts'
import { useOnChange, usePrevious } from '@/hooks/useOnChange'
import { MOTION } from '@/utils/motion'
import './landing.css'

// Ends on the general word, so the sentence settles on "Sport in deiner Nähe".
const ROLLER_WORDS = ['Fußball', 'Basketball', 'Laufen', 'Sport']

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

const TRUST = [
  { icon: Gift, title: 'Immer kostenlos', text: 'Keine Gebühren, keine Buchungen, keine Werbung.' },
  { icon: UserRound, title: 'Nur „Vorname N.“ ist öffentlich', text: 'Wer dabei ist, sehen nur die Teilnehmenden.' },
  { icon: Flag, title: 'Melden mit einem Tipp', text: 'Komische Events prüfen wir und nehmen sie raus.' },
  { icon: ShieldCheck, title: 'Klare Regeln', text: 'Fair spielen, absagen statt fernbleiben, öffentlich treffen.' },
]

const order = (i: number) => ({ ['--i' as string]: i }) as CSSProperties

/**
 * Public start page, told as one story: promise → the real product → how it
 * works → variety → the other side (organising) → trust → action.
 * The ball is the thread: it rolls into the headline, travels along the three
 * steps and lands on the final search. Everything is readable without motion.
 */
export default function LandingPage() {
  const { events, loading, failed } = useLandingEvents()
  useRevealReady()
  const pageRef = useRevealScope<HTMLDivElement>()

  // Warm up the Discover chunk so the first tap into the app feels instant.
  useEffect(() => {
    const t = window.setTimeout(() => void import('@/pages/events/DiscoverPage'), 2000)
    return () => window.clearTimeout(t)
  }, [])

  const list = events || []
  const ballRef = useKickoff()
  const railRef = useDrift<HTMLUListElement>(list.length > 1)

  return (
    <div className="lp" ref={pageRef}>
      {/* ── 1. Promise ── */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-inner">
          <p className="lp-kicker lp-in" style={order(0)}>
            <Zap size={16} aria-hidden="true" /> Kostenlos · von der Community · ohne Verein
          </p>
          <h1 className="lp-h1 lp-in" style={order(1)}>
            Finde dein nächstes <span className="lp-h1-mark">Spiel.</span>
            <span className="lp-ball-x" ref={ballRef} aria-hidden="true">
              <span className="lp-ball" />
            </span>
          </h1>
          <p className="lp-sub lp-in" style={order(2)}>
            <span className="lp-sub-roll">
              <WordRoller words={ROLLER_WORDS} />
              <span className="sr-only">Sport</span>
            </span>
            in deiner Nähe – finden, mitmachen, Leute treffen.
          </p>
          <div className="lp-in lp-hero-search" style={order(3)}>
            <CitySearch id="lp-city-hero" />
          </div>
          <div className="lp-cta lp-in" style={order(4)}>
            <Link to={DISCOVER} className="btn btn-primary btn-lg">
              Events entdecken <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/events/neu" className="btn btn-secondary btn-lg">
              <Plus size={18} aria-hidden="true" /> Event erstellen
            </Link>
          </div>
        </div>

        {/* ── 2. The real product, right away ── */}
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
                <li key={e._id} className="lp-rail-item lp-card-in" style={order(Math.min(i, 5))}>
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          )}
          {!loading && list.length === 0 && (
            <div className="lp-wrap">
              <p className="lp-empty m-fade-in">
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

      {/* ── 3. How it works ── */}
      <HowItWorks event={list[0]} />

      {/* ── 4. Variety ── */}
      <section className="lp-sports" aria-labelledby="lp-sports-h">
        <div className="lp-wrap">
          <h2 id="lp-sports-h" className="lp-h2" data-reveal>
            Worauf hast du Lust?
          </h2>
          <ul className="lp-sport-list" aria-label="Direkt zur Sportart" data-reveal="group">
            {SPORTS.map((s) => (
              <li key={s.key}>
                <Link to={`${DISCOVER}?sport=${s.key}`} className="lp-sport" style={{ ['--sport-color' as string]: sportColor(s.key) }}>
                  <SportIcon sport={s.key} size={20} />
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 5. The other side: organising ── */}
      <section className="lp-host" aria-labelledby="lp-host-h">
        <div className="lp-wrap lp-host-inner">
          <div data-reveal="group">
            <h2 id="lp-host-h" className="lp-h2">
              Nichts Passendes dabei? Starte dein eigenes Event.
            </h2>
            <p className="lp-lead">Sportart antippen, Zeit und Treffpunkt wählen, veröffentlichen. Das dauert etwa eine Minute.</p>
            <div>
              <Link to="/events/neu" className="btn btn-ink btn-lg">
                <Plus size={18} aria-hidden="true" /> Event erstellen
              </Link>
            </div>
          </div>
          <ul className="lp-host-facts" data-reveal="group">
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
                <strong>Alles an einem Ort.</strong> Änderungen und Absagen sehen alle Teilnehmenden direkt im Event.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── 6. Trust ── */}
      <section className="lp-trust" aria-labelledby="lp-trust-h">
        <div className="lp-wrap">
          <h2 id="lp-trust-h" className="lp-h2" data-reveal>
            Fair und sicher dabei
          </h2>
          <ul className="lp-trust-list" data-reveal="group">
            {TRUST.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="lp-trust-icon" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <strong>{title}</strong>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p className="lp-trust-more" data-reveal>
            <Link to="/regeln">Community-Regeln lesen</Link> · <Link to="/ueber">So funktioniert Hobbook</Link>
          </p>
        </div>
      </section>

      {/* ── 7. Action ── */}
      <section className="lp-final" aria-labelledby="lp-final-h">
        <div className="lp-wrap lp-final-inner" data-reveal="group">
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
 * "phone" goes from found, to joined, to "on my way", and the ball travels
 * down the step line to the current step. The stage is decorative (the steps
 * carry the meaning) and shows a real event when there is one.
 */
function HowItWorks({ event }: { event?: SportEvent }) {
  const { active, marks, setRef } = useActiveStep(STEPS.length)
  const start = event?.startAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  const sport = event?.sport || 'football'
  const time = event ? formatEventDate(event.startAt, event.endAt, event.timezone).time : '18:00–20:00 Uhr'
  const taken = event ? Math.min(event.participantCount, 5) : 3
  const ballY = marks[active] ?? 0
  const prevY = usePrevious(ballY)
  const moving = useOnChange(ballY, MOTION.dur6)
  const rollDir = ballY < prevY ? 'up' : 'down'
  const firstY = marks[0] ?? 0

  return (
    <section className="lp-how" aria-labelledby="lp-how-h">
      <div className="lp-wrap">
        <h2 id="lp-how-h" className="lp-h2" data-reveal>
          In drei Schritten auf dem Platz
        </h2>
        <div className="lp-how-grid">
          <div className="lp-stage" data-step={active} aria-hidden="true" style={{ ['--sport-color' as string]: sportColor(sport) }}>
            <div className="lp-phone" data-scroll-zoom>
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
            {/* The step line fills up to the current step and the ball rolls along it */}
            <span className="lp-track" aria-hidden="true" style={{ top: firstY, height: Math.max(0, (marks[marks.length - 1] ?? 0) - firstY) }}>
              <span className="lp-track-fill" style={{ transform: `scaleY(${marks.length > 1 ? (ballY - firstY) / ((marks[marks.length - 1] ?? 1) - firstY || 1) : 0})` }} />
            </span>
            <span
              className={`lp-track-ball${moving ? ' is-moving' : ''}`}
              data-dir={rollDir}
              aria-hidden="true"
              // A 19px ball travels ~60px per turn: rotate with the distance so it really rolls
              style={{ transform: `translateY(${ballY}px) rotate(${(ballY / 60) * 360}deg)` }}
            />
            {STEPS.map((s, i) => (
              <li key={s.title} ref={setRef(i)} data-step={i} className={`lp-step${active === i ? ' is-active' : ''}${active > i ? ' is-done' : ''}`}>
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
