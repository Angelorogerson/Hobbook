import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Bell, Plus, RefreshCw, X } from 'lucide-react'
import { MAX_ALERTS, alertLabel, createAlert, deleteAlert, findAlert, listAlerts, type SearchAlert } from '@/api/alertApi'
import { apiError } from '@/api/axiosInstance'
import { useToast } from '@/components/ui/Toast'
import { SPORTS } from '@/constants/sports'

const listStyle = { listStyle: 'none', display: 'grid', gap: 'var(--space-2)', margin: 'var(--space-3) 0 var(--space-4)', padding: 0 }
const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' } as const
const nameStyle = { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0, overflowWrap: 'anywhere' } as const

/** Profile → "Such-Alarme": see, remove and add search alerts (at most 5). */
export default function AlertsSection() {
  const toast = useToast()
  const [alerts, setAlerts] = useState<SearchAlert[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [city, setCity] = useState('')
  const [sport, setSport] = useState('')
  const [busy, setBusy] = useState<string | null>(null) // 'add' or the id being removed
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoadError('')
    listAlerts()
      .then(setAlerts)
      .catch((err) => setLoadError(apiError(err, 'Deine Such-Alarme konnten nicht geladen werden.').message))
  }, [])

  useEffect(load, [load])

  const full = !!alerts && alerts.length >= MAX_ALERTS

  const add = async () => {
    const c = city.trim()
    setError('')
    if (!c) {
      setError('Bitte gib eine Stadt ein.')
      return
    }
    if (alerts && findAlert(alerts, c, sport)) {
      setError('Diesen Such-Alarm hast du schon.')
      return
    }
    setBusy('add')
    try {
      const res = await createAlert(c, sport)
      setAlerts(res.alerts)
      setCity('')
      setSport('')
      toast(`Alarm aktiv: ${alertLabel(res.alert)}.`)
    } catch (err) {
      setError(apiError(err, 'Das hat nicht geklappt. Bitte versuch es noch einmal.').message)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (a: SearchAlert) => {
    setError('')
    setBusy(a._id)
    try {
      setAlerts(await deleteAlert(a._id))
      toast('Alarm entfernt.')
    } catch (err) {
      setError(apiError(err, 'Das hat nicht geklappt. Bitte versuch es noch einmal.').message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card profile-section" id="such-alarme" aria-labelledby="such-alarme-titel">
      <h2 id="such-alarme-titel">Such-Alarme</h2>
      <p className="hint">Wir sagen dir Bescheid, sobald in einer Stadt ein neues Event oder Stammspiel eingetragen wird.</p>

      {loadError ? (
        <div className="notice notice-danger" role="alert" style={{ marginTop: 'var(--space-3)' }}>
          <AlertTriangle size={18} aria-hidden="true" />
          <div className="notice-body">
            <p>{loadError}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              <RefreshCw size={14} aria-hidden="true" /> Erneut versuchen
            </button>
          </div>
        </div>
      ) : alerts === null ? (
        <p className="hint" role="status" style={{ marginTop: 'var(--space-3)' }}>
          Such-Alarme werden geladen …
        </p>
      ) : (
        <>
          {alerts.length === 0 ? (
            <p className="hint" style={{ margin: 'var(--space-3) 0 var(--space-4)' }}>
              Du hast noch keinen Such-Alarm. Leg unten einen an – oder tipp bei einer Suche ohne Treffer auf „Sag mir Bescheid“.
            </p>
          ) : (
            <ul style={listStyle} aria-label="Deine Such-Alarme">
              {alerts.map((a) => (
                <li key={a._id} style={rowStyle}>
                  <span style={nameStyle}>
                    <Bell size={16} aria-hidden="true" /> {alertLabel(a)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy === a._id}
                    aria-label={`Alarm entfernen: ${alertLabel(a)}`}
                    onClick={() => remove(a)}
                  >
                    <X size={14} aria-hidden="true" /> Entfernen
                  </button>
                </li>
              ))}
            </ul>
          )}

          {full ? (
            <p className="notice notice-info" role="status">
              Du hast {MAX_ALERTS} von {MAX_ALERTS} Such-Alarmen. Entferne einen, um einen neuen anzulegen.
            </p>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                add()
              }}
            >
              <div className="field-row">
                <div className="field">
                  <label htmlFor="alert-city">Stadt</label>
                  <input
                    id="alert-city"
                    className="input"
                    type="text"
                    value={city}
                    maxLength={100}
                    placeholder="z. B. Köln"
                    autoComplete="address-level2"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'alert-error' : undefined}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="alert-sport">Sportart</label>
                  <select id="alert-sport" className="select" value={sport} onChange={(e) => setSport(e.target.value)}>
                    <option value="">Alle Sportarten</option>
                    {SPORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-secondary" disabled={busy === 'add'}>
                <Plus size={18} aria-hidden="true" /> Hinzufügen
              </button>
              <p className="hint" style={{ marginTop: 'var(--space-2)' }}>
                Höchstens {MAX_ALERTS} Such-Alarme.
              </p>
            </form>
          )}

          {error && (
            <p id="alert-error" className="error" role="alert" style={{ marginTop: 'var(--space-2)' }}>
              {error}
            </p>
          )}
        </>
      )}
    </section>
  )
}
