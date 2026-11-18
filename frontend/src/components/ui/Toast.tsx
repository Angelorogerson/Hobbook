import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { MOTION } from '@/utils/motion'
import './Toast.css'

type Tone = 'success' | 'danger'
interface ToastItem {
  id: number
  text: string
  tone: Tone
  leaving?: boolean
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {})

/** Short confirmations that disappear on their own ("Gemerkt", "Link kopiert"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const show = useCallback((text: string, tone: Tone = 'success') => {
    const id = nextId.current++
    // One toast at a time keeps the message readable: a new one replaces the old,
    // which leaves underneath it.
    setItems((list) => [...list.filter((t) => !t.leaving).map((t) => ({ ...t, leaving: true })), { id, text, tone }])
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id === id || !t.leaving)), MOTION.dur3Out)
    const remove = (ms: number) => window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), ms)
    window.setTimeout(() => {
      setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
      remove(MOTION.dur3Out)
    }, tone === 'danger' ? MOTION.toastError : MOTION.toastSuccess)
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((t) => (
          <p key={t.id} className={`toast toast-${t.tone}${t.leaving ? ' is-leaving' : ''}`} aria-hidden={t.leaving || undefined}>
            {t.tone === 'danger' ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
            {t.text}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
