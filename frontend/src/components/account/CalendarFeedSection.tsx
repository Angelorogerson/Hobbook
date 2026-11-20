import { useState } from 'react'
import { AlertTriangle, CalendarPlus, Copy, RefreshCw } from 'lucide-react'
import { apiError } from '@/api/axiosInstance'
import { calendarFeedUrl, getCalendarToken, resetCalendarToken, webcalUrl } from '@/api/accountApi'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/common/ConfirmDialog'

/** Profile → "Kalender-Abo": a personal .ics address for Google, Apple or Outlook calendar. */
export default function CalendarFeedSection() {
  const toast = useToast()
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  // The link is fetched only on request: it is a secret, so it is not shown by default.
  const reveal = async () => {
    setBusy(true)
    setError(null)
    try {
      setUrl(calendarFeedUrl(await getCalendarToken()))
    } catch (err) {
      setError(apiError(err, 'Der Kalender-Link konnte nicht geladen werden. Bitte versuche es erneut.').message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast('Link kopiert')
    } catch {
      toast('Kopieren hat nicht geklappt – markiere den Text von Hand.', 'danger')
    }
  }

  const reset = async () => {
    setError(null)
    try {
      setUrl(calendarFeedUrl(await resetCalendarToken()))
      toast('Neuer Link erstellt. Der alte funktioniert nicht mehr.')
    } catch (err) {
      setError(apiError(err, 'Der Link konnte nicht erneuert werden. Bitte versuche es erneut.').message)
    } finally {
      setConfirmReset(false)
    }
  }

  return (
    <section className="card profile-section" id="kalender-abo">
      <h2>Kalender-Abo</h2>
      <p className="hint" style={{ marginBottom: 12 }}>
        Abonniere deine Spiele einmal in deinem Kalender (Google, Apple, Outlook). Neue Termine, Änderungen und Absagen erscheinen dort dann von selbst.
      </p>

      {!url && (
        <button type="button" className="btn btn-secondary" onClick={reveal} disabled={busy} aria-busy={busy}>
          <CalendarPlus size={18} aria-hidden="true" />
          {busy ? 'Lädt …' : 'Kalender-Link anzeigen'}
        </button>
      )}

      {url && (
        <>
          <div className="field">
            <label htmlFor="calendar-feed-url">Dein Kalender-Link</label>
            <input
              id="calendar-feed-url"
              className="input"
              type="url"
              readOnly
              value={url}
              aria-describedby="calendar-feed-warning"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
          <p className="notice notice-warning" id="calendar-feed-warning">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>Wer diesen Link kennt, sieht deine Termine. Teile ihn nicht.</span>
          </p>
          <div className="profile-account-actions">
            <button type="button" className="btn btn-primary" onClick={copy}>
              <Copy size={18} aria-hidden="true" />
              Link kopieren
            </button>
            <a className="btn btn-secondary" href={webcalUrl(url)}>
              <CalendarPlus size={18} aria-hidden="true" />
              In Kalender-App öffnen
            </a>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(true)}>
              <RefreshCw size={18} aria-hidden="true" />
              Link erneuern
            </button>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            In Google Kalender: „Weitere Kalender“ → „Per URL“ und den Link einfügen. Kalender-Apps laden Abos oft nur alle paar Stunden neu.
          </p>
        </>
      )}

      {error && (
        <p className="notice notice-danger" role="alert" style={{ marginTop: 12, marginBottom: 0 }}>
          {error}
        </p>
      )}

      {confirmReset && (
        <ConfirmDialog title="Kalender-Link erneuern?" confirmLabel="Link erneuern" onConfirm={reset} onClose={() => setConfirmReset(false)}>
          <p>Der alte Link funktioniert dann nicht mehr. Kalender, die ihn abonniert haben, bekommen keine neuen Termine, bis du dort den neuen Link einträgst.</p>
        </ConfirmDialog>
      )}
    </section>
  )
}
