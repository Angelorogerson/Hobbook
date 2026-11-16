import { createContext, useContext, useReducer, ReactNode, useCallback } from 'react'
import {
  Booking,
  getMyBookings,
  getBookingById,
  createBooking,
  cancelBooking,
} from '../api/bookingApi'

export interface BookingContextState {
  bookings: Booking[]
  selectedBooking: Booking | null
  isLoading: boolean
  error: string | null
}

type BookingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_BOOKINGS'; payload: Booking[] }
  | { type: 'ADD_BOOKING'; payload: Booking }
  | { type: 'UPDATE_BOOKING'; payload: Booking }
  | { type: 'SET_SELECTED_BOOKING'; payload: Booking | null }
  | { type: 'SET_ERROR'; payload: string | null }

const initialState: BookingContextState = {
  bookings: [],
  selectedBooking: null,
  isLoading: false,
  error: null,
}

function bookingReducer(state: BookingContextState, action: BookingAction): BookingContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_BOOKINGS':
      return { ...state, bookings: action.payload, isLoading: false, error: null }
    case 'ADD_BOOKING':
      return { ...state, bookings: [action.payload, ...state.bookings] }
    case 'UPDATE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.map((b) => (b._id === action.payload._id ? action.payload : b)),
        selectedBooking:
          state.selectedBooking?._id === action.payload._id ? action.payload : state.selectedBooking,
      }
    case 'SET_SELECTED_BOOKING':
      return { ...state, selectedBooking: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    default:
      return state
  }
}

const BookingContext = createContext<{
  state: BookingContextState
  fetchMyBookings: () => Promise<void>
  fetchBookingById: (id: string) => Promise<void>
  addBooking: (bookingData: any) => Promise<Booking>
  cancelBooking: (bookingId: string) => Promise<Booking>
} | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState)

  const fetchMyBookings = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const bookings = await getMyBookings()
      dispatch({ type: 'SET_BOOKINGS', payload: bookings })
    } catch (error: any) {
      const message = error.message || 'Failed to fetch bookings'
      dispatch({ type: 'SET_ERROR', payload: message })
    }
  }, [])

  const fetchBookingById = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const booking = await getBookingById(id)
      dispatch({ type: 'SET_SELECTED_BOOKING', payload: booking })
    } catch (error: any) {
      const message = error.message || 'Failed to fetch booking'
      dispatch({ type: 'SET_ERROR', payload: message })
    }
  }, [])

  const addBooking = useCallback(
    async (bookingData: any) => {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      try {
        const newBooking = await createBooking(bookingData)
        dispatch({ type: 'ADD_BOOKING', payload: newBooking })
        await fetchMyBookings()
        return newBooking
      } catch (error: any) {
        const message = error.message || 'Failed to create booking'
        dispatch({ type: 'SET_ERROR', payload: message })
        throw error
      }
    },
    [fetchMyBookings]
  )

  const cancelBookingHandler = useCallback(async (bookingId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const updatedBooking = await cancelBooking(bookingId)
      dispatch({ type: 'UPDATE_BOOKING', payload: updatedBooking })
      return updatedBooking
    } catch (error: any) {
      const message = error.message || 'Failed to cancel booking'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }, [])

  return (
    <BookingContext.Provider
      value={{
        state,
        fetchMyBookings,
        fetchBookingById,
        addBooking,
        cancelBooking: cancelBookingHandler,
      }}
    >
      {children}
    </BookingContext.Provider>
  )
}

export function useBookingContext() {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBookingContext must be used within BookingProvider')
  }
  return context
}
