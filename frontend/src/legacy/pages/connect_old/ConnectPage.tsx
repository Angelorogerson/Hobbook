import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/store/AuthContext'
import { getEvents, joinEvent, leaveEvent, ConnectEvent } from '@/api/connectEventApi'
import './ConnectPage.css'

// ── Helpers ──────────────────────────────────────────────
function toDateString(d: Date) {
  return d.toISOString().split('T')[0]
}

function getDateLabel(dateStr: string): string {
  const today = toDateString(new Date())
  const tomorrow = toDateString(new Date(Date.now() + 86400000))
  if (dateStr.startsWith(today)) return 'Heute'
  if (dateStr.startsWith(tomorrow)) return 'Morgen'
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function getSpotsLeft(event: ConnectEvent) {
  return event.maxParticipants - event.participants.length
}

const SPORT_LABELS: Record<string, string> = {
  football: 'Fußball',
  basketball: 'Basketball',
}

const SKILL_LABELS: Record<string, string> = {
  beginner: 'Anfänger',
  intermediate: 'Mittel',
  advanced: 'Fortgeschritten',
  all: 'Alle Level',
}

// ── Component ─────────────────────────────────────────────
export default function ConnectPage() {
  const navigate = useNavigate()
  const { authState } = useAuthContext()
  const userId = authState.user?._id

  const [events, setEvents] = useState<ConnectEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  // Filters
  const [activeSport, setActiveSport] = useState<string>('all')
  const [activeTime, setActiveTime] = useState<string>('all')
  const [skillFilters, setSkillFilters] = useState<Set<string>>(new Set())

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (activeSport !== 'all') params.sport = activeSport

      if (activeTime === 'today') {
        params.date = toDateString(new Date())
      } else if (activeTime === 'tomorrow') {
        params.date = toDateString(new Date(Date.now() + 86400000))
      }

      let data = await getEvents(params)

      // Client-side skill filter
      if (skillFilters.size > 0) {
        data = data.filter(e => skillFilters.has(e.skillLevel) || skillFilters.has('all'))
      }

      // Weekend filter (client-side)
      if (activeTime === 'weekend') {
        const now = new Date()
        const day = now.getDay()
        const daysToSat = (6 - day + 7) % 7
        const daysToSun = (0 - day + 7) % 7 || 7
        const sat = toDateString(new Date(Date.now() + daysToSat * 86400000))
        const sun = toDateString(new Date(Date.now() + daysToSun * 86400000))
        data = data.filter(e => e.date.startsWith(sat) || e.date.startsWith(sun))
      }

      setEvents(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [activeSport, activeTime, skillFilters])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleJoinLeave = async (event: ConnectEvent) => {
    if (!userId) return
    setJoiningId(event._id)
    try {
      // Handle both string IDs and object IDs
      const isParticipant = event.participants.some((p: any) => 
        typeof p === 'string' ? p === userId : p._id === userId
      )
      const updated = isParticipant
        ? await leaveEvent(event._id)
        : await joinEvent(event._id)
      setEvents(prev => prev.map(e => (e._id === updated._id ? updated : e)))
    } catch (err: any) {
      console.error('Join/Leave error:', err)
      alert(err.message || 'Fehler beim Beitreten')
    } finally {
      setJoiningId(null)
    }
  }

  const handleToggleFavorite = async (event: ConnectEvent) => {
    // Favoriten-Funktionalität für Events nicht implementiert
    // Nur Venues können favorisiert werden
  }

  const toggleSkill = (skill: string) => {
    setSkillFilters(prev => {
      const next = new Set(prev)
      next.has(skill) ? next.delete(skill) : next.add(skill)
      return next
    })
  }

  const sportFilters = [
    { key: 'all', label: 'Alle Sports', icon: 'groups' },
    { key: 'football', label: 'Fußball', icon: 'sports_soccer' },
    { key: 'basketball', label: 'Basketball', icon: 'sports_basketball' },
  ]

  const timeFilters = [
    { key: 'today', label: 'Heute', icon: 'calendar_today' },
    { key: 'tomorrow', label: 'Morgen', icon: 'event' },
    { key: 'weekend', label: 'Wochenende', icon: 'date_range' },
  ]

  return (
    <div className="connect-page">
      <div className="connect-layout">

        {/* ── SIDEBAR ── */}
        <aside className="connect-sidebar">
          <div className="connect-sidebar-sticky">
            <div className="connect-sidebar-head">
              <h1 className="connect-sidebar-title">Filter</h1>
              <p className="connect-sidebar-sub">Finde dein nächstes Spiel</p>
            </div>

            {/* Time Filter */}
            <div className="connect-filter-group">
              <p className="connect-filter-label">Zeit</p>
              {timeFilters.map(f => (
                <button
                  key={f.key}
                  className={`connect-filter-btn ${activeTime === f.key ? 'connect-filter-btn--active' : ''}`}
                  onClick={() => setActiveTime(prev => prev === f.key ? 'all' : f.key)}
                >
                  <span className="material-symbols-outlined connect-filter-icon">
                    {f.icon}
                  </span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            {/* Skill Filter */}
            <div className="connect-filter-group">
              <p className="connect-filter-label">Spielniveau</p>
              {['beginner', 'intermediate', 'advanced'].map(skill => (
                <label key={skill} className="connect-skill-label">
                  <input
                    type="checkbox"
                    className="connect-checkbox"
                    checked={skillFilters.has(skill)}
                    onChange={() => toggleSkill(skill)}
                  />
                  <span>{SKILL_LABELS[skill]}</span>
                </label>
              ))}
            </div>

            {/* Quick Tip */}
            <div className="connect-tip">
              <p className="connect-tip-title">Tipp</p>
              <p className="connect-tip-text">Tritt Events früh bei, um deinen Platz zu sichern!</p>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="connect-main">

          {/* Header */}
          <div className="connect-main-header">
            <div>
              <h2 className="connect-main-title">Spontane Spiele</h2>
              <p className="connect-main-sub">Finde lokale Spieler für kostenlose Matches in deiner Stadt.</p>
            </div>
            <button
              className="connect-create-btn"
              onClick={() => navigate('/connect/new')}
            >
              <span className="material-symbols-outlined">add</span>
              <span>Event erstellen</span>
            </button>
          </div>

          {/* Sport Pills */}
          <div className="connect-sport-pills">
            {sportFilters.map(f => (
              <button
                key={f.key}
                className={`connect-pill ${activeSport === f.key ? 'connect-pill--active' : ''}`}
                onClick={() => setActiveSport(f.key)}
              >
                <span className="material-symbols-outlined connect-pill-icon">{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="connect-loading">
              <div className="connect-spinner" />
              <p>Events werden geladen…</p>
            </div>
          ) : (
            <div className="connect-cards-grid">
              {events.map(event => {
                const spotsLeft = getSpotsLeft(event)
                const isFull = event.status === 'full' || spotsLeft <= 0
                // Handle both string IDs and object IDs
                const isParticipant = event.participants.some((p: any) => 
                  typeof p === 'string' ? p === userId : p._id === userId
                )
                const isJoining = joiningId === event._id

                return (
                  <div
                    key={event._id}
                    className={`connect-card ${isFull ? 'connect-card--full' : ''}`}
                  >
                    {/* Image Area */}
                    <div className={`connect-card-img connect-card-img--${event.sport}`}>
                      <span className="material-symbols-outlined connect-card-sport-bg material-symbols-filled">
                        {event.sport === 'football' ? 'sports_soccer' : 'sports_basketball'}
                      </span>

                      {/* Spots Badge */}
                      <div className={`connect-spots-badge ${isFull ? 'connect-spots-badge--full' : ''}`}>
                        {isFull ? (
                          <>
                            <span className="material-symbols-outlined connect-badge-icon">lock</span>
                            Voll
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined connect-badge-icon">group</span>
                            {spotsLeft}/{event.maxParticipants} frei
                          </>
                        )}
                      </div>

                      {/* Sport Tag */}
                      <div className="connect-sport-tag">
                        {SPORT_LABELS[event.sport]}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="connect-card-body">
                      <div className="connect-card-row">
                        <div className="connect-card-info">
                          <h3 className="connect-card-title">{event.title}</h3>
                          <div className="connect-card-location">
                            <span className="material-symbols-outlined connect-loc-icon">location_on</span>
                            <span>{event.location?.name || event.location?.city || '—'}</span>
                          </div>
                        </div>
                        <div className="connect-card-time">
                          <p className="connect-card-time-val">{event.startTime}</p>
                          <p className="connect-card-time-day">{getDateLabel(event.date)}</p>
                        </div>
                      </div>

                      <div className="connect-card-footer">
                        <div className="connect-card-skill">
                          <span className="material-symbols-outlined connect-skill-icon">signal_cellular_alt</span>
                          <span>{SKILL_LABELS[event.skillLevel]}</span>
                        </div>

                        {isFull && !isParticipant ? (
                          <span className="connect-card-full-txt">Voll</span>
                        ) : (
                          <button
                            className={`connect-join-btn ${isParticipant ? 'connect-join-btn--leave' : ''}`}
                            onClick={() => handleJoinLeave(event)}
                            disabled={isJoining}
                          >
                            {isJoining ? '…' : isParticipant ? 'Verlassen' : 'Beitreten'}
                            {!isJoining && (
                              <span className="material-symbols-outlined connect-join-icon">
                                {isParticipant ? 'exit_to_app' : 'arrow_forward'}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Create Card */}
              <div
                className="connect-create-card"
                onClick={() => navigate('/connect/create')}
              >
                <div className="connect-create-icon-wrap">
                  <span className="material-symbols-outlined connect-create-icon">add_circle</span>
                </div>
                <div>
                  <p className="connect-create-text-main">Kein passendes Spiel?</p>
                  <p className="connect-create-text-sub">Erstelle dein eigenes Event!</p>
                </div>
                <span className="connect-create-link">Event posten</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
