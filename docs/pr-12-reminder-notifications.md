# PR 12: Reminder Notifications

## Scope

- Add reminder scheduling based on event start time and `reminderMinutesBefore`.
- Show upcoming reminders in the reminder center instead of raw scheduled events.
- Add browser notification permission controls.
- Trigger an in-page reminder and speech announcement when a reminder becomes due.
- Keep an in-page fallback when browser notifications are unsupported or denied.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- Create an event due soon, such as `半小时后开会`.
- The reminder center should list the upcoming reminder.
- Create or edit an event with an explicit lead time, such as `明天下午三点项目会提前10分钟提醒`.
- If notification permission is granted, the browser should show a notification when the reminder becomes due.
- If notification permission is denied or unsupported, the in-page reminder should still appear.
