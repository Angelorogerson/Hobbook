import api from './axiosInstance'

export type FeedbackKind = 'idea' | 'problem' | 'praise' | 'other'
export type FeedbackStatus = 'open' | 'done'

export const FEEDBACK_KINDS: { key: FeedbackKind; label: string }[] = [
  { key: 'idea', label: 'Idee' },
  { key: 'problem', label: 'Problem' },
  { key: 'praise', label: 'Lob' },
  { key: 'other', label: 'Sonstiges' },
]

export const feedbackKindLabel = (kind: string) => FEEDBACK_KINDS.find((k) => k.key === kind)?.label || 'Sonstiges'

export interface FeedbackInput {
  kind: FeedbackKind
  text: string
  /** App path the person came from (no query string). */
  page?: string
  /** Honeypot: stays empty for people. */
  website?: string
}

export interface FeedbackItem {
  _id: string
  kind: FeedbackKind
  text: string
  page: string
  status: FeedbackStatus
  createdAt: string
  /** Public short name of the sender, or "Gast". */
  from: string
}

/** Send feedback to the operators. Returns the thank-you message. */
export async function sendFeedback(input: FeedbackInput): Promise<string> {
  const { data } = await api.post('/feedback', input)
  return data.message
}

export async function listFeedback(status?: FeedbackStatus): Promise<FeedbackItem[]> {
  const { data } = await api.get('/feedback', { params: status ? { status } : {} })
  return data.feedback
}

export async function updateFeedback(id: string, status: FeedbackStatus): Promise<FeedbackItem> {
  const { data } = await api.patch(`/feedback/${id}`, { status })
  return data.feedback
}

export async function deleteFeedback(id: string): Promise<void> {
  await api.delete(`/feedback/${id}`)
}
