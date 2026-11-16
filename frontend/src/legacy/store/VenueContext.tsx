import { createContext, useContext, useReducer, ReactNode, useCallback } from 'react'
import { Venue, VenueFilters, getVenues, getVenueById, createVenue } from '../api/venueApi'

export interface VenueContextFilters {
  sport?: string
  city?: string
  minPrice?: number
  maxPrice?: number
}

export interface VenueContextState {
  venues: Venue[]
  selectedVenue: Venue | null
  searchQuery: string
  filters: VenueContextFilters
  isLoading: boolean
  error: string | null
}

type VenueAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VENUES'; payload: Venue[] }
  | { type: 'ADD_VENUE'; payload: Venue }
  | { type: 'SET_SELECTED_VENUE'; payload: Venue | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_FILTERS'; payload: VenueContextFilters }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_ERROR'; payload: string | null }

const initialState: VenueContextState = {
  venues: [],
  selectedVenue: null,
  searchQuery: '',
  filters: {},
  isLoading: false,
  error: null,
}

function venueReducer(state: VenueContextState, action: VenueAction): VenueContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_VENUES':
      return { ...state, venues: action.payload, isLoading: false, error: null }
    case 'ADD_VENUE':
      return { ...state, venues: [action.payload, ...state.venues] }
    case 'SET_SELECTED_VENUE':
      return { ...state, selectedVenue: action.payload }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: action.payload }
    case 'CLEAR_FILTERS':
      return { ...state, filters: {}, searchQuery: '', isLoading: false }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    default:
      return state
  }
}

const VenueContext = createContext<{
  state: VenueContextState
  fetchVenues: (filters?: VenueContextFilters) => Promise<void>
  fetchVenueById: (id: string) => Promise<void>
  addVenue: (venueData: any) => Promise<Venue>
  setFilters: (filters: VenueContextFilters) => Promise<void>
  clearFilters: () => void
  setSearchQuery: (query: string) => void
} | null>(null)

export function VenueProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(venueReducer, initialState)

  const fetchVenues = useCallback(async (filters?: VenueContextFilters) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const params: VenueFilters = {
        ...filters,
        skip: 0,
        limit: 50,
      }
      const venues = await getVenues(params)
      dispatch({ type: 'SET_VENUES', payload: venues })
    } catch (error: any) {
      const message = error.message || 'Failed to fetch venues'
      dispatch({ type: 'SET_ERROR', payload: message })
    }
  }, [])

  const fetchVenueById = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const venue = await getVenueById(id)
      dispatch({ type: 'SET_SELECTED_VENUE', payload: venue })
    } catch (error: any) {
      const message = error.message || 'Failed to fetch venue'
      dispatch({ type: 'SET_ERROR', payload: message })
    }
  }, [])

  const addVenue = useCallback(async (venueData: any) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const newVenue = await createVenue(venueData)
      dispatch({ type: 'ADD_VENUE', payload: newVenue })
      await fetchVenues()
      return newVenue
    } catch (error: any) {
      const message = error.message || 'Failed to create venue'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }, [fetchVenues])

  const setFilters = useCallback(async (filters: VenueContextFilters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
    await fetchVenues(filters)
  }, [fetchVenues])

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' })
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query })
  }, [])

  return (
    <VenueContext.Provider
      value={{
        state,
        fetchVenues,
        fetchVenueById,
        addVenue,
        setFilters,
        clearFilters,
        setSearchQuery,
      }}
    >
      {children}
    </VenueContext.Provider>
  )
}

export function useVenueContext() {
  const context = useContext(VenueContext)
  if (!context) {
    throw new Error('useVenueContext must be used within VenueProvider')
  }
  return context
}
