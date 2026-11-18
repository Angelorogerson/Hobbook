import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import './Toast.css'

type Tone = 'success' | 'danger'
interface ToastItem {
  id: number
  text: string
  tone: Tone
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {})

/** Short confirmations that disappear on their own ("Gemerkt", "Link kopiert"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const show = useCallback((text: string, tone: Tone = 'success') => {
    const id = nextId.current++
    // One toast at a time keeps the message readable and the screen calm.
    setItems([{ id, text, tone }])
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), tone === 'danger' ? 6000 : 3500)
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((t) => (
          <p key={t.id} className={`toast toast-${t.tone}`}>
            {t.tone === 'danger' ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
            {t.text}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
