import api from './axiosInstance'

export interface ConnectEvent {
  _id: string
  title: string
  sport: 'football' | 'basketball'
  description?: string
  location: {
    name?: string
    address?: string
    city?: string
  }
  date: string
  startTime: string
  endTime: string
  maxParticipants: number
  participants: Array<{ _id: string; name: string; avatar?: string }>
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'all'
  status: 'open' | 'full' | 'cancelled' | 'completed'
  creator: { _id: string; name: string; avatar?: string }
  createdAt: string
}

export interface CreateEventData {
  title: string
  sport: 'football' | 'basketball'
  description?: string
  location: { name?: string; address?: string; city?: string }
  date: string
  startTime: string
  endTime: string
  maxParticipants: number
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'all'
}

export const getEvents = async (params?: {
  sport?: string
  city?: string
  date?: string
}): Promise<ConnectEvent[]> => {
  const { data } = await api.get('/events', { params })
  return data.events
}

export const getEventById = async (id: string): Promise<ConnectEvent> => {
  const { data } = await api.get(`/events/${id}`)
  return data.event
}

export const createEvent = async (eventData: CreateEventData): Promise<ConnectEvent> => {
  const { data } = await api.post('/events', eventData)
  return data.event
}

export const joinEvent = async (id: string): Promise<ConnectEvent> => {
  const { data } = await api.put(`/events/${id}/join`)
  return data.event
}

export const leaveEvent = async (id: string): Promise<ConnectEvent> => {
  const { data } = await api.put(`/events/${id}/leave`)
  return data.event
}

// ─── ADMIN FUNCTIONS ───
export const getAllEvents = async (): Promise<ConnectEvent[]> => {
  const { data } = await api.get('/events/admin/all')
  return data.events
}

export const updateEvent = async (id: string, eventData: Partial<CreateEventData>): Promise<ConnectEvent> => {
  const { data } = await api.put(`/events/admin/${id}`, eventData)
  return data.event
}

export const deleteEvent = async (id: string): Promise<{ message: string }> => {
  const { data } = await api.delete(`/events/${id}`)
  return data
}

export const approveEvent = async (id: string): Promise<ConnectEvent> => {
  const { data } = await api.put(`/events/admin/${id}/approve`)
  return data.event
}

export const rejectEvent = async (id: string): Promise<ConnectEvent> => {
  const { data } = await api.put(`/events/admin/${id}/reject`)
  return data.event
}
