import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CalendarCheck, Flag, Repeat, ShieldCheck, Trophy } from 'lucide-react'
import { useAuthContext } from '@/store/AuthContext'
import ReportDialog from '@/components/events/ReportDialog'
import { Presence } from '@/hooks/usePresence'
import { getProfile, type PublicProfile, type Reliability } from '@/api/loopApi'
import { apiError } from '@/api/axiosInstance'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/ui/DataPieces'
import { Avatar } from '@/components/ui/Avatar'
import SportIcon from '@/components/ui/SportIcon'
import { sportLabel } from '@/constants/sports'
import './PublicProfilePage.css'

/** Facts, not ratings: how many games, how many attended, how many late cancellations. */
export function ReliabilityFacts({ r, self = false }: { r: Reliability; self?: boolean }) {
  if (!r.enoughData) {
    return (
      <p className="hint">
        {self
          ? `Nach 3 Spielen sehen andere hier, wie verlässlich du dabei bist. Bisher: ${r.games}.`
          : 'Noch zu wenige Spiele für eine Aussage.'}
      </p>
    )
  }
  return (
    <dl className="reliability">
      <div>
        <dt>Spiele (12 Monate)</dt>
        <dd className="num">{r.games}</dd>
      </div>
      <div>
        <dt>Erschienen</dt>
        <dd className="num">
          {r.attended} von {r.games}
        </dd>
      </div>
      <div>
        <dt>Kurzfristig abgesagt</dt>
        <dd className="num">{r.lateCancels}</dd>
      </div>
    </dl>
  )
}

/** /leute/:id — a small public profile. No city, no email, no ratings. */
export default function PublicProfilePage() {
  const { id = '' } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)
  const [reporting, setReporting] = useState(false)
  const { authState } = useAuthContext()

  useEffect(() => {
    getProfile(id)
      .then(setProfile)
      .catch((err) => setError(apiError(err, 'Profil konnte nicht geladen werden.')))
  }, [id])

  if (error) {
    return (
      <div className="page">
        <EmptyState icon={<AlertTriangle size={24} aria-hidden="true" />} title={error.status === 404 ? 'Person nicht gefunden' : 'Fehler'}>
          {error.message}
        </EmptyState>
      </div>
    )
  }
  if (!profile) return <LoadingSpinner fullScreen />

  return (
    <div className="page page--narrow public-profile">
      <header className="public-profile-head">
        <Avatar name={profile.displayName} size="lg" />
        <div>
          <h1 className="page-title">{profile.isSelf ? `${profile.displayName} (du)` : profile.displayName}</h1>
          <p className="page-subtitle">Bei Hobbook seit {profile.memberSince}</p>
        </div>
      </header>

      {profile.sports.length > 0 && (
        <ul className="public-profile-sports" aria-label="Sportarten">
          {profile.sports.map((s) => (
            <li key={s} className="chip">
              <SportIcon sport={s} size={14} /> {sportLabel(s)}
            </li>
          ))}
        </ul>
      )}

      <section className="card card-pad public-profile-facts">
        <p>
          <CalendarCheck size={18} aria-hidden="true" /> {profile.gamesPlayed} {profile.gamesPlayed === 1 ? 'Spiel' : 'Spiele'} gespielt
        </p>
        <p>
          <Trophy size={18} aria-hidden="true" /> {profile.eventsHosted} {profile.eventsHosted === 1 ? 'Event' : 'Events'} organisiert
        </p>
        {profile.groupsHosted > 0 && (
          <p>
            <Repeat size={18} aria-hidden="true" /> {profile.groupsHosted} {profile.groupsHosted === 1 ? 'Stammspiel' : 'Stammspiele'}
          </p>
        )}
      </section>

      <section className="card card-pad">
        <h2 className="section-title">
          <ShieldCheck size={18} aria-hidden="true" /> Verlässlichkeit
        </h2>
        {profile.reliability ? <ReliabilityFacts r={profile.reliability} self={profile.isSelf} /> : <p className="hint">Noch zu wenige Spiele für eine Aussage.</p>}
        <p className="hint">
          Zählt nur Fakten aus den letzten 12 Monaten: zugesagte Spiele, von Organisator:innen eingetragenes Nichterscheinen (mit Widerspruchsrecht) und
          Absagen nach der Antwortfrist. Keine Sterne, keine Bewertungen. <Link to="/regeln">Mehr dazu</Link>
        </p>
      </section>

      {authState.isLoggedIn && !profile.isSelf && (
        <p className="event-trust">
          <button type="button" className="link-btn" onClick={() => setReporting(true)}>
            <Flag size={14} aria-hidden="true" /> {profile.displayName} melden
          </button>
        </p>
      )}
      <Presence show={reporting}>
        {reporting && <ReportDialog person={{ id: profile._id, name: profile.displayName }} onClose={() => setReporting(false)} />}
      </Presence>
    </div>
  )
}
