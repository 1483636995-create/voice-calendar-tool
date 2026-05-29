import type {
  CalendarEvent,
  CreateCalendarEventInput,
  EventDateRange,
  UpdateCalendarEventInput,
} from '../types/calendar'

interface EventListResponse {
  events: CalendarEvent[]
}

interface EventMutationResponse {
  event: CalendarEvent
  events: CalendarEvent[]
}

interface ApiErrorResponse {
  error?: string
}

export class EventApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

const getApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL
  const baseUrl = configuredUrl || 'http://127.0.0.1:4000/api'

  return baseUrl.replace(/\/$/, '')
}

const normalizeDateParam = (value: Date | string): string => {
  return value instanceof Date ? value.toISOString() : value
}

const buildEventQuery = (range: EventDateRange = {}): string => {
  const searchParams = new URLSearchParams()

  if (range.from) {
    searchParams.set('from', normalizeDateParam(range.from))
  }

  if (range.to) {
    searchParams.set('to', normalizeDateParam(range.to))
  }

  if (Array.isArray(range.status)) {
    range.status.forEach((status) => searchParams.append('status', status))
  } else if (range.status) {
    searchParams.set('status', range.status)
  }

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

const normalizeEventInput = (
  input: CreateCalendarEventInput | UpdateCalendarEventInput,
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (value instanceof Date) {
        return [key, value.toISOString()]
      }

      return [key, value]
    }),
  )
}

const requestJson = async <Result>(path: string, init?: RequestInit): Promise<Result> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  const body = (await response.json().catch(() => ({}))) as ApiErrorResponse

  if (!response.ok) {
    throw new EventApiError(response.status, body.error || 'API request failed')
  }

  return body as Result
}

export const fetchEvents = async (range: EventDateRange = {}): Promise<CalendarEvent[]> => {
  const response = await requestJson<EventListResponse>(`/events${buildEventQuery(range)}`)
  return response.events
}

export const createEvent = async (
  input: CreateCalendarEventInput,
): Promise<EventMutationResponse> => {
  return requestJson('/events', {
    method: 'POST',
    body: JSON.stringify(normalizeEventInput(input)),
  })
}

export const updateEvent = async (
  eventId: string,
  input: UpdateCalendarEventInput,
): Promise<EventMutationResponse> => {
  return requestJson(`/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(normalizeEventInput(input)),
  })
}

export const deleteEvent = async (eventId: string): Promise<EventMutationResponse> => {
  return requestJson(`/events/${eventId}`, {
    method: 'DELETE',
  })
}
