import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { saveEvent, unsaveEvent, type SportEvent } from '@/api/eventApi'
import { apiError } from '@/api/axiosInstance'
import { useAuthContext } from '@/store/AuthContext'
import { useToast } from '@/components/ui/Toast'
import './SaveButton.css'

interface Props {
  event: Pick<SportEvent, '_id' | 'title' | 'saved'>
  /** "icon" for cards, "label" for the detail page. */
  variant?: 'icon' | 'label'
  onChange?: (saved: boolean) => void
}

// Cards also render outside the signed-in app shell (tests, previews): no provider means guest.
function useViewer() {
  try {
    return useAuthContext().authState
  } catch {
    return null
  }
}

/** Bookmark toggle ("Merken"). Updates at once and rolls back if the server refuses. */
export default function SaveButton({ event, variant = 'icon', onChange }: Props) {
  const viewer = useViewer()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [saved, setSaved] = useState(!!event.saved)
  const [busy, setBusy] = useState(false)
  // The confirmation pop plays for the tap only, never when a saved card first renders.
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => setSaved(!!event.saved), [event.saved])

  const toggle = async () => {
    if (!viewer?.isLoggedIn) {
      navigate('/login', { state: { from: location.pathname + location.search, intent: 'save' } })
      return
    }
    const next = !saved
    setSaved(next)
    setJustSaved(next)
    setBusy(true)
    try {
      await (next ? saveEvent(event._id) : unsaveEvent(event._id))
      toast(next ? 'Gemerkt – du findest es unter „Meine Events“.' : 'Nicht mehr gemerkt.')
      onChange?.(next)
    } catch (err) {
      setSaved(!next)
      setJustSaved(false)
      toast(apiError(err, 'Das hat nicht geklappt. Bitte versuch es noch einmal.').message, 'danger')
    } finally {
      setBusy(false)
    }
  }

  const label = saved ? 'Gemerkt' : 'Merken'
  return (
    <button
      type="button"
      className={variant === 'icon' ? `save-btn${saved ? ' is-saved' : ''}${justSaved ? ' just-saved' : ''}` : `btn btn-ghost btn-sm save-btn-label${saved ? ' is-saved' : ''}${justSaved ? ' just-saved' : ''}`}
      aria-pressed={saved}
      aria-label={variant === 'icon' ? `Merken: ${event.title}` : undefined}
      title={variant === 'icon' ? label : undefined}
      disabled={busy}
      onClick={toggle}
    >
      <Bookmark size={variant === 'icon' ? 20 : 16} aria-hidden="true" />
      {variant === 'label' && label}
    </button>
  )
}
