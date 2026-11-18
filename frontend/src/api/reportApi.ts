import api from './axiosInstance'
import type { SportEvent } from './eventApi'

export const REPORT_REASONS: { key: string; label: string }[] = [
  { key: 'spam', label: 'Spam oder Werbung' },
  { key: 'inappropriate', label: 'Unangemessener Inhalt' },
  { key: 'unsafe', label: 'Sicherheitsbedenken' },
  { key: 'wrong_info', label: 'Falsche Angaben (Ort, Zeit)' },
  { key: 'other', label: 'Sonstiges' },
]

export type ReportStatus = 'open' | 'resolved' | 'dismissed'

export interface Report {
  _id: string
  reason: string
  text: string
  status: ReportStatus
  note: string
  createdAt: string
  resolvedAt: string | null
  reporter: { _id: string; displayName: string } | null
  event: SportEvent | null
  /** Reports about a person. */
  targetUser: { _id: string; displayName: string; active: boolean } | null
}

export async function createReport(eventId: string, reason: string, text?: string): Promise<string> {
  const { data } = await api.post('/reports', { eventId, reason, text })
  return data.message
}

export async function reportPerson(userId: string, reason: string, text?: string): Promise<string> {
  const { data } = await api.post('/reports', { userId, reason, text })
  return data.message
}

export async function listReports(status?: ReportStatus): Promise<Report[]> {
  const { data } = await api.get('/reports', { params: status ? { status } : {} })
  return data.reports
}

export async function updateReport(
  id: string,
  body: { status: ReportStatus; note?: string; cancelEvent?: boolean; deactivateUser?: boolean }
): Promise<Report> {
  const { data } = await api.patch(`/reports/${id}`, body)
  return data.report
}
