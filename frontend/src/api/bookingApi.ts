import axiosInstance from './axiosInstance'

export interface Booking {
  _id: string
  user: string
  venue: string
  date: string
  startTime: string
  endTime: string
  durationHours: number
  totalPrice: number
  sport: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus: 'unpaid' | 'paid' | 'refunded'
  notes?: string
  cancelledAt?: string
  cancellationReason?: string
  createdAt: string
  updatedAt: string
}

export interface BookingCreateInput {
  venue: string
  date: string
  startTime: string
  endTime: string
  sport: string
  notes?: string
}

export interface BookingUpdateInput {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus?: 'unpaid' | 'paid' | 'refunded'
  notes?: string
}

// Create a booking
export async function createBooking(bookingData: BookingCreateInput) {
  try {
    const { data } = await axiosInstance.post<{ booking: Booking }>('/bookings', bookingData)
    return data.booking
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create booking')
  }
}

// Get user's bookings
export async function getMyBookings(params?: { status?: string; skip?: number; limit?: number }) {
  try {
    const { data } = await axiosInstance.get<{ bookings: Booking[] }>('/bookings/my', { params })
    return data.bookings || []
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch bookings')
  }
}

// Get booking by ID
export async function getBookingById(id: string) {
  try {
    const { data } = await axiosInstance.get<{ data: Booking }>(`/bookings/${id}`)
    return data.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch booking')
  }
}

// Cancel a booking
export async function cancelBooking(id: string, reason?: string) {
  try {
    const { data } = await axiosInstance.put<{ booking: Booking }>(`/bookings/${id}/cancel`, {
      reason,
    })
    return data.booking
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to cancel booking')
  }
}

// Get booked slots for a venue
export async function getBookedSlots(venueId: string, date: string) {
  try {
    const { data } = await axiosInstance.get<{
      slots: { startTime: string; endTime: string }[]
    }>(`/bookings/venue/${venueId}/slots`, { params: { date } })
    return data.slots || []
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch booked slots')
  }
}

// Get all bookings (admin only)
export async function getAllBookings(params?: {
  status?: string
  sport?: string
  skip?: number
  limit?: number
}) {
  try {
    const { data } = await axiosInstance.get<{ data?: Booking[]; bookings?: Booking[] }>('/bookings', { params })
    return data.bookings || data.data || []
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch bookings')
  }
}

// Update booking (admin only)
export async function updateBooking(id: string, bookingData: BookingUpdateInput) {
  try {
    const { data } = await axiosInstance.put<{ data: Booking }>(`/bookings/${id}`, bookingData)
    return data.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update booking')
  }
}
