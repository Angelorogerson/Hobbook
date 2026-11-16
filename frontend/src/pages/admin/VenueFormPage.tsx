import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getVenueById, createVenue, updateVenue } from '@/api/venueApi'
import { useVenueContext } from '@/store/VenueContext'
import AdminNav from './AdminNav'
import './admin.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_LABELS: Record<string, string> = {
  Monday: 'Montag', Tuesday: 'Dienstag', Wednesday: 'Mittwoch',
  Thursday: 'Donnerstag', Friday: 'Freitag', Saturday: 'Samstag', Sunday: 'Sonntag',
}

const AMENITY_OPTIONS = [
  { key: 'parking', label: 'Parkplätze', icon: 'local_parking' },
  { key: 'lighting', label: 'Beleuchtung', icon: 'light_mode' },
  { key: 'changing_rooms', label: 'Umkleide', icon: 'checkroom' },
  { key: 'showers', label: 'Duschen', icon: 'shower' },
  { key: 'spectator_area', label: 'Zuschauer-Bereich', icon: 'group' },
  { key: 'bar', label: 'Bar / Restaurant', icon: 'local_cafe' },
  { key: 'wifi', label: 'WLAN', icon: 'wifi' },
]

function defaultHours() {
  return DAYS.map(day => ({
    day,
    open: day === 'Sunday' ? '10:00' : '08:00',
    close: day === 'Sunday' ? '20:00' : '22:00',
    isClosed: false,
  }))
}

export default function VenueFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const { fetchVenues } = useVenueContext()

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sport, setSport] = useState('football')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [state, setState] = useState('')
  const [pricePerHour, setPricePerHour] = useState('')
  const [capacity, setCapacity] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [hours, setHours] = useState(defaultHours())

  useEffect(() => {
    if (!isEdit) return
    const load = async () => {
      try {
        const venue = await getVenueById(id!)
        setName(venue.name)
        setDescription(venue.description)
        setSport(venue.sport)
        setStreet(venue.address?.street ?? '')
        setCity(venue.address?.city ?? '')
        setZip(venue.address?.zip ?? '')
        setState(venue.address?.state ?? '')
        setPricePerHour(String(venue.pricePerHour ?? ''))
        setCapacity(String(venue.capacity ?? ''))
        setAmenities(venue.amenities ?? [])
        if (venue.openingHours?.length) {
          setHours(DAYS.map(day => {
            const existing = venue.openingHours.find(h => h.day === day)
            return existing
              ? { day, open: existing.open, close: existing.close, isClosed: false }
              : { day, open: '09:00', close: '21:00', isClosed: true }
          }))
        }
      } catch (err: any) {
        setError(err.message || 'Venue konnte nicht geladen werden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit])

  const toggleAmenity = (key: string) => {
    setAmenities(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key])
  }

  const updateHour = (idx: number, field: 'open' | 'close' | 'isClosed', value: string | boolean) => {
    setHours(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const openHours = hours
      .filter(h => !h.isClosed)
      .map(({ day, open, close }) => ({ day, open, close }))

    const payload = {
      name,
      description,
      sport,
      address: { street, city, zip, state },
      pricePerHour: parseFloat(pricePerHour),
      capacity: parseInt(capacity, 10),
      amenities,
      openingHours: openHours,
    }

    try {
      if (isEdit) {
        await updateVenue(id!, payload)
      } else {
        await createVenue(payload)
        // Nach erfolgreichem Create: Venues neu laden für sofortige UI-Aktualisierung
        await fetchVenues()
      }
      setSuccess(true)
      setTimeout(() => navigate('/admin/venues'), 1200)
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
          <span>Venue wird geladen…</span>
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
            <p className="adm-hero-eyebrow">Admin · Venues</p>
            <h1 className="adm-hero-title">{isEdit ? 'Venue bearbeiten' : 'Neue Venue erstellen'}</h1>
            <p className="adm-hero-sub">
              {isEdit ? `Bearbeite alle Details für "${name}"` : 'Füge eine neue Sportstätte zur Plattform hinzu.'}
            </p>
          </div>
          <div className="adm-hero-actions">
            <button className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/venues')}>
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
              {isEdit ? 'Venue erfolgreich aktualisiert!' : 'Venue erfolgreich erstellt!'} Weiterleitung…
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
                  <label className="adm-form-label">Name *</label>
                  <input
                    className="adm-form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="z.B. Sportpark Mitte"
                    required
                  />
                </div>

                <div className="adm-form-group adm-form-full">
                  <label className="adm-form-label">Beschreibung</label>
                  <textarea
                    className="adm-form-textarea"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Kurze Beschreibung der Sportstätte…"
                    rows={3}
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">Sportart *</label>
                  <select
                    className="adm-form-select"
                    value={sport}
                    onChange={e => setSport(e.target.value)}
                    required
                  >
                    <option value="football">Fußball</option>
                    <option value="basketball">Basketball</option>
                    <option value="both">Beides</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Standort */}
          <div className="adm-section">
            <div className="adm-section-header">
              <h2 className="adm-section-title">
                <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 8, color: '#004E89' }}>location_on</span>
                Standort
              </h2>
            </div>
            <div className="adm-section-body">
              <div className="adm-form-grid">
                <div className="adm-form-group adm-form-full">
                  <label className="adm-form-label">Straße *</label>
                  <input
                    className="adm-form-input"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    placeholder="Musterstraße 42"
                    required
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Stadt *</label>
                  <input
                    className="adm-form-input"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Berlin"
                    required
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">PLZ</label>
                  <input
                    className="adm-form-input"
                    value={zip}
                    onChange={e => setZip(e.target.value)}
                    placeholder="10115"
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Bundesland</label>
                  <input
                    className="adm-form-input"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    placeholder="Berlin"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preise & Kapazität */}
          <div className="adm-section">
            <div className="adm-section-header">
              <h2 className="adm-section-title">
                <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 8, color: '#004E89' }}>euro</span>
                Preise & Kapazität
              </h2>
            </div>
            <div className="adm-section-body">
              <div className="adm-form-grid">
                <div className="adm-form-group">
                  <label className="adm-form-label">Preis pro Stunde (€) *</label>
                  <input
                    className="adm-form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricePerHour}
                    onChange={e => setPricePerHour(e.target.value)}
                    placeholder="50.00"
                    required
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Kapazität (Personen) *</label>
                  <input
                    className="adm-form-input"
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={e => setCapacity(e.target.value)}
                    placeholder="22"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ausstattung */}
          <div className="adm-section">
            <div className="adm-section-header">
              <h2 className="adm-section-title">
                <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 8, color: '#004E89' }}>checklist</span>
                Ausstattung
              </h2>
            </div>
            <div className="adm-section-body">
              <div className="adm-amenities-grid">
                {AMENITY_OPTIONS.map(opt => {
                  const active = amenities.includes(opt.key)
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`adm-amenity-checkbox ${active ? 'adm-amenity-checkbox--active' : ''}`}
                      onClick={() => toggleAmenity(opt.key)}
                    >
                      <span className="material-symbols-outlined adm-amenity-icon">{opt.icon}</span>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Öffnungszeiten */}
          <div className="adm-section">
            <div className="adm-section-header">
              <h2 className="adm-section-title">
                <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 8, color: '#004E89' }}>schedule</span>
                Öffnungszeiten
              </h2>
            </div>
            <div className="adm-section-body">
              <table className="adm-hours-table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Öffnet</th>
                    <th>Schließt</th>
                    <th>Geschlossen</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((h, idx) => (
                    <tr key={h.day}>
                      <td className="adm-hours-day">{DAY_LABELS[h.day]}</td>
                      <td>
                        <input
                          type="time"
                          className="adm-hours-input"
                          value={h.open}
                          onChange={e => updateHour(idx, 'open', e.target.value)}
                          disabled={h.isClosed}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          className="adm-hours-input"
                          value={h.close}
                          onChange={e => updateHour(idx, 'close', e.target.value)}
                          disabled={h.isClosed}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={h.isClosed}
                          onChange={e => updateHour(idx, 'isClosed', e.target.checked)}
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#004E89' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              onClick={() => navigate('/admin/venues')}
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
                  {isEdit ? 'Änderungen speichern' : 'Venue erstellen'}
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
