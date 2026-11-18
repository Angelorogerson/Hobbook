import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/store/AuthContext'
import { changePassword, deleteAccount } from '@/api/userApi'
import { apiError } from '@/api/axiosInstance'
import Modal from '@/components/common/Modal'
import { SPORTS } from '@/constants/sports'
import { ThemeChoice } from '@/components/ui/Brand'
import './ProfilePage.css'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { authState, updateUser, logout } = useAuthContext()
  const user = authState.user!

  const [name, setName] = useState(user.name)
  const [city, setCity] = useState(user.city || '')
  const [sports, setSports] = useState<string[]>(user.sports || [])
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)

  const [showDelete, setShowDelete] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleteErr, setDeleteErr] = useState('')

  return (
    <div className="page page--narrow profile">
      <div className="page-head">
        <div>
          <h1 className="page-title">Profil</h1>
          <p className="page-subtitle">{user.email}</p>
        </div>
      </div>

      <section className="card profile-section">
        <h2>Persönliche Angaben</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            setProfileMsg(null)
            try {
              await updateUser({ name: name.trim(), city: city.trim(), sports })
              setProfileMsg({ type: 'success', text: 'Profil gespeichert.' })
            } catch (err) {
              setProfileMsg({ type: 'danger', text: apiError(err).message })
            } finally {
              setSaving(false)
            }
          }}
        >
          <div className="field">
            <label htmlFor="p-name">Name</label>
            <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} required />
            <span className="hint">Öffentlich wird nur dein Vorname und der erste Buchstabe des Nachnamens gezeigt.</span>
          </div>
          <div className="field">
            <label htmlFor="p-city">Stadt</label>
            <input id="p-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} />
          </div>
          <fieldset className="field">
            <legend className="label">Lieblingssportarten</legend>
            <div className="sport-chips">
              {SPORTS.map((s) => (
                <label key={s.key} className={`chip${sports.includes(s.key) ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={sports.includes(s.key)}
                    onChange={() => setSports((cur) => (cur.includes(s.key) ? cur.filter((x) => x !== s.key) : [...cur, s.key]))}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
          {profileMsg && (
            <p className={`notice notice-${profileMsg.type}`} role="status">
              {profileMsg.text}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Wird gespeichert …' : 'Speichern'}
          </button>
        </form>
      </section>

      <section className="card profile-section">
        <h2>Passwort ändern</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setPwMsg(null)
            if (newPw.length < 8) {
              setPwMsg({ type: 'danger', text: 'Das neue Passwort muss mindestens 8 Zeichen haben.' })
              return
            }
            try {
              setPwMsg({ type: 'success', text: await changePassword(currentPw, newPw) })
              setCurrentPw('')
              setNewPw('')
            } catch (err) {
              setPwMsg({ type: 'danger', text: apiError(err).message })
            }
          }}
        >
          <div className="field-row">
            <div className="field">
              <label htmlFor="p-cur">Aktuelles Passwort</label>
              <input id="p-cur" type="password" className="input" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="p-new">Neues Passwort</label>
              <input id="p-new" type="password" className="input" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={8} required />
            </div>
          </div>
          {pwMsg && (
            <p className={`notice notice-${pwMsg.type}`} role="status">
              {pwMsg.text}
            </p>
          )}
          <button type="submit" className="btn btn-secondary">
            Passwort ändern
          </button>
        </form>
      </section>

      <section className="card profile-section">
        <h2>Darstellung</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          „System“ folgt der Einstellung deines Geräts.
        </p>
        <ThemeChoice />
      </section>

      <section className="card profile-section">
        <h2>Mehr</h2>
        <ul className="profile-links">
          {authState.user?.role === 'admin' && (
            <li>
              <Link to="/admin">Moderation</Link>
            </li>
          )}
          <li>
            <Link to="/ueber">So funktioniert Hobbook</Link>
          </li>
          <li>
            <Link to="/regeln">Community-Regeln</Link>
          </li>
          <li>
            <Link to="/datenschutz">Datenschutz</Link>
          </li>
          <li>
            <Link to="/impressum">Impressum</Link>
          </li>
        </ul>
      </section>

      <section className="card profile-section">
        <h2>Konto</h2>
        <div className="profile-account-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              logout()
              navigate('/')
            }}
          >
            Abmelden
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setShowDelete(true)}>
            Konto löschen
          </button>
        </div>
      </section>

      {showDelete && (
        <Modal title="Konto endgültig löschen?" onClose={() => setShowDelete(false)}>
          <p style={{ marginBottom: 12 }}>
            Dein Konto und deine Profildaten werden gelöscht. Deine anstehenden Events mit Anmeldungen werden abgesagt,
            Events ohne weitere Teilnehmende werden entfernt, und du wirst aus allen Events ausgetragen.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setDeleteErr('')
              try {
                await deleteAccount(deletePw)
                logout()
                navigate('/', { replace: true })
              } catch (err) {
                setDeleteErr(apiError(err).message)
              }
            }}
          >
            <div className="field">
              <label htmlFor="p-del">Zur Bestätigung dein Passwort</label>
              <input id="p-del" type="password" className="input" autoComplete="current-password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} required />
            </div>
            {deleteErr && (
              <p className="error" role="alert">
                {deleteErr}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDelete(false)}>
                Abbrechen
              </button>
              <button type="submit" className="btn btn-danger">
                Endgültig löschen
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
