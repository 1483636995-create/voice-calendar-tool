# PR 2: App Layout

## Scope

- Replace the default Vite starter page with the voice calendar workspace.
- Add reusable UI components for the voice panel, calendar summary, event list and reminder center.
- Connect the layout to the existing `useEvents()` hook so later voice flows can reuse the same data source.
- Add `lucide-react` for consistent interface icons.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- The app should open directly into the calendar tool UI.
- Empty event states should render without layout shifts.
- The layout should remain usable on desktop and mobile widths.
