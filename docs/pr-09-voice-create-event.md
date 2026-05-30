# PR 9: Voice Create Event Flow

## Scope

- Connect parsed create-event voice intents to the shared event mutation API.
- Create events from commands such as `明天下午三点项目会`.
- Keep missing-field feedback when the command lacks a title or time.
- Speak success or failure feedback after the creation attempt.
- Disable duplicate input actions while an event is being created.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- Enter `明天下午三点项目会` in the text command box.
- The assistant should confirm that the event was added.
- Event lists, calendar statistics and reminder center should refresh from the same event state.
- Enter an incomplete command such as `提醒我开会`; it should ask for missing time instead of creating an event.
