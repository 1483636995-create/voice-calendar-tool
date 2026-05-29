import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createEvent as createApiEvent,
  deleteEvent as deleteApiEvent,
  fetchEvents,
  updateEvent as updateApiEvent,
} from '../api/eventApi'
import {
  addEvent as addStoredEvent,
  clearEvents as clearStoredEvents,
  deleteEvent as deleteStoredEvent,
  filterEventsByRange,
  loadEvents,
  saveEvents,
  updateEvent as updateStoredEvent,
} from '../lib/eventStorage'
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  EventDateRange,
  UpdateCalendarEventInput,
} from '../types/calendar'

export type EventDataSource = 'api' | 'local'

export interface UseEventsResult {
  events: CalendarEvent[]
  scheduledEvents: CalendarEvent[]
  isLoading: boolean
  dataSource: EventDataSource
  errorMessage?: string
  addEvent: (input: CreateCalendarEventInput) => Promise<CalendarEvent>
  updateEvent: (eventId: string, input: UpdateCalendarEventInput) => Promise<CalendarEvent | undefined>
  deleteEvent: (eventId: string) => Promise<CalendarEvent | undefined>
  clearEvents: () => Promise<void>
  queryEvents: (range?: EventDateRange) => CalendarEvent[]
  refreshEvents: () => Promise<void>
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback
}

export const useEvents = (): UseEventsResult => {
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents())
  const [isLoading, setIsLoading] = useState(true)
  const [dataSource, setDataSource] = useState<EventDataSource>('local')
  const [errorMessage, setErrorMessage] = useState<string>()

  const syncApiEvents = useCallback(async () => {
    setIsLoading(true)

    try {
      const apiEvents = await fetchEvents()
      const nextEvents = saveEvents(apiEvents)
      setEvents(nextEvents)
      setDataSource('api')
      setErrorMessage(undefined)
    } catch (error) {
      const localEvents = loadEvents()
      setEvents(localEvents)
      setDataSource('local')
      setErrorMessage(getErrorMessage(error, '无法连接后端 API'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshEvents = useCallback(async () => {
    await syncApiEvents()
  }, [syncApiEvents])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void syncApiEvents()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [syncApiEvents])

  const refreshLocalEvents = useCallback(() => {
    setEvents(loadEvents())
  }, [])

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null || event.key === 'voice-calendar-tool:events') {
        refreshLocalEvents()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [refreshLocalEvents])

  const addEvent = useCallback(async (input: CreateCalendarEventInput) => {
    try {
      const result = await createApiEvent(input)
      const nextEvents = saveEvents(result.events)
      setEvents(nextEvents)
      setDataSource('api')
      setErrorMessage(undefined)
      return result.event
    } catch (error) {
      const result = addStoredEvent(input)
      setEvents(result.events)
      setDataSource('local')
      setErrorMessage(getErrorMessage(error, '已使用本地存储保存事件'))
      return result.event
    }
  }, [])

  const updateEvent = useCallback(async (eventId: string, input: UpdateCalendarEventInput) => {
    try {
      const result = await updateApiEvent(eventId, input)
      const nextEvents = saveEvents(result.events)
      setEvents(nextEvents)
      setDataSource('api')
      setErrorMessage(undefined)
      return result.event
    } catch (error) {
      const result = updateStoredEvent(eventId, input)

      if (!result) {
        setErrorMessage(getErrorMessage(error, '事件不存在'))
        return undefined
      }

      setEvents(result.events)
      setDataSource('local')
      setErrorMessage(getErrorMessage(error, '已使用本地存储更新事件'))
      return result.event
    }
  }, [])

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const result = await deleteApiEvent(eventId)
      const nextEvents = saveEvents(result.events)
      setEvents(nextEvents)
      setDataSource('api')
      setErrorMessage(undefined)
      return result.event
    } catch (error) {
      const result = deleteStoredEvent(eventId)
      setEvents(result.events)
      setDataSource('local')
      setErrorMessage(getErrorMessage(error, '已使用本地存储删除事件'))
      return result.event
    }
  }, [])

  const clearEvents = useCallback(async () => {
    if (dataSource === 'api') {
      await Promise.all(events.map((event) => deleteApiEvent(event.id).catch(() => undefined)))
    }

    clearStoredEvents()
    setEvents([])
  }, [dataSource, events])

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
    isLoading,
    dataSource,
    errorMessage,
    addEvent,
    updateEvent,
    deleteEvent,
    clearEvents,
    queryEvents,
    refreshEvents,
  }
}
