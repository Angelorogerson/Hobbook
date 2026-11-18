export interface LatLng {
  lat: number
  lng: number
}

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Human distance: "ca. 1 km", "2,4 km", "12 km". The stored position is coarse
 * (about 1 km), so anything below a kilometre is not shown more precisely than that.
 */
export function formatDistance(km: number): string {
  if (km < 1) return 'ca. 1 km'
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`
  return `${Math.round(km)} km`
}

const PLACE_KEY = 'hobbook_place'

export type RememberedPlace = { city: string } | { near: LatLng }

/** Last place the visitor searched, kept on this device only (position rounded to about 1 km). */
export function loadPlace(): RememberedPlace | null {
  try {
    const raw = localStorage.getItem(PLACE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (typeof v?.city === 'string' && v.city.trim()) return { city: v.city.trim().slice(0, 100) }
    if (Number.isFinite(v?.near?.lat) && Number.isFinite(v?.near?.lng)) return { near: { lat: v.near.lat, lng: v.near.lng } }
  } catch {
    /* storage unavailable or malformed: no remembered place */
  }
  return null
}

export function savePlace(place: RememberedPlace | null) {
  try {
    if (!place) localStorage.removeItem(PLACE_KEY)
    else if ('city' in place) localStorage.setItem(PLACE_KEY, JSON.stringify({ city: place.city }))
    else
      localStorage.setItem(
        PLACE_KEY,
        JSON.stringify({ near: { lat: Number(place.near.lat.toFixed(2)), lng: Number(place.near.lng.toFixed(2)) } })
      )
  } catch {
    /* storage unavailable: the place is simply not remembered */
  }
}
