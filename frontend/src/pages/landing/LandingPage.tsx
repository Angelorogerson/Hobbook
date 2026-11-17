import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarPlus,
  Eye,
  Link2,
  LogIn,
  Map as MapIcon,
  MapPin,
  MousePointerClick,
  Plus,
  SlidersHorizontal,
  Box,
  Clock,
  Users,
  Signal,
} from 'lucide-react'
import EventCard from '@/components/events/EventCard'
import { CapacityMeter, DateTile, EventCardSkeleton } from '@/components/ui/DataPieces'
import SportIcon from '@/components/ui/SportIcon'
import { SPORTS, levelLabel, sportColor, sportLabel } from '@/constants/sports'
import { formatEventDate, formatLongDate } from '@/utils/format'
import { useReveal, useRevealReady } from '@/hooks/useReveal'
import type { SportEvent } from '@/api/eventApi'
import { CitySearch, DISCOVER, PitchLines, Pin, projectPins, useLandingEvents } from './parts'
import './landing.css'

const HEADLINE = ['Finde', 'dein', 'nächstes', 'Spiel.']

export default function LandingPage() {
  useRevealReady()
  // Warm up the (code-split) Discover chunk once the hero is done, so the main CTA opens instantly.
  useEffect(() => {
    const t = window.setTimeout(() => void import('@/pages/events/DiscoverPage'), 2000)
    return () => window.clearTimeout(t)
  }, [])
  const { events, loading } = useLandingEvents()
  const list = events ?? []

  return (
    <div className="landing">
      <Hero events={list} loading={loading} />
      <FindSection events={list} loading={loading} />
      <ChooseSection event={list[0]} loading={loading} />
      <JoinSection />
      <CreateSection />
      <FinalSection />
    </div>
  )
}

/* ── 1 · Entdecken ───────────────────────────────────────────── */
function Hero({ events, loading }: { events: SportEvent[]; loading: boolean }) {
  const featured = events.slice(0, 3)
  return (
    <section className="lp-hero stage" aria-labelledby="hero-title">
      <PitchLines className="lp-hero-pitch" />
      <div className="lp-floodlight" aria-hidden="true" />

      <div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-copy">
          <h1 id="hero-title" className="lp-hero-title">
            {HEADLINE.map((w, i) => (
              <Fragment key={w}>
                <span className="lp-word-mask">
                  <span className={`lp-word${i === HEADLINE.length - 1 ? ' is-accent' : ''}`} style={{ ['--i' as string]: i }}>
                    {w}
                  </span>
                </span>
                {i < HEADLINE.length - 1 && ' '}
              </Fragment>
            ))}
          </h1>
          <p className="lp-hero-sub">
            Kostenlose Sport-Events aus deiner Community – auf Liste und Karte. Such deine Stadt, sieh was los ist und
            mach mit. Oder starte einfach dein eigenes Event.
          </p>
          <CitySearch id="hero-city" />
          <div className="lp-ctas">
            <Link to={DISCOVER} className="lp-btn lp-btn--primary">
              Events entdecken <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/events/neu" className="lp-btn lp-btn--ghost">
              <Plus size={18} aria-hidden="true" /> Event erstellen
            </Link>
          </div>
        </div>

        <div className="lp-hero-live">
          {loading ? (
            <div className="lp-fan">
              {[0, 1, 2].map((i) => (
                <div key={i} className="lp-fan-card" style={{ ['--i' as string]: i }}>
                  <EventCardSkeleton />
                </div>
              ))}
            </div>
          ) : featured.length > 0 ? (
            <ul className="lp-fan" aria-label="Aktuelle Events">
              {featured.map((e, i) => (
                <li key={e._id} className="lp-fan-card" style={{ ['--i' as string]: i }}>
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="lp-empty-card">
              <p className="lp-empty-title">Noch keine Events.</p>
              <p>Starte das erste – andere finden es dann auf Liste und Karte.</p>
              <Link to="/events/neu" className="lp-btn lp-btn--primary">
                <Plus size={18} aria-hidden="true" /> Event erstellen
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="lp-wrap lp-sports">
        <p className="lp-sports-label" id="sports-label">
          Direkt zur Sportart
        </p>
        <ul className="lp-sports-list" aria-labelledby="sports-label">
          {SPORTS.map((s, i) => (
            <li key={s.key} style={{ ['--i' as string]: i }}>
              <Link
                to={`${DISCOVER}?sport=${s.key}`}
                className="lp-sport"
                style={{ ['--sport-c' as string]: sportColor(s.key) }}
              >
                <SportIcon sport={s.key} size={18} />
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ── 2 · Finden ──────────────────────────────────────────────── */
function FindSection({ events, loading }: { events: SportEvent[]; loading: boolean }) {
  const ref = useReveal<HTMLElement>()
  const rows = events.slice(0, 4)
  const [active, setActive] = useState<string | null>(null)
  const pins = projectPins(rows, 100, 100)
  const current = active ?? rows[0]?._id ?? null

  return (
    <section ref={ref} className="lp-section lp-find reveal" aria-labelledby="find-title">
      <div className="lp-wrap lp-split">
        <div className="lp-copy">
          <h2 id="find-title" className="lp-h2">
            Liste und Karte. <span className="lp-h2-soft">Ein Blick.</span>
          </h2>
          <p className="lp-lead">
            Jedes Event steht in der Liste und auf der Karte. Tippst du eins an, siehst du sofort, wo es stattfindet.
          </p>
          <ul className="lp-features">
            <li>
              <SlidersHorizontal size={20} aria-hidden="true" />
              <span>
                <strong>Filtern</strong> nach Stadt, Sportart und Zeitraum
              </span>
            </li>
            <li>
              <MapIcon size={20} aria-hidden="true" />
              <span>
                <strong>Karte verschieben</strong> und genau in diesem Bereich suchen
              </span>
            </li>
            <li>
              <Box size={20} aria-hidden="true" />
              <span>
                <strong>3D-Ansicht</strong> zeigt dir die Umgebung des Treffpunkts
              </span>
            </li>
          </ul>
          <Link to="/karte" className="lp-btn lp-btn--dark">
            Karte öffnen <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>

        <div className="lp-device" aria-label="Vorschau: Liste und Karte">
          <ol className="lp-device-list">
            {loading &&
              [0, 1, 2].map((i) => (
                <li key={i} className="lp-row lp-row--skeleton">
                  <span className="skeleton" style={{ width: 44, height: 44 }} />
                  <span className="skeleton" style={{ flex: 1, height: 14 }} />
                </li>
              ))}
            {!loading && rows.length === 0 && (
              <li className="lp-row lp-row--empty">Sobald es Events gibt, erscheinen sie hier – und auf der Karte.</li>
            )}
            {rows.map((e) => {
              const { day, time } = formatEventDate(e.startAt, e.endAt, e.timezone)
              return (
                <li key={e._id}>
                  <Link
                    to={`/events/${e._id}`}
                    className={`lp-row${current === e._id ? ' is-active' : ''}`}
                    onMouseEnter={() => setActive(e._id)}
                    onFocus={() => setActive(e._id)}
                    style={{ ['--sport-c' as string]: sportColor(e.sport) }}
                  >
                    <span className="lp-row-icon">
                      <SportIcon sport={e.sport} size={20} />
                    </span>
                    <span className="lp-row-text">
                      <span className="lp-row-title">{e.title}</span>
                      <span className="lp-row-meta">
                        {day}, {time.replace(' Uhr', '')} · {e.location.city}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
          <div className="lp-minimap" aria-hidden="true">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="lp-minimap-streets">
              <path d="M0 30 Q30 26 52 38 T100 34" />
              <path d="M0 72 Q40 64 64 76 T100 70" />
              <path d="M24 0 Q30 40 22 100" />
              <path d="M70 0 Q62 46 76 100" />
              <path d="M0 52 L100 48" className="thin" />
              <path d="M46 0 L50 100" className="thin" />
            </svg>
            {pins.map(({ event, x, y }) => (
              <Pin key={event._id} sport={event.sport} active={current === event._id} style={{ left: `${x}%`, top: `${y}%` }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 3 · Auswählen ───────────────────────────────────────────── */
function ChooseSection({ event, loading }: { event?: SportEvent; loading: boolean }) {
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} className="lp-section lp-choose reveal" aria-labelledby="choose-title">
      <div className="lp-wrap lp-choose-grid">
        <div className="lp-copy">
          <h2 id="choose-title" className="lp-h2">
            Alles Wichtige. <span className="lp-h2-soft">Bevor du zusagst.</span>
          </h2>
          <p className="lp-lead">
            Wann und wo, wie viele Plätze noch frei sind und für welches Niveau das Event gedacht ist – auf einen Blick.
          </p>
        </div>

        {loading && <div className="lp-ticket lp-ticket--skeleton skeleton" aria-hidden="true" />}
        {!loading && event && <Ticket event={event} />}
        {!loading && !event && (
          <p className="lp-lead lp-choose-empty">
            Sobald das erste Event online ist, siehst du hier, wie übersichtlich jedes Event aufgebaut ist.
          </p>
        )}
      </div>
    </section>
  )
}

function Ticket({ event }: { event: SportEvent }) {
  const { time } = formatEventDate(event.startAt, event.endAt, event.timezone)
  return (
    <figure className="lp-ticket" style={{ ['--sport-c' as string]: sportColor(event.sport) }}>
      <Link to={`/events/${event._id}`} className="lp-ticket-card" aria-label={`${event.title} ansehen`}>
        <div className="lp-ticket-head">
          <DateTile iso={event.startAt} timeZone={event.timezone} size="lg" />
          <div>
            <span className="lp-ticket-sport">
              <SportIcon sport={event.sport} size={16} /> {sportLabel(event.sport)}
            </span>
            <span className="lp-ticket-title">{event.title}</span>
          </div>
        </div>
        <dl className="lp-ticket-facts">
          <div className="lp-fact lp-fact--when">
            <dt>
              <Clock size={16} aria-hidden="true" /> Wann & wo
            </dt>
            <dd>
              {formatLongDate(event.startAt, event.timezone)}, {time}
              <br />
              {event.location.placeName}, {event.location.city}
            </dd>
          </div>
          <div className="lp-fact lp-fact--spots">
            <dt>
              <Users size={16} aria-hidden="true" /> Plätze
            </dt>
            <dd>
              <CapacityMeter taken={event.participantCount} max={event.maxParticipants} status={event.status} />
            </dd>
          </div>
          <div className="lp-fact lp-fact--level">
            <dt>
              <Signal size={16} aria-hidden="true" /> Niveau
            </dt>
            <dd>{levelLabel(event.level)}</dd>
          </div>
        </dl>
      </Link>
      <figcaption className="sr-only">Ein aktuelles Event, so wie es in Hobbook angezeigt wird.</figcaption>
    </figure>
  )
}

/* ── 4 · Mitmachen ───────────────────────────────────────────── */
const STEPS = [
  { icon: MousePointerClick, title: 'Mitmachen tippen', text: 'Du siehst sofort, ob noch ein Platz frei ist.' },
  { icon: LogIn, title: 'Kurz anmelden', text: 'Erst jetzt – zum Stöbern brauchst du kein Konto.' },
  { icon: CalendarPlus, title: 'In den Kalender', text: 'Ein Tipp, und der Termin steht in deinem Kalender.' },
]

function JoinSection() {
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} className="lp-section lp-join stage reveal" aria-labelledby="join-title">
      <div className="lp-wrap">
        <h2 id="join-title" className="lp-h2 lp-h2--center">
          Mitmachen. <span className="lp-h2-soft">In drei Schritten.</span>
        </h2>
        <ol className="lp-steps">
          <svg className="lp-steps-track" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 1H100" pathLength={1} />
          </svg>
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="lp-step" style={{ ['--i' as string]: i }}>
              <span className="lp-step-icon">
                <Icon size={24} aria-hidden="true" />
              </span>
              <h3 className="lp-step-title">{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <p className="lp-promise">Kostenlos. Keine Buchung, keine Bezahlung.</p>
        <div className="lp-ctas lp-ctas--center">
          <Link to={DISCOVER} className="lp-btn lp-btn--primary">
            Event zum Mitmachen finden <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── 5 · Selbst starten ──────────────────────────────────────── */
function CreateSection() {
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} className="lp-section lp-create reveal" aria-labelledby="create-title">
      <div className="lp-wrap lp-split lp-split--reverse">
        <div className="lp-copy">
          <h2 id="create-title" className="lp-h2">
            Kein passendes Spiel? <span className="lp-h2-soft">Starte deins.</span>
          </h2>
          <ul className="lp-features">
            <li>
              <MapPin size={20} aria-hidden="true" />
              <span>
                <strong>Ort suchen</strong> oder einen Pin direkt auf die Karte setzen
              </span>
            </li>
            <li>
              <Clock size={20} aria-hidden="true" />
              <span>
                <strong>Zeit und Plätze</strong> festlegen, Niveau optional
              </span>
            </li>
            <li>
              <Eye size={20} aria-hidden="true" />
              <span>
                <strong>Vorschau</strong> checken, dann veröffentlichen
              </span>
            </li>
            <li>
              <Link2 size={20} aria-hidden="true" />
              <span>
                <strong>Öffentlich</strong> auf Liste und Karte – oder <strong>nur per Link</strong> für deine Leute
              </span>
            </li>
          </ul>
          <Link to="/events/neu" className="lp-btn lp-btn--dark">
            <Plus size={18} aria-hidden="true" /> Event erstellen
          </Link>
        </div>

        <div className="lp-builder" aria-hidden="true">
          <div className="lp-builder-field">
            <MapPin size={18} />
            <span>Ort suchen</span>
          </div>
          <div className="lp-builder-map">
            <PitchLines className="lp-builder-lines" />
            <span className="lp-builder-drop">
              <Pin sport="football" active />
            </span>
          </div>
          <div className="lp-builder-row">
            <span className="lp-builder-chip">
              <Clock size={16} /> Datum & Uhrzeit
            </span>
            <span className="lp-builder-chip">
              <Users size={16} /> Plätze
            </span>
          </div>
          <div className="lp-builder-row">
            <span className="lp-builder-chip is-on">Öffentlich</span>
            <span className="lp-builder-chip">Nur per Link</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 6 · Abschluss ───────────────────────────────────────────── */
function FinalSection() {
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} className="lp-final stage reveal" aria-labelledby="final-title">
      <PitchLines className="lp-final-pitch" />
      <div className="lp-wrap lp-final-inner">
        <h2 id="final-title" className="lp-final-title">
          Wo spielst du als Nächstes?
        </h2>
        <CitySearch id="final-city" />
        <div className="lp-ctas lp-ctas--center">
          <Link to={DISCOVER} className="lp-btn lp-btn--primary">
            Events entdecken <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link to="/events/neu" className="lp-btn lp-btn--ghost">
            <Plus size={18} aria-hidden="true" /> Event erstellen
          </Link>
        </div>
      </div>
    </section>
  )
}
