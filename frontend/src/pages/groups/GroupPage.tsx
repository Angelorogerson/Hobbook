import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BellOff,
  BellRing,
  CalendarClock,
  Check,
  Copy,
  MapPin,
  MessageCircle,
  Pencil,
  Repeat,
  Send,
  SkipForward,
  Star,
  Users,
  XCircle,
  Ban,
} from 'lucide-react'
import {
  endGroup,
  getGroup,
  inviteUrl,
  joinGroup,
  leaveGroup,
  muteGroup,
  remindNonResponders,
  rhythmText,
  setCoHost,
  skipNextGame,
  removeMember,
  transferGroup,
  unblockMember,
  WEEKDAYS,
  type Group,
} from '@/api/groupApi'
import type { SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import { useAuthContext } from '@/store/AuthContext'
import AnswerCard, { decisionLabel } from '@/components/series/AnswerCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { DateTile, EmptyState } from '@/components/ui/DataPieces'
import { Avatar } from '@/components/ui/Avatar'
import SportIcon from '@/components/ui/SportIcon'
import { useToast } from '@/components/ui/Toast'
import { Presence } from '@/hooks/usePresence'
import { levelLabel, sportColor, sportLabel } from '@/constants/sports'
import { formatEventDate, formatShortWhen, routeLink } from '@/utils/format'
import '@/components/series/series.css'
import './GroupPage.css'

/** The line people paste into their WhatsApp group: date, count, status, link. */
export function whatsappStatus(g: Group, e: SportEvent | null | undefined) {
  const url = g.inviteCode ? inviteUrl(g.inviteCode) : window.location.href
  if (!e) return `${g.name}: ${rhythmText(g)} · ${url}`
  const when = formatShortWhen(e.startAt, e.timezone)
  const count = `${e.counts?.in ?? e.participantCount}/${e.maxParticipants} dabei`
  const label = decisionLabel(e)
  const status =
    label === 'Findet statt' ? 'findet statt ✅' : label === 'Fällt aus' ? 'fällt aus ❌' : `ab ${e.minPlayers} findet's statt – bist du dabei?`
  return `${g.name} ${when} · ${count} · ${status}\n${url}`
}

const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

export default function GroupPage() {
  const { key = '' } = useParams<{ key: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { authState } = useAuthContext()
  const toast = useToast()
  const viewerId = authState.user?._id

  const [group, setGroup] = useState<Group | null>(null)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<'skip' | 'end' | 'leave' | null>(null)
  const [memberAction, setMemberAction] = useState<{ kind: 'remove' | 'transfer'; id: string; name: string } | null>(null)
  const [alsoBlock, setAlsoBlock] = useState(false)
  const arrival = (location.state as { created?: boolean; updated?: boolean; appliedToUpcoming?: boolean; resume?: string } | null) || {}

  useEffect(() => {
    let active = true
    setError(null)
    getGroup(key)
      .then((g) => active && setGroup(g))
      .catch((err) => active && setError(apiError(err, 'Stammspiel konnte nicht geladen werden.')))
    return () => {
      active = false
    }
  }, [key, authState.isLoggedIn])

  // A guest tapped "Mitmachen", signed in, and comes back: finish joining once.
  const resumed = useRef(false)
  useEffect(() => {
    if (arrival.resume !== 'group' || resumed.current || !group || !authState.isLoggedIn) return
    resumed.current = true
    navigate(location.pathname, { replace: true, state: null })
    if (!group.isMember) act(() => joinGroup(group._id), 'Willkommen! Du bist jetzt beim Stammspiel.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrival.resume, group, authState.isLoggedIn])

  if (error) {
    return (
      <div className="page">
        <EmptyState
          icon={<AlertTriangle size={24} aria-hidden="true" />}
          title={error.status === 404 ? 'Stammspiel nicht gefunden' : 'Fehler'}
          action={
            <Link to="/entdecken" className="btn btn-primary">
              Events entdecken
            </Link>
          }
        >
          {error.status === 404 ? 'Der Link stimmt nicht mehr, oder das Stammspiel ist nur für Mitglieder sichtbar.' : error.message}
        </EmptyState>
      </div>
    )
  }
  if (!group) return <LoadingSpinner fullScreen />

  async function act(fn: () => Promise<Group>, success?: string) {
    setBusy(true)
    try {
      setGroup(await fn())
      if (success) toast(success)
    } catch (err) {
      toast(apiError(err).message, 'danger')
    } finally {
      setBusy(false)
    }
  }

  const upcoming = group.upcoming
  const insider = group.isMember || group.isHost
  const link = group.inviteCode ? inviteUrl(group.inviteCode) : ''
  const statusText = whatsappStatus(group, upcoming)
  const inviteText = `Wir spielen ${rhythmText(group, true)} ${sportLabel(group.sport)} – ${group.location.placeName}. Sag hier zu, dann weißt du jede Woche, ob's stattfindet: ${link}`
  const endTime = (() => {
    const [h, m] = group.startTime.split(':').map(Number)
    const t = h * 60 + m + group.durationMin
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  })()

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast(done)
    } catch {
      toast('Kopieren hat nicht geklappt – markiere den Text von Hand.', 'danger')
    }
  }

  const requireLogin = () => navigate('/login', { state: { from: location.pathname, intent: 'group' } })
  const setUpcoming = (e: SportEvent) => setGroup((g) => (g ? { ...g, upcoming: e } : g))
  const hasCoords = group.location.lat !== null && group.location.lng !== null

  return (
    <div className="page group-page" style={{ ['--sport-color' as string]: sportColor(group.sport) }}>
      <header className="group-head">
        <p className="group-kicker">
          <SportIcon sport={group.sport} size={16} /> {sportLabel(group.sport)} · <Repeat size={14} aria-hidden="true" /> Stammspiel
          {group.visibility === 'unlisted' && <span className="badge badge-neutral">Nur per Link</span>}
          {!group.active && <span className="badge badge-cancelled">Beendet</span>}
        </p>
        <h1 className="page-title">{group.name}</h1>
        <p className="group-rhythm">
          <CalendarClock size={18} aria-hidden="true" /> Jeden {WEEKDAYS[group.weekday]}, {group.startTime}–{endTime} Uhr
        </p>
        <p className="group-place">
          <MapPin size={18} aria-hidden="true" /> {group.location.placeName}
          {group.location.city ? `, ${group.location.city}` : ''}
          {hasCoords && (
            <a href={routeLink(group.location.lat!, group.location.lng!)} target="_blank" rel="noreferrer" className="group-route">
              Route
            </a>
          )}
        </p>
        <p className="group-meta">
          <Users size={16} aria-hidden="true" /> {group.memberCount} {group.memberCount === 1 ? 'Mitglied' : 'Mitglieder'} · ab {group.minPlayers}{' '}
          Zusagen findet's statt · max. {group.maxParticipants} · {levelLabel(group.level)} · organisiert von{' '}
          {group.organizer._id ? <Link to={`/leute/${group.organizer._id}`}>{group.organizer.displayName}</Link> : group.organizer.displayName}
        </p>
      </header>

      {arrival.created && group.inviteCode && (
        <section className="card card-pad invite-step" aria-labelledby="invite-title">
          <h2 id="invite-title">
            <Check size={20} aria-hidden="true" /> Dein Stammspiel läuft. Jetzt einmal einladen.
          </h2>
          <p>
            Poste den Link einmal in eurer Gruppe. Ab dann fragt Hobbook jede Woche alle, wer dabei ist, erinnert nur die, die noch nicht geantwortet
            haben, und sagt Bescheid, ob es stattfindet.
          </p>
          <div className="invite-actions">
            <a className="btn btn-primary" href={whatsappLink(inviteText)} target="_blank" rel="noreferrer">
              <MessageCircle size={18} aria-hidden="true" /> In WhatsApp teilen
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => copy(link, 'Link kopiert')}>
              <Copy size={16} aria-hidden="true" /> Link kopieren
            </button>
          </div>
          <p className="invite-link num">{link}</p>
        </section>
      )}
      {arrival.updated && (
        <p className="notice notice-success" role="status">
          <Check size={18} aria-hidden="true" />{' '}
          {arrival.appliedToUpcoming
            ? 'Gespeichert – auch für den offenen Termin. Wer zugesagt hat, weiß Bescheid, falls sich Zeit oder Ort geändert haben.'
            : 'Gespeichert. Gilt ab dem nächsten Termin, der noch nicht geöffnet ist.'}
        </p>
      )}

      {group.isBlocked && (
        <p className="notice notice-warning" role="status">
          <Ban size={18} aria-hidden="true" /> Du kannst diesem Stammspiel nicht beitreten.
        </p>
      )}

      {!group.isMember && group.active && !group.isBlocked && (
        <section className="card card-pad join-group-card">
          <div>
            <h2>Spielst du mit?</h2>
            <p>Werde Mitglied: Du bekommst jede Woche eine kurze Frage und antwortest mit einem Tipp. Kostenlos, kein Gruppenchat.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={busy}
            onClick={() => (authState.isLoggedIn ? act(() => joinGroup(group._id), 'Willkommen! Du bist jetzt beim Stammspiel.') : requireLogin())}
          >
            {authState.isLoggedIn ? 'Mitmachen' : 'Anmelden & mitmachen'}
          </button>
        </section>
      )}

      <div className="group-grid">
        <div className="group-main">
          <section aria-labelledby="next-title" className="group-next">
            <h2 id="next-title" className="section-title">
              Nächster Termin
            </h2>
            {upcoming ? (
              <article key={upcoming._id} className="card card-pad next-card week-enter">
                <div className="next-card-head">
                  <DateTile iso={upcoming.startAt} timeZone={upcoming.timezone} size="lg" />
                  <div>
                    <p className="next-card-when">
                      {(() => {
                        const { day, time } = formatEventDate(upcoming.startAt, upcoming.endAt, upcoming.timezone)
                        return `${day}, ${time}`
                      })()}
                    </p>
                    <Link to={`/events/${upcoming._id}`} className="next-card-link">
                      Zum Termin <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                <AnswerCard event={upcoming} onChange={setUpcoming} viewerId={viewerId} onNeedLogin={requireLogin} />
              </article>
            ) : group.nextPlanned ? (
              <div className="card card-pad next-card">
                <p>
                  <strong>{formatShortWhen(group.nextPlanned.startAt, group.timezone)}</strong> – die Einladung kommt{' '}
                  {formatShortWhen(group.nextPlanned.opensAt, group.timezone)}.
                </p>
              </div>
            ) : (
              <p className="notice">Kein Termin geplant.</p>
            )}
          </section>

          {group.isHost && group.active && (
            <section className="card card-pad host-tools" aria-labelledby="host-title">
              <h2 id="host-title">Für Organisator:innen</h2>
              <div className="host-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy || !upcoming || upcoming.decision !== 'open' || !upcoming.counts?.noAnswer}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      const r = await remindNonResponders(group._id)
                      setGroup(r.group)
                      toast(r.reminded ? `${r.reminded} ${r.reminded === 1 ? 'Person' : 'Leute'} erinnert` : 'Alle haben schon geantwortet')
                    } catch (err) {
                      toast(apiError(err).message, 'danger')
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  <BellRing size={16} aria-hidden="true" /> Erinnern
                  {upcoming?.counts?.noAnswer ? ` (${upcoming.counts.noAnswer} ohne Antwort)` : ''}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => copy(statusText, 'Status kopiert – jetzt in WhatsApp einfügen')}>
                  <Copy size={16} aria-hidden="true" /> Status für WhatsApp kopieren
                </button>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setDialog('skip')}>
                  <SkipForward size={16} aria-hidden="true" /> Diese Woche aussetzen
                </button>
                <Link to={`/stammspiel/${group._id}/bearbeiten`} className="btn btn-secondary">
                  <Pencil size={16} aria-hidden="true" /> Bearbeiten
                </Link>
              </div>
              <p className="hint">
                Hobbook erinnert automatisch einmal vor der Frist – nur wer noch nicht geantwortet hat. Erinnern per Hand geht alle 6 Stunden.
              </p>
            </section>
          )}

          {group.description && (
            <section className="group-about">
              <h2 className="section-title">Worum geht's</h2>
              <p>{group.description}</p>
              {group.bring && <p className="hint">Mitbringen: {group.bring}</p>}
            </section>
          )}

          {group.history && group.history.length > 0 && (
            <section className="group-history" aria-labelledby="history-title">
              <h2 id="history-title" className="section-title">
                Letzte Wochen
              </h2>
              <ul>
                {group.history.map((h) => (
                  <li key={h._id}>
                    <Link to={`/events/${h._id}`}>{formatShortWhen(h.startAt, group.timezone)}</Link>
                    <span className={h.happened ? 'is-on' : 'is-off'}>
                      {h.happened ? `fand statt · ${h.participantCount} dabei` : 'fiel aus'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="group-side">
          {insider && group.inviteCode && !arrival.created && (
            <section className="card card-pad">
              <h2 className="section-title">Leute einladen</h2>
              <p className="hint">Wer den Link hat, kann beitreten und antworten.</p>
              <div className="invite-actions">
                <a className="btn btn-secondary btn-sm" href={whatsappLink(inviteText)} target="_blank" rel="noreferrer">
                  <Send size={14} aria-hidden="true" /> WhatsApp
                </a>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => copy(link, 'Link kopiert')}>
                  <Copy size={14} aria-hidden="true" /> Link kopieren
                </button>
              </div>
            </section>
          )}

          {group.members && (
            <section className="card card-pad group-members" aria-labelledby="members-title">
              <h2 id="members-title" className="section-title">
                Mitglieder <span className="num">{group.members.length}</span>
              </h2>
              <ul>
                {group.members.map((m) => {
                  const isCo = !!group.coHosts?.some((c) => c._id === m._id)
                  const isOrg = m._id === group.organizer._id
                  return (
                    <li key={m._id}>
                      <Avatar name={m.displayName} size="sm" />
                      <Link to={`/leute/${m._id}`}>{m._id === viewerId ? 'Du' : m.displayName}</Link>
                      {(isOrg || isCo) && (
                        <span className="badge badge-neutral">
                          <Star size={12} aria-hidden="true" /> {isOrg ? 'Orga' : 'Co-Host'}
                        </span>
                      )}
                      {group.isHost && !isOrg && m._id !== viewerId && (
                        <span className="member-actions">
                          {group.isOrganizer && (
                            <button
                              type="button"
                              className="link-btn"
                              disabled={busy}
                              onClick={() => act(() => setCoHost(group._id, m._id!, !isCo), isCo ? 'Co-Host entfernt' : 'Co-Host hinzugefügt')}
                            >
                              {isCo ? 'Co-Host entfernen' : 'Co-Host'}
                            </button>
                          )}
                          {group.isOrganizer && (
                            <button type="button" className="link-btn" onClick={() => setMemberAction({ kind: 'transfer', id: m._id!, name: m.displayName })}>
                              Übergeben
                            </button>
                          )}
                          {(!isCo || group.isOrganizer) && (
                            <button
                              type="button"
                              className="link-btn danger-text"
                              aria-label={`${m.displayName} entfernen`}
                              onClick={() => {
                                setAlsoBlock(false)
                                setMemberAction({ kind: 'remove', id: m._id!, name: m.displayName })
                              }}
                            >
                              Entfernen
                            </button>
                          )}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {group.isHost && group.blocked && group.blocked.length > 0 && (
            <section className="card card-pad group-members" aria-labelledby="blocked-title">
              <h2 id="blocked-title" className="section-title">
                Gesperrt <span className="num">{group.blocked.length}</span>
              </h2>
              <ul>
                {group.blocked.map((b) => (
                  <li key={b._id}>
                    <Avatar name={b.displayName} size="sm" /> {b.displayName}
                    <button type="button" className="link-btn" disabled={busy} onClick={() => act(() => unblockMember(group._id, b._id!), 'Sperre aufgehoben')}>
                      Sperre aufheben
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {group.isMember && (
            <section className="card card-pad group-settings">
              <h2 className="section-title">Deine Einstellungen</h2>
              <label className="check-row">
                <input type="checkbox" checked={group.muted} disabled={busy} onChange={(e) => act(() => muteGroup(group._id, e.target.checked))} />
                <span>
                  <strong className="mute-title">
                    {group.muted ? <BellOff size={16} aria-hidden="true" /> : <BellRing size={16} aria-hidden="true" />} Stummschalten
                  </strong>
                  <span className="hint">Keine E-Mails und Push für dieses Stammspiel. Absagen und Änderungen bekommst du trotzdem.</span>
                </span>
              </label>
              {!group.isOrganizer && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDialog('leave')}>
                  Stammspiel verlassen
                </button>
              )}
              {group.isOrganizer && group.active && (
                <button type="button" className="btn btn-ghost btn-sm danger-text" onClick={() => setDialog('end')}>
                  <XCircle size={14} aria-hidden="true" /> Stammspiel beenden
                </button>
              )}
            </section>
          )}
        </aside>
      </div>

      <Presence show={memberAction?.kind === 'remove'}>
        {memberAction?.kind === 'remove' && (
          <ConfirmDialog
            title={`${memberAction.name} entfernen?`}
            confirmLabel={alsoBlock ? 'Entfernen und sperren' : 'Entfernen'}
            onClose={() => setMemberAction(null)}
            onConfirm={async () => {
              await act(() => removeMember(group._id, memberAction.id, alsoBlock), alsoBlock ? 'Entfernt und gesperrt' : 'Entfernt')
              setMemberAction(null)
            }}
          >
            <p>
              {memberAction.name} ist dann nicht mehr Mitglied. Eine Zusage für den nächsten Termin entfällt, und jemand von der Warteliste rückt
              nach. Die Person bekommt einen kurzen Hinweis in der App.
            </p>
            <label className="check-row">
              <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
              Auch sperren (kann nicht wieder beitreten)
            </label>
          </ConfirmDialog>
        )}
      </Presence>
      <Presence show={memberAction?.kind === 'transfer'}>
        {memberAction?.kind === 'transfer' && (
          <ConfirmDialog
            title={`An ${memberAction.name} übergeben?`}
            confirmLabel="Übergeben"
            onClose={() => setMemberAction(null)}
            onConfirm={async () => {
              await act(() => transferGroup(group._id, memberAction.id), `${memberAction.name} organisiert jetzt das Stammspiel`)
              setMemberAction(null)
            }}
          >
            <p>
              {memberAction.name} wird Organisator:in und bekommt Bescheid. Du bleibst als Co-Host dabei und kannst weiter erinnern und Termine
              absagen.
            </p>
          </ConfirmDialog>
        )}
      </Presence>

      <Presence show={dialog === 'skip'}>
        {dialog === 'skip' && (
          <ConfirmDialog
            title="Diese Woche aussetzen?"
            confirmLabel="Aussetzen"
            onClose={() => setDialog(null)}
            onConfirm={async () => {
              await act(() => skipNextGame(group._id), 'Ausgesetzt. Alle, die zugesagt hatten, wissen Bescheid.')
              setDialog(null)
            }}
          >
            <p>Der nächste Termin fällt aus. Alle, die schon zugesagt haben, bekommen Bescheid. Danach geht es normal weiter.</p>
          </ConfirmDialog>
        )}
      </Presence>
      <Presence show={dialog === 'end'}>
        {dialog === 'end' && (
          <ConfirmDialog
            title="Stammspiel beenden?"
            confirmLabel="Beenden"
            onClose={() => setDialog(null)}
            onConfirm={async () => {
              await act(() => endGroup(group._id), 'Das Stammspiel ist beendet.')
              setDialog(null)
            }}
          >
            <p>Es werden keine neuen Termine mehr geöffnet. Ein offener Termin wird abgesagt und alle bekommen Bescheid.</p>
          </ConfirmDialog>
        )}
      </Presence>
      <Presence show={dialog === 'leave'}>
        {dialog === 'leave' && (
          <ConfirmDialog
            title="Stammspiel verlassen?"
            confirmLabel="Verlassen"
            onClose={() => setDialog(null)}
            onConfirm={async () => {
              await act(() => leaveGroup(group._id), 'Du bist nicht mehr dabei.')
              setDialog(null)
            }}
          >
            <p>Du bekommst keine Einladungen mehr. Hattest du für den nächsten Termin zugesagt, rückt jemand von der Warteliste nach.</p>
          </ConfirmDialog>
        )}
      </Presence>
    </div>
  )
}
