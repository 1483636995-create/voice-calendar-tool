# PR 1: Event Model And Local Storage

## Scope

- Define the shared calendar event data model.
- Add LocalStorage-backed event persistence.
- Provide reusable add, update, delete, clear, load, save and query helpers.
- Add a React hook so later UI and voice flows can use one event API.

## Manual Test Notes

- `npm run build` should pass.
- `loadEvents()` returns an empty array when no browser storage is available or storage is empty.
- `addEvent()` persists a normalized event with id, title, start time and timestamps.
- `queryEvents()` returns events sorted by `startAt` and can filter by date range or status.
- `updateEvent()` refreshes `updatedAt` and keeps unchanged fields intact.
- `deleteEvent()` removes the selected event and returns the removed event.
