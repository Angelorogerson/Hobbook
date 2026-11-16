import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/store/AuthContext'
import { changePassword } from '@/api/userApi'
import './ProfilePage.css'

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const SPORT_ICONS: Record<string, string> = {
  Football: 'sports_soccer',
  Basketball: 'sports_basketball',
  Tennis: 'sports_tennis',
  Volleyball: 'sports_volleyball',
  default: 'sports',
}

const ALL_SPORTS = ['Football', 'Basketball', 'Tennis', 'Volleyball']

export default function ProfilePage() {
  const navigate = useNavigate()
  const { authState, logout, updateUser } = useAuthContext()
  const user = authState.user

  // Profile edit form state
  const [editName, setEditName] = useState(user?.name ?? '')
  const [editCity, setEditCity] = useState(user?.city ?? '')
  const [editPhone, setEditPhone] = useState(user?.phone ?? '')
  const [editSports, setEditSports] = useState<string[]>(user?.sports ?? [])
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Password change state
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState('')

  if (!user) return null

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    setSaveError('')
    try {
      await updateUser({ name: editName, city: editCity, phone: editPhone, sports: editSports })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message || 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) {
      setPwError('Passwörter stimmen nicht überein')
      return
    }
    if (newPw.length < 6) {
      setPwError('Mindestens 6 Zeichen erforderlich')
      return
    }
    setPwSaving(true)
    setPwSuccess(false)
    setPwError('')
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw })
      setPwSuccess(true)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => { setPwSuccess(false); setPwOpen(false) }, 3000)
    } catch (err: any) {
      setPwError(err.message || 'Fehler beim Ändern des Passworts')
    } finally {
      setPwSaving(false)
    }
  }

  const toggleSport = (sport: string) => {
    setEditSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    )
  }

  const sports = user.sports?.length ? user.sports : ['—']

  return (
    <div className="profile-page">

      {/* ── HERO (dark) ── */}
      <section className="profile-hero">
        <div className="profile-hero-bg" aria-hidden="true" />

        <div className="profile-hero-inner">
          {/* Left */}
          <div className="profile-hero-content">
            <div className="profile-badge">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
              Mein Profil
            </div>

            <h1 className="profile-hero-name">{user.name}</h1>

            <div className="profile-hero-sports">
              {sports.map(s => (
                <span key={s} className="profile-sport-tag">
                  <span className="material-symbols-outlined profile-sport-icon material-symbols-filled">
                    {SPORT_ICONS[s] ?? SPORT_ICONS.default}
                  </span>
                  {s}
                </span>
              ))}
            </div>

            <div className="profile-hero-stats">
              <div className="profile-stat">
                <span className="profile-stat-value">
                  {new Date(Date.now()).getFullYear() - 2023 >= 1 ? '2024' : '2024'}
                </span>
                <span className="profile-stat-label">Mitglied seit</span>
              </div>
              <div className="profile-stat-divider" />
              <div className="profile-stat">
                <span className="profile-stat-value" style={{ textTransform: 'capitalize' }}>
                  {user.role}
                </span>
                <span className="profile-stat-label">Rolle</span>
              </div>
              {user.city && (
                <>
                  <div className="profile-stat-divider" />
                  <div className="profile-stat">
                    <span className="profile-stat-value">{user.city}</span>
                    <span className="profile-stat-label">Stadt</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right – Avatar */}
          <div className="profile-hero-avatar-wrap">
            <div className="profile-avatar-ring">
              <div className="profile-avatar">
                {getInitials(user.name)}
              </div>
            </div>
            {user.role === 'admin' && (
              <div className="profile-admin-badge">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>shield</span>
                Admin
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── QUICK STATS (white) ── */}
      <section className="profile-stats-section">
        <div className="profile-section-container">
          <div className="profile-section-head">
            <h2 className="profile-section-title">Meine Aktivität</h2>
            <div className="profile-title-bar" />
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stats-card">
              <div className="profile-stats-icon">
                <span className="material-symbols-outlined">calendar_month</span>
              </div>
              <h3 className="profile-stats-label">Buchungen</h3>
              <p className="profile-stats-desc">
                Alle deine vergangenen und zukünftigen Venue-Buchungen auf einen Blick.
              </p>
              <button className="profile-stats-link" onClick={() => navigate('/bookings')}>
                Buchungen ansehen
              </button>
            </div>

            <div className="profile-stats-card">
              <div className="profile-stats-icon">
                <span className="material-symbols-outlined">favorite</span>
              </div>
              <h3 className="profile-stats-label">Favoriten</h3>
              <p className="profile-stats-desc">
                Deine gespeicherten Venues — immer schnell griffbereit für die nächste Session.
              </p>
              <button className="profile-stats-link" onClick={() => navigate('/favorites')}>
                Favoriten öffnen
              </button>
            </div>

            <div className="profile-stats-card">
              <div className="profile-stats-icon">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <h3 className="profile-stats-label">Connect Events</h3>
              <p className="profile-stats-desc">
                Offene Spiele in deiner Stadt — tritt bei oder erstelle dein eigenes Event.
              </p>
              <button className="profile-stats-link" onClick={() => navigate('/connect')}>
                Events entdecken
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── EDIT FORM ── */}
      <section className="profile-edit-section">
        <div className="profile-section-container">
          <div className="profile-section-head" style={{ marginBottom: 40 }}>
            <h2 className="profile-section-title">Profil bearbeiten</h2>
            <p className="profile-section-sub">
              Halte deine Daten aktuell — für bessere Empfehlungen und schnellere Buchungen.
            </p>
          </div>

          <div className="profile-edit-grid">

            {/* ── Left: Personal Data ── */}
            <form className="pf-card" onSubmit={handleSaveProfile}>
              <div className="pf-card-header">
                <span className="material-symbols-outlined pf-card-icon">manage_accounts</span>
                <h3 className="pf-card-title">Persönliche Daten</h3>
              </div>

              <div className="pf-card-body">
                <div className="pf-form-group">
                  <label className="pf-form-label">
                    <span className="material-symbols-outlined pf-label-icon">badge</span>
                    Name
                  </label>
                  <input
                    className="pf-form-input"
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Dein Name"
                    required
                  />
                </div>

                <div className="pf-form-group">
                  <label className="pf-form-label">
                    <span className="material-symbols-outlined pf-label-icon">mail</span>
                    E-Mail
                  </label>
                  <input
                    className="pf-form-input pf-form-input--disabled"
                    type="email"
                    value={user.email}
                    disabled
                    title="E-Mail kann nicht geändert werden"
                  />
                </div>

                <div className="pf-form-group">
                  <label className="pf-form-label">
                    <span className="material-symbols-outlined pf-label-icon">location_city</span>
                    Stadt
                  </label>
                  <input
                    className="pf-form-input"
                    type="text"
                    value={editCity}
                    onChange={e => setEditCity(e.target.value)}
                    placeholder="Deine Stadt"
                  />
                </div>

                <div className="pf-form-group">
                  <label className="pf-form-label">
                    <span className="material-symbols-outlined pf-label-icon">phone</span>
                    Telefon
                  </label>
                  <input
                    className="pf-form-input"
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+49 123 456789"
                  />
                </div>

                {saveError && (
                  <div className="pf-alert pf-alert--error">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                    {saveError}
                  </div>
                )}

                {saveSuccess && (
                  <div className="pf-alert pf-alert--success">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    Profil erfolgreich gespeichert!
                  </div>
                )}

                <button className="pf-save-btn" type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="pf-btn-spinner" />
                      Wird gespeichert…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
                      Änderungen speichern
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* ── Right: Sports + Password ── */}
            <div className="pf-right-col">

              {/* Sports */}
              <div className="pf-card">
                <div className="pf-card-header">
                  <span className="material-symbols-outlined pf-card-icon">sports</span>
                  <h3 className="pf-card-title">Sportarten</h3>
                </div>
                <div className="pf-card-body">
                  <p className="pf-sports-hint">Wähle deine Lieblingssportarten aus:</p>
                  <div className="pf-sports-grid">
                    {ALL_SPORTS.map(sport => {
                      const active = editSports.includes(sport)
                      return (
                        <button
                          key={sport}
                          type="button"
                          className={`pf-sport-pill ${active ? 'pf-sport-pill--active' : ''}`}
                          onClick={() => toggleSport(sport)}
                        >
                          <span className="material-symbols-outlined material-symbols-filled" style={{ fontSize: 20 }}>
                            {SPORT_ICONS[sport]}
                          </span>
                          {sport}
                          {active && (
                            <span className="material-symbols-outlined" style={{ fontSize: 16, marginLeft: 'auto' }}>
                              check
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <p className="pf-sports-note">
                    Speichere deine Daten über den Button links, um die Sportarten zu übernehmen.
                  </p>
                </div>
              </div>

              {/* Password Change */}
              <div className="pf-card">
                <button
                  type="button"
                  className="pf-card-header pf-card-header--toggle"
                  onClick={() => { setPwOpen(o => !o); setPwError(''); setPwSuccess(false) }}
                >
                  <span className="material-symbols-outlined pf-card-icon">lock</span>
                  <h3 className="pf-card-title">Passwort ändern</h3>
                  <span className="material-symbols-outlined pf-toggle-icon" style={{ marginLeft: 'auto' }}>
                    {pwOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {pwOpen && (
                  <form className="pf-card-body" onSubmit={handleChangePassword}>
                    <div className="pf-form-group">
                      <label className="pf-form-label">
                        <span className="material-symbols-outlined pf-label-icon">lock</span>
                        Aktuelles Passwort
                      </label>
                      <input
                        className="pf-form-input"
                        type="password"
                        value={currentPw}
                        onChange={e => setCurrentPw(e.target.value)}
                        placeholder="Aktuelles Passwort"
                        required
                      />
                    </div>

                    <div className="pf-form-group">
                      <label className="pf-form-label">
                        <span className="material-symbols-outlined pf-label-icon">lock_reset</span>
                        Neues Passwort
                      </label>
                      <input
                        className="pf-form-input"
                        type="password"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        placeholder="Min. 6 Zeichen"
                        required
                      />
                    </div>

                    <div className="pf-form-group">
                      <label className="pf-form-label">
                        <span className="material-symbols-outlined pf-label-icon">verified</span>
                        Passwort bestätigen
                      </label>
                      <input
                        className="pf-form-input"
                        type="password"
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        placeholder="Passwort wiederholen"
                        required
                      />
                    </div>

                    {pwError && (
                      <div className="pf-alert pf-alert--error">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                        {pwError}
                      </div>
                    )}

                    {pwSuccess && (
                      <div className="pf-alert pf-alert--success">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                        Passwort erfolgreich geändert!
                      </div>
                    )}

                    <button className="pf-save-btn pf-save-btn--danger" type="submit" disabled={pwSaving}>
                      {pwSaving ? (
                        <>
                          <div className="pf-btn-spinner" />
                          Wird geändert…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock_reset</span>
                          Passwort ändern
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── CTA (dark) ── */}
      <section className="profile-cta-outer">
        <div className="profile-section-container">
          <div className="profile-cta-box">
            <div className="profile-cta-bg" aria-hidden="true" />
            <div className="profile-cta-inner">
              <h2 className="profile-cta-title">Bereit zum Spielen?</h2>
              <p className="profile-cta-sub">
                Finde die perfekte Halle in deiner Nähe oder join ein offenes Spiel — jetzt sofort.
              </p>
              <div className="profile-cta-actions">
                <button
                  className="profile-cta-btn profile-cta-btn--primary"
                  onClick={() => navigate('/search')}
                >
                  Venue finden
                </button>
                <button
                  className="profile-cta-btn profile-cta-btn--ghost"
                  onClick={handleLogout}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
                  Abmelden
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
