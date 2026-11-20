import { Link } from 'react-router-dom'
import { CopyPlus } from 'lucide-react'
import type { SportEvent } from '@/api/eventApi'

/** Where the create form opens prefilled with a copy of this event. */
export const duplicateEventPath = (eventId: string) => `/events/neu?kopie=${encodeURIComponent(eventId)}`

/**
 * Host action on an event: "Nochmal veranstalten" opens the create form with
 * everything but the date taken over. `size="sm"` is the compact form for lists.
 */
export default function DuplicateEventButton({ event, size = 'block' }: { event: SportEvent; size?: 'block' | 'sm' }) {
  return (
    <Link to={duplicateEventPath(event._id)} className={size === 'sm' ? 'btn btn-secondary btn-sm' : 'btn btn-secondary btn-block'}>
      <CopyPlus size={size === 'sm' ? 14 : 18} aria-hidden="true" /> Nochmal veranstalten
    </Link>
  )
}
