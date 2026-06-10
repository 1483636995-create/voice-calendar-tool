import type {
  CalendarEvent,
  CalendarEventStatus,
  CreateCalendarEventInput,
  EventDateRange,
  EventMutationResult,
  UpdateCalendarEventInput,
} from '../types/calendar'

export const EVENT_STORAGE_KEY = 'voice-calendar-tool:events'

type EventStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const DEFAULT_EVENT_STATUS: CalendarEventStatus = 'scheduled'
const TITLE_MAX_LENGTH = 80
const OPTIONAL_TEXT_MAX_LENGTH = 500

const getBrowserStorage = (): EventStorage | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.localStorage
}

const normalizeDate = (value: Date | string, fieldName: string): string => {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`)
  }

  return date.toISOString()
}

const normalizeOptionalDate = (
  value: Date | string | null | undefined,
  fieldName: string,
): string | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  return normalizeDate(value, fieldName)
}

const ensureFutureStartAt = (startAt: string, now: Date): void => {
  if (new Date(startAt).getTime() < now.getTime()) {
    throw new Error('预约时间不能早于当前时间')
  }
}

const normalizeTitle = (title: string): string => {
  const normalizedTitle = title.trim()

  if (!normalizedTitle) {
    throw new Error('event title cannot be empty')
  }

  if (normalizedTitle.length > TITLE_MAX_LENGTH) {
    throw new Error(`event title cannot be longer than ${TITLE_MAX_LENGTH} characters`)
  }

  return normalizedTitle
}

const normalizeOptionalText = (value: string | null | undefined): string | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  const normalizedValue = value.trim()

  if (normalizedValue.length > OPTIONAL_TEXT_MAX_LENGTH) {
    throw new Error(`event text cannot be longer than ${OPTIONAL_TEXT_MAX_LENGTH} characters`)
  }

  return normalizedValue || undefined
}

const normalizeReminder = (value: number | null | undefined): number | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new Error('reminderMinutesBefore must be a non-negative number')
  }

  return Math.round(value)
}

const createEventId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `event-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const isCalendarEventStatus = (value: unknown): value is CalendarEventStatus => {
  return value === 'scheduled' || value === 'completed' || value === 'cancelled'
}

const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

export const isCalendarEvent = (value: unknown): value is CalendarEvent => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<CalendarEvent>

  return (
    isString(candidate.id) &&
    isString(candidate.title) &&
    isString(candidate.startAt) &&
    isCalendarEventStatus(candidate.status) &&
    isString(candidate.createdAt) &&
    isString(candidate.updatedAt) &&
    !Number.isNaN(new Date(candidate.startAt).getTime())
  )
}

export const sortEventsByStartTime = (events: CalendarEvent[]): CalendarEvent[] => {
  return [...events].sort((eventA, eventB) => {
    return new Date(eventA.startAt).getTime() - new Date(eventB.startAt).getTime()
  })
}

export const createCalendarEvent = (
  input: CreateCalendarEventInput,
  now: Date = new Date(),
): CalendarEvent => {
  const createdAt = now.toISOString()
  const startAt = normalizeDate(input.startAt, 'startAt')

  ensureFutureStartAt(startAt, now)

  return {
    id: createEventId(),
    title: normalizeTitle(input.title),
    startAt,
    endAt: normalizeOptionalDate(input.endAt, 'endAt'),
    reminderMinutesBefore: normalizeReminder(input.reminderMinutesBefore),
    note: normalizeOptionalText(input.note),
    sourceText: normalizeOptionalText(input.sourceText),
    status: input.status ?? DEFAULT_EVENT_STATUS,
    createdAt,
    updatedAt: createdAt,
  }
}

export const loadEvents = (storage: EventStorage | undefined = getBrowserStorage()): CalendarEvent[] => {
  if (!storage) {
    return []
  }

  const rawEvents = storage.getItem(EVENT_STORAGE_KEY)

  if (!rawEvents) {
    return []
  }

  try {
    const parsedEvents = JSON.parse(rawEvents)

    if (!Array.isArray(parsedEvents)) {
      storage.removeItem(EVENT_STORAGE_KEY)
      return []
    }

    return sortEventsByStartTime(parsedEvents.filter(isCalendarEvent))
  } catch {
    storage.removeItem(EVENT_STORAGE_KEY)
    return []
  }
}

export const saveEvents = (
  events: CalendarEvent[],
  storage: EventStorage | undefined = getBrowserStorage(),
): CalendarEvent[] => {
  const nextEvents = sortEventsByStartTime(events)

  if (storage) {
    storage.setItem(EVENT_STORAGE_KEY, JSON.stringify(nextEvents))
  }

  return nextEvents
}

export const addEvent = (
  input: CreateCalendarEventInput,
  storage: EventStorage | undefined = getBrowserStorage(),
): EventMutationResult => {
  const event = createCalendarEvent(input)
  const events = saveEvents([...loadEvents(storage), event], storage)

  return { event, events }
}

export const updateEvent = (
  eventId: string,
  input: UpdateCalendarEventInput,
  storage: EventStorage | undefined = getBrowserStorage(),
): EventMutationResult | undefined => {
  const events = loadEvents(storage)
  const eventToUpdate = events.find((event) => event.id === eventId)

  if (!eventToUpdate) {
    return undefined
  }

  const updatedEvent: CalendarEvent = {
    ...eventToUpdate,
    title: input.title === undefined ? eventToUpdate.title : normalizeTitle(input.title),
    startAt:
      input.startAt === undefined
        ? eventToUpdate.startAt
        : normalizeDate(input.startAt, 'startAt'),
    endAt:
      input.endAt === undefined
        ? eventToUpdate.endAt
        : normalizeOptionalDate(input.endAt, 'endAt'),
    reminderMinutesBefore:
      input.reminderMinutesBefore === undefined
        ? eventToUpdate.reminderMinutesBefore
        : normalizeReminder(input.reminderMinutesBefore),
    note: input.note === undefined ? eventToUpdate.note : normalizeOptionalText(input.note),
    sourceText:
      input.sourceText === undefined
        ? eventToUpdate.sourceText
        : normalizeOptionalText(input.sourceText),
    status: input.status ?? eventToUpdate.status,
    updatedAt: new Date().toISOString(),
  }

  const nextEvents = saveEvents(
    events.map((event) => (event.id === eventId ? updatedEvent : event)),
    storage,
  )

  return { event: updatedEvent, events: nextEvents }
}

export const deleteEvent = (
  eventId: string,
  storage: EventStorage | undefined = getBrowserStorage(),
): { event?: CalendarEvent; events: CalendarEvent[] } => {
  const events = loadEvents(storage)
  const eventToDelete = events.find((event) => event.id === eventId)
  const nextEvents = saveEvents(
    events.filter((event) => event.id !== eventId),
    storage,
  )

  return { event: eventToDelete, events: nextEvents }
}

export const clearEvents = (storage: EventStorage | undefined = getBrowserStorage()): void => {
  storage?.removeItem(EVENT_STORAGE_KEY)
}

export const filterEventsByRange = (
  events: CalendarEvent[],
  range: EventDateRange = {},
): CalendarEvent[] => {
  const fromTime = range.from ? new Date(range.from).getTime() : undefined
  const toTime = range.to ? new Date(range.to).getTime() : undefined
  const statuses = Array.isArray(range.status)
    ? range.status
    : range.status
      ? [range.status]
      : undefined

  return sortEventsByStartTime(
    events.filter((event) => {
      const eventTime = new Date(event.startAt).getTime()
      const matchesStart = fromTime === undefined || eventTime >= fromTime
      const matchesEnd = toTime === undefined || eventTime < toTime
      const matchesStatus = !statuses || statuses.includes(event.status)

      return matchesStart && matchesEnd && matchesStatus
    }),
  )
}

export const queryEvents = (
  range: EventDateRange = {},
  storage: EventStorage | undefined = getBrowserStorage(),
): CalendarEvent[] => {
  return filterEventsByRange(loadEvents(storage), range)
}
