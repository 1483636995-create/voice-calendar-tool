# PR 3: Backend API

## Scope

- Add an Express backend under `server/`.
- Add REST endpoints for event CRUD operations.
- Validate request bodies and query parameters with Zod.
- Persist events to `server/data/events.json`.
- Add backend build and start scripts.

## API

- `GET /api/health`
- `GET /api/events`
- `GET /api/events?from=...&to=...&status=scheduled`
- `POST /api/events`
- `PATCH /api/events/:eventId`
- `DELETE /api/events/:eventId`

## Manual Test Notes

- `npm run lint` should pass.
- `npm run server:build` should pass.
- `npm run build` should pass.
- Start the server with `npm run server:start`.
- `GET http://127.0.0.1:4000/api/health` should return `{ "ok": true }`.
- Create, list, update and delete event requests should read and write `server/data/events.json`.
