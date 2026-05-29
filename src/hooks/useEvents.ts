import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addEvent as addStoredEvent,
  clearEvents as clearStoredEvents,
  deleteEvent as deleteStoredEvent,
  filterEventsByRange,
  loadEvents,
  updateEvent as updateStoredEvent,
} from '../lib/eventStorage'
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  EventDateRange,
  UpdateCalendarEventInput,
} from '../types/calendar'

export interface UseEventsResult {
  events: CalendarEvent[]
  scheduledEvents: CalendarEvent[]
  addEvent: (input: CreateCalendarEventInput) => CalendarEvent
  updateEvent: (eventId: string, input: UpdateCalendarEventInput) => CalendarEvent | undefined
  deleteEvent: (eventId: string) => CalendarEvent | undefined
  clearEvents: () => void
  queryEvents: (range?: EventDateRange) => CalendarEvent[]
  refreshEvents: () => void
}

export const useEvents = (): UseEventsResult => {
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents())

  const refreshEvents = useCallback(() => {
    setEvents(loadEvents())
  }, [])

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null || event.key === 'voice-calendar-tool:events') {
        refreshEvents()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [refreshEvents])

  const addEvent = useCallback((input: CreateCalendarEventInput) => {
    const result = addStoredEvent(input)
    setEvents(result.events)
    return result.event
  }, [])

  const updateEvent = useCallback((eventId: string, input: UpdateCalendarEventInput) => {
    const result = updateStoredEvent(eventId, input)

    if (!result) {
      return undefined
    }

    setEvents(result.events)
    return result.event
  }, [])

  const deleteEvent = useCallback((eventId: string) => {
    const result = deleteStoredEvent(eventId)
    setEvents(result.events)
    return result.event
  }, [])

  const clearEvents = useCallback(() => {
    clearStoredEvents()
    setEvents([])
  }, [])

  const queryEvents = useCallback(
    (range: EventDateRange = {}) => filterEventsByRange(events, range),
    [events],
  )

  const scheduledEvents = useMemo(() => {
    return filterEventsByRange(events, { status: 'scheduled' })
  }, [events])

  return {
    events,
    scheduledEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    clearEvents,
    queryEvents,
    refreshEvents,
  }
}
