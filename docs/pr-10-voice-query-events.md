# PR 10: Voice Query Event Flow

## Scope

- Connect parsed query intents to the shared event query API.
- Support commands such as `查看今天安排`, `明天有什么事` and `播报本周日程`.
- Show a spoken-friendly schedule summary in the assistant reply.
- Render matching events in the voice panel so the query result is visible immediately.
- Keep query results scoped to scheduled events.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- Add an event with `明天下午三点项目会`.
- Enter `查看明天安排`; the assistant should show and speak the matching event.
- Enter `播报本周日程`; the assistant should summarize this week's scheduled events.
- Enter a range with no events; the assistant should say that there are no arrangements.
