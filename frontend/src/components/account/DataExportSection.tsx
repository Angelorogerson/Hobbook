import { useState } from 'react'
import { Download } from 'lucide-react'
import { apiError } from '@/api/axiosInstance'
import { fetchDataExport, saveFile } from '@/api/accountApi'
import { useToast } from '@/components/ui/Toast'

/** Profile → "Deine Daten": download a copy of everything stored about you. */
export default function DataExportSection() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setBusy(true)
    setError(null)
    try {
      saveFile(await fetchDataExport())
      toast('Download gestartet')
    } catch (err) {
      setError(apiError(err, 'Der Download hat nicht geklappt. Bitte versuche es erneut.').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card profile-section" id="deine-daten">
      <h2>Deine Daten</h2>
      <p className="hint" style={{ marginBottom: 12 }}>
        Lade eine Kopie von allem herunter, was Hobbook über dich gespeichert hat: Konto, Spiele, Antworten, Benachrichtigungen und mehr – als JSON-Datei.
      </p>
      <button type="button" className="btn btn-secondary" onClick={download} disabled={busy} aria-busy={busy}>
        <Download size={18} aria-hidden="true" />
        {busy ? 'Wird vorbereitet …' : 'Daten herunterladen'}
      </button>
      {error && (
        <p className="notice notice-danger" role="alert" style={{ marginTop: 12, marginBottom: 0 }}>
          {error}
        </p>
      )}
    </section>
  )
}
