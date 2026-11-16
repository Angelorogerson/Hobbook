import api from './axiosInstance'

export interface GeoResult {
  placeName: string
  address: string
  city: string
  countryCode?: string
  lat: number
  lng: number
  displayName: string
}

export async function searchPlaces(q: string): Promise<GeoResult[]> {
  const { data } = await api.get('/geocode/search', { params: { q } })
  return data.results
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
  const { data } = await api.get('/geocode/reverse', { params: { lat, lng } })
  return data.result
}
