import api from './axiosInstance'

export type CommentKind = 'comment' | 'announcement'

/** One message under an event ("Fragen & Infos"). */
export interface EventComment {
  _id: string
  kind: CommentKind
  text: string
  createdAt: string
  author: { _id: string | null; displayName: string; isHost: boolean }
  /** The viewer wrote it, runs the event or is an admin. */
  canDelete: boolean
}

export const COMMENT_MAX_LENGTH = 500

export async function listComments(eventId: string): Promise<EventComment[]> {
  const { data } = await api.get(`/events/${eventId}/comments`)
  return data.comments || []
}

/** `kind: 'announcement'` (hosts only) also notifies everyone who is in. */
export async function postComment(eventId: string, text: string, kind: CommentKind = 'comment'): Promise<EventComment> {
  const { data } = await api.post(`/events/${eventId}/comments`, { text, kind })
  return data.comment
}

export async function deleteComment(eventId: string, commentId: string): Promise<void> {
  await api.delete(`/events/${eventId}/comments/${commentId}`)
}
