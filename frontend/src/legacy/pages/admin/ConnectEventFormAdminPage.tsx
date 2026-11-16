import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getEventById, createEvent, updateEvent } from '@/api/connectEventApi'
import AdminNav from './AdminNav'
import './admin.css'

export default function ConnectEventFormAdminPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form fields
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

  useEffect(() => {
    if (!isEdit) return
    const load = async () => {
      try {
        const event = await getEventById(id!)
        setTitle(event.title)
        setSport(event.sport)
        setDescription(event.description || '')
        setLocationName(event.location?.name || '')
        setLocationAddress(event.location?.address || '')
        setLocationCity(event.location?.city || '')
        setDate(event.date.split('T')[0])
        setStartTime(event.startTime)
        setEndTime(event.endTime)
        setMaxParticipants(String(event.maxParticipants))
        setSkillLevel(event.skillLevel)
      } catch (err: any) {
        setError(err.message || 'Event konnte nicht geladen werden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const payload = {
      title,
      sport,
      description,
      location: { name: locationName, address: locationAddress, city: locationCity },
      date,
      startTime,
      endTime,
      maxParticipants: parseInt(maxParticipants, 10),
      skillLevel,
    }

    try {
      if (isEdit) {
        await updateEvent(id!, payload)
      } else {
        await createEvent(payload)
      }
      setSuccess(true)
      setTimeout(() => navigate('/admin/events'), 1200)
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="adm-page">
        <AdminNav />
        <div className="adm-loading" style={{ minHeight: '60vh' }}>
          <div className="adm-spinner" />
          <span>Event wird geladen…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-page">
      <AdminNav />

      <div className="adm-hero">
        <div className="adm-hero-inner">
          <div className="adm-hero-left">
            <p className="adm-hero-eyebrow">Admin · Connect Events</p>
            <h1 className="adm-hero-title">{isEdit ? 'Event bearbeiten' : 'Neues Event erstellen'}</h1>
            <p className="adm-hero-sub">
              {isEdit ? 'Bearbeite die Event-Details.' : 'Erstelle ein neues Connect-Event.'}
            </p>
          </div>
          <div className="adm-hero-actions">
            <button className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/events')}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              Zurück
            </button>
          </div>
        </div>
      </div>

      <div className="adm-content">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {error && (
            <div className="adm-alert adm-alert--error">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
              {error}
            </div>
          )}
          {success && (
            <div className="adm-alert adm-alert--success">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
              {isEdit ? 'Event erfolgreich aktualisiert!' : 'Event erfolgreich erstellt!'} Weiterleitung…
            </div>
          )}

          {/* Grunddaten */}
          <div className="adm-section">
            <div className="adm-section-header">
              <h2 className="adm-section-title">
                <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 8, color: '#004E89' }}>info</span>
                Grunddaten
              </h2>
            </div>
            <div className="adm-section-body">
              <div className="adm-form-grid">
                <div className="adm-form-group adm-form-full">
                  <label className="adm-form-label">Titel *</label>
                  <input
                    className="adm-form-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="z.B. Montagabend Fußball"
                    required
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">Sportart *</label>
                  <select
                    className="adm-form-select"
                    value={sport}
                    onChange={e => setSport(e.target.value as 'football' | 'basketball')}
                    required
                  >
                    <option value="football">Fußball</option>
                    <option value="basketball">Basketball</option>
                  </select>
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">Skill-Level</label>
                  <select
                    className="adm-form-select"
                    value={skillLevel}
                    onChange={e => setSkillLevel(e.target.value as any)}
                  >
                    <option value="all">Alle Levels</option>
                    <option value="beginner">Anfänger</option>
                    <option value="intermediate">Mittelstufe</option>
                    <option value="advanced">Fortgeschritten</option>
                  </select>
                </div>

                <div className="adm-form-group adm-form-full">
                  <label className="adm-form-label">Beschreibung</label>
                  <textarea
                    className="adm-form-textarea"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Details zum Event…"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ort */}
          <div className="adm-section">
            <div className="adm-section-header">
              <h2 className="adm-section-title">
                <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 8, color: '#004E89' }}>location_on</span>
                Ort
              </h2>
            </div>
            <div className="adm-section-body">
              <div className="adm-form-grid">
                <div className="adm-form-group adm-form-full">
                  <label className="adm-form-label">Ort-Name</label>
                  <input
                    className="adm-form-input"
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    placeholder="z.B. Sportpark Mitte"
                  />
                </div>
                <div className="adm-form-group adm-form-full">
                  <label className="adm-form-label">Adresse</label>
                  <input
                    className="adm-form-input"
                    value={locationAddress}
                    onChange={e => setLocationAddress(e.target.value)}
                    placeholder="Straße und Nummer"
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Stadt</label>
                  <input
                    className="adm-form-input"
                    value={locationCity}
                    onChange={e => setLocationCity(e.target.value)}
                    placeholder="Berlin"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Zeit */}
          <div className="adm-section">
            <div className="adm-section-header">
              <h2 className="adm-section-title">
                <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 8, color: '#004E89' }}>schedule</span>
                Datum & Zeit
              </h2>
            </div>
            <div className="adm-section-body">
              <div className="adm-form-grid">
                <div className="adm-form-group">
                  <label className="adm-form-label">Datum *</label>
                  <input
                    className="adm-form-input"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Startzeit *</label>
                  <input
                    className="adm-form-input"
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Endzeit *</label>
                  <input
                    className="adm-form-input"
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    required
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Max. Teilnehmer *</label>
                  <input
                    className="adm-form-input"
                    type="number"
                    min="2"
                    value={maxParticipants}
                    onChange={e => setMaxParticipants(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              onClick={() => navigate('/admin/events')}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="adm-btn adm-btn--primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="adm-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Wird gespeichert…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
                  {isEdit ? 'Änderungen speichern' : 'Event erstellen'}
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
