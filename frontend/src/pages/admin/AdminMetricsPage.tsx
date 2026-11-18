import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getMetrics, type PilotMetrics } from '@/api/loopApi'
import { apiError } from '@/api/axiosInstance'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import AdminNav from './AdminNav'
import './admin.css'

const pct = (v: number | null, unit = '%') => (v === null ? '–' : `${String(v).replace('.', ',')} ${unit}`)

/** The pilot's success numbers (docs/product/NEXT_BIG_IMPROVEMENT.md §9), last 28 days. */
export default function AdminMetricsPage() {
  const [m, setM] = useState<PilotMetrics | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getMetrics()
      .then(setM)
      .catch((err) => setError(apiError(err).message))
  }, [])

  const tiles = m
    ? [
        { label: 'Antwortquote vor der Frist', value: pct(m.last28Days.answerRateBeforeDeadline), goal: 'Ziel ≥ 80 %' },
        { label: 'Median bis zur Antwort', value: pct(m.last28Days.medianHoursToAnswer, 'Std.'), goal: 'Ziel < 12 Std.' },
        { label: 'Nicht erschienen', value: pct(m.last28Days.noShowRate), goal: 'Ziel < 10 %' },
        { label: 'Termine', value: String(m.last28Days.games), goal: `${m.last28Days.decidedOn} fanden statt · ${m.last28Days.decidedOff} fielen aus` },
        { label: 'Aktive Stammspiele', value: String(m.activeGroups), goal: `${m.organizers} Organisator:innen · ${m.members} Mitgliedschaften` },
        { label: 'Konten', value: String(m.users), goal: '' },
        {
          label: 'E-Mails',
          value: String(m.last28Days.emails.sent || 0),
          goal: `${m.last28Days.emails.failed || 0} fehlgeschlagen · ${m.last28Days.emails.skipped || 0} übersprungen`,
        },
      ]
    : []

  return (
    <div className="page admin">
      <div className="page-head">
        <div>
          <h1 className="page-title">Moderation</h1>
          <p className="page-subtitle">Kennzahlen der letzten 28 Tage</p>
        </div>
      </div>
      <AdminNav />
      {error && (
        <p className="notice notice-danger" role="alert">
          <AlertTriangle size={18} aria-hidden="true" /> {error}
        </p>
      )}
      {!m && !error && <LoadingSpinner />}
      {m && (
        <ul className="metric-grid">
          {tiles.map((t) => (
            <li key={t.label} className="card card-pad metric">
              <span className="metric-label">{t.label}</span>
              <strong className="metric-value num">{t.value}</strong>
              {t.goal && <span className="hint">{t.goal}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
