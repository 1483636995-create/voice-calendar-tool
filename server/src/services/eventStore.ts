import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  CalendarEvent,
  CalendarEventStatus,
  CreateCalendarEventInput,
  EventQuery,
  UpdateCalendarEventInput,
} from '../types/calendar.js'
import { HttpError } from '../utils/http.js'

const DEFAULT_STATUS: CalendarEventStatus = 'scheduled'
const DEFAULT_DATA_FILE = path.resolve(process.cwd(), 'server/data/events.json')

const getDataFilePath = (): string => {
  return process.env.EVENT_DATA_FILE ?? DEFAULT_DATA_FILE
}

const normalizeDate = (value: string, fieldName: string): string => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${fieldName} must be a valid date`)
  }

  return date.toISOString()
}

const normalizeOptionalText = (value: string | null | undefined): string | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  const normalizedValue = value.trim()
  return normalizedValue || undefined
}

const normalizeReminder = (value: number | null | undefined): number | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new HttpError(400, 'reminderMinutesBefore must be a non-negative number')
  }

  return Math.round(value)
}

const isCalendarEventStatus = (value: unknown): value is CalendarEventStatus => {
  return value === 'scheduled' || value === 'completed' || value === 'cancelled'
}

const isCalendarEvent = (value: unknown): value is CalendarEvent => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<CalendarEvent>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.startAt === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    isCalendarEventStatus(candidate.status) &&
    !Number.isNaN(new Date(candidate.startAt).getTime())
  )
}

const sortEvents = (events: CalendarEvent[]): CalendarEvent[] => {
  return [...events].sort((eventA, eventB) => {
    return new Date(eventA.startAt).getTime() - new Date(eventB.startAt).getTime()
  })
}

const ensureDataFile = async (): Promise<void> => {
  const dataFile = getDataFilePath()
  await mkdir(path.dirname(dataFile), { recursive: true })

  try {
    await readFile(dataFile, 'utf-8')
  } catch {
    await writeFile(dataFile, '[]\n', 'utf-8')
  }
}

const writeEvents = async (events: CalendarEvent[]): Promise<CalendarEvent[]> => {
  const nextEvents = sortEvents(events)
  await mkdir(path.dirname(getDataFilePath()), { recursive: true })
  await writeFile(getDataFilePath(), `${JSON.stringify(nextEvents, null, 2)}\n`, 'utf-8')
  return nextEvents
}

export const readEvents = async (): Promise<CalendarEvent[]> => {
  await ensureDataFile()

  try {
    const rawEvents = await readFile(getDataFilePath(), 'utf-8')
    const parsedEvents = JSON.parse(rawEvents)

    if (!Array.isArray(parsedEvents)) {
      await writeEvents([])
      return []
    }

    return sortEvents(parsedEvents.filter(isCalendarEvent))
  } catch {
    await writeEvents([])
    return []
  }
}

let mutationQueue: Promise<unknown> = Promise.resolve()

const runMutation = async <Result>(mutation: () => Promise<Result>): Promise<Result> => {
  const queuedMutation = mutationQueue.then(mutation, mutation)
  mutationQueue = queuedMutation.catch(() => undefined)
  return queuedMutation
}

const createEventRecord = (input: CreateCalendarEventInput, now: Date = new Date()): CalendarEvent => {
  const createdAt = now.toISOString()

  return {
    id: randomUUID(),
    title: input.title.trim(),
    startAt: normalizeDate(input.startAt, 'startAt'),
    endAt: input.endAt ? normalizeDate(input.endAt, 'endAt') : undefined,
    reminderMinutesBefore: normalizeReminder(input.reminderMinutesBefore),
    note: normalizeOptionalText(input.note),
    sourceText: normalizeOptionalText(input.sourceText),
    status: input.status ?? DEFAULT_STATUS,
    createdAt,
    updatedAt: createdAt,
  }
}

export const queryEvents = async (query: EventQuery = {}): Promise<CalendarEvent[]> => {
  const events = await readEvents()
  const fromTime = query.from ? new Date(query.from).getTime() : undefined
  const toTime = query.to ? new Date(query.to).getTime() : undefined
  const statuses = Array.isArray(query.status)
    ? query.status
    : query.status
      ? [query.status]
      : undefined

  return sortEvents(
    events.filter((event) => {
      const eventTime = new Date(event.startAt).getTime()
      const matchesFrom = fromTime === undefined || eventTime >= fromTime
      const matchesTo = toTime === undefined || eventTime < toTime
      const matchesStatus = !statuses || statuses.includes(event.status)

      return matchesFrom && matchesTo && matchesStatus
    }),
  )
}

export const createEvent = async (
  input: CreateCalendarEventInput,
): Promise<{ event: CalendarEvent; events: CalendarEvent[] }> => {
  return runMutation(async () => {
    const events = await readEvents()
    const event = createEventRecord(input)
    const nextEvents = await writeEvents([...events, event])

    return { event, events: nextEvents }
  })
}

export const updateEvent = async (
  eventId: string,
  input: UpdateCalendarEventInput,
): Promise<{ event: CalendarEvent; events: CalendarEvent[] }> => {
  return runMutation(async () => {
    const events = await readEvents()
    const eventToUpdate = events.find((event) => event.id === eventId)

    if (!eventToUpdate) {
      throw new HttpError(404, 'event not found')
    }

    const updatedEvent: CalendarEvent = {
      ...eventToUpdate,
      title: input.title === undefined ? eventToUpdate.title : input.title.trim(),
      startAt:
        input.startAt === undefined ? eventToUpdate.startAt : normalizeDate(input.startAt, 'startAt'),
      endAt:
        input.endAt === undefined
          ? eventToUpdate.endAt
          : input.endAt === null
            ? undefined
            : normalizeDate(input.endAt, 'endAt'),
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

    const nextEvents = await writeEvents(
      events.map((event) => (event.id === eventId ? updatedEvent : event)),
    )

    return { event: updatedEvent, events: nextEvents }
  })
}

export const deleteEvent = async (
  eventId: string,
): Promise<{ event: CalendarEvent; events: CalendarEvent[] }> => {
  return runMutation(async () => {
    const events = await readEvents()
    const eventToDelete = events.find((event) => event.id === eventId)

    if (!eventToDelete) {
      throw new HttpError(404, 'event not found')
    }

    const nextEvents = await writeEvents(events.filter((event) => event.id !== eventId))
    return { event: eventToDelete, events: nextEvents }
  })
}
