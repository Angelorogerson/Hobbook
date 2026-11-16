import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEvent } from '@/api/connectEventApi'
import Navbar from '@/components/layout/Navbar'
import './CreateEventPage.css'

export default function CreateEventPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [sport, setSport] = useState<'football' | 'basketball'>('football')
  const [description, setDescription] = useState('')
  const [locationName, setLocationName] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('20:00')
  const [maxParticipants, setMaxParticipants] = useState('10')
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'all'>('all')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!title || !date || !startTime || !endTime) {
      setError('Bitte fülle alle erforderlichen Felder aus')
      setLoading(false)
      return
    }

    try {
      await createEvent({
        title,
        sport,
        description,
        location: { name: locationName, address: locationAddress, city: locationCity },
        date,
        startTime,
        endTime,
        maxParticipants: parseInt(maxParticipants, 10),
        skillLevel,
      })
      navigate('/connect')
    } catch (err: any) {
      setError(err.message || 'Event konnte nicht erstellt werden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-event-page">
      <Navbar />
      <div className="create-event-container">
        <div className="create-event-header">
          <button className="create-event-back" onClick={() => navigate('/connect')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1>Neues Event erstellen</h1>
            <p>Erstelle ein Connect-Event und lade andere zum Spielen ein</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="create-event-form">
          {error && (
            <div className="create-event-error">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {/* Grunddaten */}
          <div className="create-event-section">
            <h2>Grunddaten</h2>
            <div className="create-event-grid">
              <div className="create-event-field full">
                <label>Event Name *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="z.B. Montagabend Fußball"
                  required
                />
              </div>

              <div className="create-event-field">
                <label>Sportart *</label>
                <select
                  value={sport}
                  onChange={e => setSport(e.target.value as 'football' | 'basketball')}
                  required
                >
                  <option value="football">⚽ Fußball</option>
                  <option value="basketball">🏀 Basketball</option>
                </select>
              </div>

              <div className="create-event-field">
                <label>Skill-Level</label>
                <select
                  value={skillLevel}
                  onChange={e => setSkillLevel(e.target.value as any)}
                >
                  <option value="all">Alle Levels</option>
                  <option value="beginner">👶 Anfänger</option>
                  <option value="intermediate">🎮 Mittelstufe</option>
                  <option value="advanced">🤸 Fortgeschritten</option>
                </select>
              </div>

              <div className="create-event-field full">
                <label>Beschreibung</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Details zu deinem Event... (optional)"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Ort */}
          <div className="create-event-section">
            <h2>Ort</h2>
            <div className="create-event-grid">
              <div className="create-event-field full">
                <label>Ort-Name</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  placeholder="z.B. Sportpark Mitte (optional)"
                />
              </div>
              <div className="create-event-field full">
                <label>Adresse</label>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={e => setLocationAddress(e.target.value)}
                  placeholder="Straße und Nummer (optional)"
                />
              </div>
              <div className="create-event-field">
                <label>Stadt</label>
                <input
                  type="text"
                  value={locationCity}
                  onChange={e => setLocationCity(e.target.value)}
                  placeholder="Berlin (optional)"
                />
              </div>
            </div>
          </div>

          {/* Datum & Zeit */}
          <div className="create-event-section">
            <h2>Datum & Zeit</h2>
            <div className="create-event-grid">
              <div className="create-event-field">
                <label>Datum *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="create-event-field">
                <label>Startzeit *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="create-event-field">
                <label>Endzeit *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                />
              </div>
              <div className="create-event-field">
                <label>Max. Spieler *</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={maxParticipants}
                  onChange={e => setMaxParticipants(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="create-event-actions">
            <button
              type="button"
              className="create-event-btn cancel"
              onClick={() => navigate('/connect')}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="create-event-btn primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  Erstelle Event...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">add_circle</span>
                  Event erstellen & veröffentlichen
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
