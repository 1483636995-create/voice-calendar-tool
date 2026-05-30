# PR 11: Voice Delete Event Flow

## Scope

- Connect parsed delete intents to the shared event delete API.
- Support commands such as `删除明天下午三点项目会`.
- Match delete targets by title and parsed date/time.
- Require explicit confirmation before deleting a matched event.
- Show multiple candidates without deleting when the command is ambiguous.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- Add an event with `明天下午三点项目会`.
- Enter `删除明天下午三点项目会`; the assistant should ask for confirmation.
- Enter `确认删除`; the matched event should be removed from schedule lists and reminders.
- Enter `取消` after a delete preview; the event should stay unchanged.
- Create multiple similar events and verify the assistant asks for a more specific command instead of deleting.
