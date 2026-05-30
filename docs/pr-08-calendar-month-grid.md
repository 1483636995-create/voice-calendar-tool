# PR 8: Calendar Month Grid Fix

## Scope

- Fix month grid generation so months that span six calendar rows show all dates.
- Keep leading and trailing muted days for complete week rows.
- Verify May 2026 renders May 31 instead of stopping at May 30.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- `getCalendarMonthDays(new Date(2026, 4, 30))` from `src/lib/calendarGrid.ts` should return 42 cells.
- The May 2026 grid should include May 31 and trailing June dates.
