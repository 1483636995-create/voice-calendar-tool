import cors from 'cors'
import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import { eventsRouter } from './routes/events.js'
import { HttpError } from './utils/http.js'

const app = express()
const port = Number(process.env.PORT ?? 4000)
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://1483636995-create.github.io',
]

const getAllowedOrigins = (): string[] => {
  return (
    process.env.CORS_ALLOWED_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? defaultAllowedOrigins
  )
}

const requireApiKey: RequestHandler = (request, _response, next) => {
  const apiKey = process.env.API_KEY?.trim()

  if (!apiKey) {
    next()
    return
  }

  if (request.header('x-demo-api-key') !== apiKey) {
    next(new HttpError(401, 'invalid api key'))
    return
  }

  next()
}

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = getAllowedOrigins()

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new HttpError(403, 'origin not allowed'))
    },
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'voice-calendar-api',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/events', requireApiKey, eventsRouter)

const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new HttpError(404, 'route not found'))
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message })
    return
  }

  console.error(error)
  response.status(500).json({ error: 'internal server error' })
}

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(port, () => {
  console.log(`Voice Calendar API listening on http://127.0.0.1:${port}`)
})
