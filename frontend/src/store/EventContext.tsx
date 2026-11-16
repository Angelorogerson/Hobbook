import { createContext, useContext, useReducer, ReactNode, useCallback } from 'react'
import {
  ConnectEvent,
  getEvents,
  getEventById,
  createEvent,
  joinEvent,
  leaveEvent,
} from '../api/connectEventApi'

export interface EventContextFilters {
  sport?: string
  city?: string
  date?: string
}

export interface EventContextState {
  events: ConnectEvent[]
  selectedEvent: ConnectEvent | null
  filters: EventContextFilters
  isLoading: boolean
  error: string | null
}

type EventAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_EVENTS'; payload: ConnectEvent[] }
  | { type: 'ADD_EVENT'; payload: ConnectEvent }
  | { type: 'UPDATE_EVENT'; payload: ConnectEvent }
  | { type: 'SET_SELECTED_EVENT'; payload: ConnectEvent | null }
  | { type: 'SET_FILTERS'; payload: EventContextFilters }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_ERROR'; payload: string | null }

const initialState: EventContextState = {
  events: [],
  selectedEvent: null,
  filters: {},
  isLoading: false,
  error: null,
}

function eventReducer(state: EventContextState, action: EventAction): EventContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_EVENTS':
      return { ...state, events: action.payload, isLoading: false, error: null }
    case 'ADD_EVENT':
      return { ...state, events: [action.payload, ...state.events] }
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map((e) => (e._id === action.payload._id ? action.payload : e)),
        selectedEvent:
          state.selectedEvent?._id === action.payload._id ? action.payload : state.selectedEvent,
      }
    case 'SET_SELECTED_EVENT':
      return { ...state, selectedEvent: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: action.payload }
    case 'CLEAR_FILTERS':
      return { ...state, filters: {}, isLoading: false }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    default:
      return state
  }
}

const EventContext = createContext<{
  state: EventContextState
  fetchEvents: (filters?: EventContextFilters) => Promise<void>
  fetchEventById: (id: string) => Promise<void>
  addEvent: (eventData: any) => Promise<ConnectEvent>
  joinEvent: (eventId: string) => Promise<ConnectEvent>
  leaveEvent: (eventId: string) => Promise<ConnectEvent>
  setFilters: (filters: EventContextFilters) => Promise<void>
  clearFilters: () => void
} | null>(null)

export function EventProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(eventReducer, initialState)

  const fetchEvents = useCallback(async (filters?: EventContextFilters) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const events = await getEvents(filters)
      dispatch({ type: 'SET_EVENTS', payload: events })
    } catch (error: any) {
      const message = error.message || 'Failed to fetch events'
      dispatch({ type: 'SET_ERROR', payload: message })
    }
  }, [])

  const fetchEventById = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const event = await getEventById(id)
      dispatch({ type: 'SET_SELECTED_EVENT', payload: event })
    } catch (error: any) {
      const message = error.message || 'Failed to fetch event'
      dispatch({ type: 'SET_ERROR', payload: message })
    }
  }, [])

  const addEvent = useCallback(
    async (eventData: any) => {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      try {
        const newEvent = await createEvent(eventData)
        dispatch({ type: 'ADD_EVENT', payload: newEvent })
        await fetchEvents()
        return newEvent
      } catch (error: any) {
        const message = error.message || 'Failed to create event'
        dispatch({ type: 'SET_ERROR', payload: message })
        throw error
      }
    },
    [fetchEvents]
  )

  const joinEventHandler = useCallback(async (eventId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const updatedEvent = await joinEvent(eventId)
      dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent })
      return updatedEvent
    } catch (error: any) {
      const message = error.message || 'Failed to join event'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }, [])

  const leaveEventHandler = useCallback(async (eventId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const updatedEvent = await leaveEvent(eventId)
      dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent })
      return updatedEvent
    } catch (error: any) {
      const message = error.message || 'Failed to leave event'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }, [])

  const setFilters = useCallback(
    async (filters: EventContextFilters) => {
      dispatch({ type: 'SET_FILTERS', payload: filters })
      await fetchEvents(filters)
    },
    [fetchEvents]
  )

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' })
  }, [])

  return (
    <EventContext.Provider
      value={{
        state,
        fetchEvents,
        fetchEventById,
        addEvent,
        joinEvent: joinEventHandler,
        leaveEvent: leaveEventHandler,
        setFilters,
        clearFilters,
      }}
    >
      {children}
    </EventContext.Provider>
  )
}

export function useEventContext() {
  const context = useContext(EventContext)
  if (!context) {
    throw new Error('useEventContext must be used within EventProvider')
  }
  return context
}
