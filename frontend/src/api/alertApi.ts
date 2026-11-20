import api from './axiosInstance'
import { sportLabel } from '@/constants/sports'

/** Search alert ("Sag mir Bescheid"): told when a new public event appears in this city. */
export interface SearchAlert {
  _id: string
  city: string
  /** Sport key, or null for all sports. */
  sport: string | null
}

export const MAX_ALERTS = 5

export async function listAlerts(): Promise<SearchAlert[]> {
  const { data } = await api.get('/alerts')
  return data.alerts || []
}

/** Creating the same city + sport twice returns the existing alert. */
export async function createAlert(city: string, sport?: string | null): Promise<{ alert: SearchAlert; alerts: SearchAlert[] }> {
  const { data } = await api.post('/alerts', { city: city.trim(), ...(sport ? { sport } : {}) })
  return { alert: data.alert, alerts: data.alerts || [] }
}

export async function deleteAlert(id: string): Promise<SearchAlert[]> {
  const { data } = await api.delete(`/alerts/${id}`)
  return data.alerts || []
}

/** Same normalisation as the server: lowercase, no diacritics, single spaces. */
export function cityKey(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function findAlert(alerts: SearchAlert[], city: string, sport?: string | null): SearchAlert | undefined {
  const key = cityKey(city)
  return alerts.find((a) => cityKey(a.city) === key && (a.sport || null) === (sport || null))
}

/** "Basketball in Kaiserslautern" / "Alle Sportarten in Mannheim" */
export const alertLabel = (a: Pick<SearchAlert, 'city' | 'sport'>) => `${a.sport ? sportLabel(a.sport) : 'Alle Sportarten'} in ${a.city}`
