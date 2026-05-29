import { Router } from 'express'
import { ZodError } from 'zod'
import { createEventSchema, eventQuerySchema, updateEventSchema } from '../schemas/eventSchema.js'
import { createEvent, deleteEvent, queryEvents, updateEvent } from '../services/eventStore.js'
import { asyncHandler, HttpError } from '../utils/http.js'

export const eventsRouter = Router()

const parseRequest = <Result>(parser: { parse: (value: unknown) => Result }, value: unknown): Result => {
  try {
    return parser.parse(value)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HttpError(400, error.issues.map((issue) => issue.message).join('; '))
    }

    throw error
  }
}

const getEventId = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'eventId is required')
  }

  return value
}

eventsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = parseRequest(eventQuerySchema, request.query)
    const events = await queryEvents(query)

    response.json({ events })
  }),
)

eventsRouter.post(
  '/',
  asyncHandler(async (request, response) => {
    const input = parseRequest(createEventSchema, request.body)
    const result = await createEvent(input)

    response.status(201).json(result)
  }),
)

eventsRouter.patch(
  '/:eventId',
  asyncHandler(async (request, response) => {
    const input = parseRequest(updateEventSchema, request.body)
    const result = await updateEvent(getEventId(request.params.eventId), input)

    response.json(result)
  }),
)

eventsRouter.delete(
  '/:eventId',
  asyncHandler(async (request, response) => {
    const result = await deleteEvent(getEventId(request.params.eventId))

    response.json(result)
  }),
)
