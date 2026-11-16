import { STATUS_LABELS } from '@/constants/sports'
import type { EventStatus } from '@/api/eventApi'

export default function StatusBadge({ status }: { status: EventStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>
}
