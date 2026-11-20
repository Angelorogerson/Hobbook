import api from './axiosInstance'

/** A place the signed-in person used before for an event or a Stammspiel. */
export interface RecentPlace {
  placeName: string
  address: string
  city: string
  countryCode?: string
  lat: number
  lng: number
}

/** Up to five places, most recently used first. */
export async function getMyPlaces(): Promise<RecentPlace[]> {
  const { data } = await api.get('/places/mine')
  return Array.isArray(data?.places) ? data.places : []
}
