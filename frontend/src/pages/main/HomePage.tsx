import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, Compass, MapPin, Plus, RefreshCw, Repeat } from 'lucide-react'
import { getMyEvents, listEvents, type SportEvent } from '@/api/eventApi'
import { getMyGroups, listGroups, rhythmText, type Group } from '@/api/groupApi'
import AnswerCard from '@/components/series/AnswerCard'
import { formatShortWhen } from '@/utils/format'
import { apiError } from '@/api/axiosInstance'
import { useAuthContext } from '@/store/AuthContext'
import EventCard from '@/components/events/EventCard'
import SportIcon from '@/components/ui/SportIcon'
import { EmptyState, EventCardSkeleton } from '@/components/ui/DataPieces'
import { SPORTS, sportColor, sportLabel } from '@/constants/sports'
import './HomePage.css'

const isUpcoming = (e: SportEvent) => e.status === 'open' || e.status === 'full'
const byStart = (a: SportEvent, b: SportEvent) => a.startAt.localeCompare(b.startAt)

/**
 * Personal start page for signed-in users: what is next for me, what is on
 * near me, and one obvious way to start something.
 */
export default function HomePage() {
  const { authState } = useAuthContext()
  const user = authState.user
  const firstName = user?.name?.split(' ')[0] || ''
  const city = user?.city?.trim() || ''
  const favourites = user?.sports?.length ? user.sports : []

  const [mine, setMine] = useState<SportEvent[] | null>(null)
  const [nearby, setNearby] = useState<SportEvent[] | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [openGroups, setOpenGroups] = useState<Group[]>([])
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setError('')
    Promise.all([
      getMyEvents(),
      listEvents({ city: city || undefined, limit: 12 }),
      getMyGroups().catch(() => [] as Group[]),
      city ? listGroups({ city, limit: 6 }).catch(() => [] as Group[]) : Promise.resolve([] as Group[]),
    ])
      .then(([my, list, myGroups, cityGroups]) => {
        if (!active) return
        setGroups(myGroups)
        // Stammspiele nearby that you could join (not the ones you're already in).
        const myGroupIds = new Set(myGroups.map((g) => g._id))
        setOpenGroups(cityGroups.filter((g) => !myGroupIds.has(g._id)))
        // Stammspiel games already sit in "Deine Woche".
        const inWeek = new Set(myGroups.map((g) => g.upcoming?._id).filter(Boolean))
        const next = [...my.created, ...my.joined].filter((e) => isUpcoming(e) && !inWeek.has(e._id)).sort(byStart)
        setMine(next)
        const mineIds = new Set(next.map((e) => e._id))
        setNearby(list.events.filter((e) => !mineIds.has(e._id)).slice(0, 6))
      })
      .catch((err) => active && setError(apiError(err, 'Deine Startseite konnte nicht geladen werden.').message))
    return () => {
      active = false
    }
  }, [city, reload])

  const loading = !error && (mine === null || nearby === null)
  const discoverLink = city ? `/entdecken?stadt=${encodeURIComponent(city)}` : '/entdecken'
  const sportChips = (favourites.length ? favourites : SPORTS.slice(0, 6).map((s) => s.key)).slice(0, 8)

  return (
    <div className="page home">
      <header className="home-hero">
        <div>
          <h1 className="page-title">{firstName ? `Hi ${firstName}, Lust auf Sport?` : 'Lust auf Sport?'}</h1>
          <p className="page-subtitle">
            {city ? `Das läuft in ${city} – und das steht bei dir an.` : 'Das steht bei dir an – und das läuft gerade.'}
          </p>
        </div>
        <div className="home-hero-actions">
          <Link to={discoverLink} className="btn btn-primary">
            <Compass size={18} aria-hidden="true" /> Events entdecken
          </Link>
          <Link to="/events/neu" className="btn btn-secondary">
            <Plus size={18} aria-hidden="true" /> Event erstellen
          </Link>
        </div>
      </header>

      {groups.length > 0 && (
        <section className="home-section home-week" aria-labelledby="home-week">
          <div className="home-section-head">
            <h2 id="home-week">Deine Woche</h2>
          </div>
          <ul className="home-week-list">
            {groups.map((g, wi) => (
              <li key={g._id} className="card card-pad week-card" style={{ ['--i' as string]: Math.min(wi, 5) }}>
                <div className="week-card-head">
                  <div>
                    <Link to={`/stammspiel/${g._id}`} className="week-card-title">
                      {g.name}
                    </Link>
                    <p className="hint">
                      <Repeat size={12} aria-hidden="true" /> {rhythmText(g)} · {g.location.placeName}
                    </p>
                  </div>
                  {g.upcoming && <span className="week-card-when num">{formatShortWhen(g.upcoming.startAt, g.upcoming.timezone)}</span>}
                </div>
                {g.upcoming ? (
                  <AnswerCard
                    compact
                    event={g.upcoming}
                    viewerId={user?._id}
                    onChange={(e) => setGroups((list) => list.map((x) => (x._id === g._id ? { ...x, upcoming: { ...x.upcoming!, ...e } } : x)))}
                  />
                ) : (
                  <p className="hint">Der nächste Termin öffnet bald – du bekommst Bescheid.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="home-sports" aria-label={favourites.length ? 'Deine Sportarten' : 'Beliebte Sportarten'}>
        {sportChips.map((key) => (
          <Link
            key={key}
            to={`/entdecken?sport=${key}${city ? `&stadt=${encodeURIComponent(city)}` : ''}`}
            className="chip home-sport"
            style={{ ['--sport-color' as string]: sportColor(key) }}
          >
            <SportIcon sport={key} size={16} /> {sportLabel(key)}
          </Link>
        ))}
      </nav>

      {error && (
        <div className="notice notice-danger" role="alert">
          <div className="notice-body">
            <p>{error}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReload((n) => n + 1)}>
              <RefreshCw size={14} aria-hidden="true" /> Erneut versuchen
            </button>
          </div>
        </div>
      )}

      <section className="home-section" aria-labelledby="home-next">
        <div className="home-section-head">
          <h2 id="home-next">Deine nächsten Events</h2>
          <Link to="/meine-events" className="home-more">
            Alle ansehen <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {loading && (
          <div className="home-grid" aria-hidden="true">
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        )}
        {mine && mine.length === 0 && (
          <EmptyState
            icon={<CalendarCheck size={24} aria-hidden="true" />}
            title="Noch nichts geplant."
            action={
              groups.length === 0 ? (
                <Link to="/events/neu?woche=1" className="btn btn-secondary">
                  <Repeat size={16} aria-hidden="true" /> Stammspiel anlegen
                </Link>
              ) : undefined
            }
          >
            Such dir unten etwas aus und tippe auf „Mitmachen“. Spielt ihr jede Woche? Leg ein Stammspiel an – Hobbook fragt dann jede Woche, wer dabei ist.
          </EmptyState>
        )}
        {mine && mine.length > 0 && (
          <ul className="home-grid m-fade-in">
            {mine.slice(0, 4).map((e) => (
              <li key={e._id}>
                <EventCard event={e} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="home-section" aria-labelledby="home-near">
        <div className="home-section-head">
          <h2 id="home-near">{city ? `Demnächst in ${city}` : 'Demnächst auf Hobbook'}</h2>
          <Link to={discoverLink} className="home-more">
            Mehr entdecken <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {!city && !loading && (
          <p className="notice notice-info">
            <MapPin size={18} aria-hidden="true" />
            <span>
              Trag deine Stadt im <Link to="/profil">Profil</Link> ein, dann siehst du hier zuerst, was bei dir in der Nähe läuft.
            </span>
          </p>
        )}
        {loading && (
          <div className="home-grid" aria-hidden="true">
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        )}
        {nearby && nearby.length === 0 && (
          <EmptyState
            icon={<Compass size={24} aria-hidden="true" />}
            title={city ? `In ${city} ist gerade nichts geplant.` : 'Gerade ist nichts geplant.'}
            action={
              <Link to="/events/neu" className="btn btn-primary">
                <Plus size={18} aria-hidden="true" /> Erstes Event starten
              </Link>
            }
          >
            Mach den Anfang – andere finden dein Event in Liste und Karte.
          </EmptyState>
        )}
        {nearby && nearby.length > 0 && (
          <ul className="home-grid m-fade-in">
            {nearby.map((e) => (
              <li key={e._id}>
                <EventCard event={e} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {openGroups.length > 0 && (
        <section className="home-section" aria-labelledby="home-groups">
          <div className="home-section-head">
            <h2 id="home-groups">Stammspiele in {city}</h2>
            <Link to={`/entdecken?stamm=1&stadt=${encodeURIComponent(city)}`} className="home-more">
              Alle ansehen <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <ul className="home-week-list m-fade-in">
            {openGroups.map((g) => (
              <li key={g._id}>
                <Link to={`/stammspiel/${g._id}`} className="card card-pad open-group">
                  <span className="open-group-sport">
                    <SportIcon sport={g.sport} size={14} /> {sportLabel(g.sport)}
                  </span>
                  <span className="week-card-title">{g.name}</span>
                  <span className="hint">
                    <Repeat size={12} aria-hidden="true" /> {rhythmText(g)} · {g.location.placeName}
                  </span>
                  <span className="hint">
                    {g.memberCount} {g.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
                    {g.upcoming ? ` · nächster Termin: ${g.upcoming.counts?.in ?? g.upcoming.participantCount} von ${g.upcoming.maxParticipants} dabei` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
