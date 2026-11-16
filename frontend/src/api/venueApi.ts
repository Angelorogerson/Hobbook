import axiosInstance from './axiosInstance'

export interface Venue {
  _id: string
  name: string
  description: string
  sport: string
  address: {
    street: string
    city: string
    zip: string
    state: string
  }
  location?: {
    type: 'Point'
    coordinates: [number, number]
  }
  images: string[]
  pricePerHour: number
  capacity: number
  amenities: string[]
  openingHours: {
    day: string
    open: string
    close: string
  }[]
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface VenueFilters {
  sport?: string
  city?: string
  minPrice?: number
  maxPrice?: number
  skip?: number
  limit?: number
}

export interface VenueCreateInput {
  name: string
  description: string
  sport: string
  address: {
    street: string
    city: string
    zip: string
    state: string
  }
  images?: string[]
  pricePerHour: number
  capacity: number
  amenities?: string[]
  openingHours?: {
    day: string
    open: string
    close: string
  }[]
}

export interface VenueUpdateInput {
  name?: string
  description?: string
  sport?: string
  address?: {
    street: string
    city: string
    zip: string
    state: string
  }
  images?: string[]
  pricePerHour?: number
  capacity?: number
  amenities?: string[]
  openingHours?: {
    day: string
    open: string
    close: string
  }[]
}

// Get all venues with optional filters
export async function getVenues(params?: VenueFilters) {
  try {
    // Backend returns { count, venues }
    const { data } = await axiosInstance.get<{ count: number; venues: Venue[] }>('/venues', { params })
    return data.venues || []
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch venues')
  }
}

// Get venue by ID
export async function getVenueById(id: string) {
  try {
    const { data } = await axiosInstance.get<{ venue: Venue }>(`/venues/${id}`)
    return data.venue
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch venue')
  }
}

// Create new venue (admin only)
export async function createVenue(venueData: VenueCreateInput) {
  try {
    const { data } = await axiosInstance.post<{ venue: Venue }>('/venues', venueData)
    return data.venue
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create venue')
  }
}

// Update venue (admin only)
export async function updateVenue(id: string, venueData: VenueUpdateInput) {
  try {
    const { data } = await axiosInstance.put<{ data: Venue }>(`/venues/${id}`, venueData)
    return data.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update venue')
  }
}

// Delete venue (admin only) - soft delete
export async function deleteVenue(id: string) {
  try {
    await axiosInstance.delete(`/venues/${id}`)
    return true
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete venue')
  }
}
