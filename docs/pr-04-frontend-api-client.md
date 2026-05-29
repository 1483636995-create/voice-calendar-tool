# PR 4: Frontend API Client

## Scope

- Add a typed frontend REST client for the backend event API.
- Update `useEvents()` to load and mutate events through the API first.
- Keep LocalStorage as a fallback when the backend is unavailable.
- Show the current data source in the app header.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- Start the backend with `npm run server:start`.
- The frontend should show `后端 API 已连接` when the API is reachable.
- If the backend is stopped, the hook should keep rendering cached LocalStorage events and switch to local fallback mode.
