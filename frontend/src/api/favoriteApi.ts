import api from './axiosInstance'
import { Venue } from './venueApi'
import { ConnectEvent } from './connectEventApi'

export interface FavoritesResponse {
  favorites?: Venue[]
  venues?: Venue[]
  events?: ConnectEvent[]
}

export const getFavorites = async (): Promise<FavoritesResponse> => {
  const { data } = await api.get('/favorites')
  return data
}

export const addFavoriteVenue = async (venueId: string): Promise<void> => {
  await api.post(`/favorites/venue/${venueId}`)
}

export const removeFavoriteVenue = async (venueId: string): Promise<void> => {
  await api.delete(`/favorites/venue/${venueId}`)
}

export const addFavoriteEvent = async (eventId: string): Promise<void> => {
  await api.post(`/favorites/event/${eventId}`)
}

export const removeFavoriteEvent = async (eventId: string): Promise<void> => {
  await api.delete(`/favorites/event/${eventId}`)
}

// Backward compatibility
export const addFavorite = addFavoriteVenue
export const removeFavorite = removeFavoriteVenue
