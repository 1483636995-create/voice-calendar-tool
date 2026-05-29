# PR 5: Chinese Time Parser

## Scope

- Add a reusable Chinese natural-language time parser.
- Support relative time such as `半小时后`, `30分钟后`, and `2小时后`.
- Support day words such as `今天`, `明天`, `后天`, and `大后天`.
- Support weekday expressions such as `周六`, `本周日`, and `下周一`.
- Support clock expressions such as `下午三点`, `晚上8点15`, `9:30`, `三点半`, `三点一刻`, and `三点三刻`.
- Add date-range parsing for schedule query flows.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- Parser smoke checks should cover add-event examples and query-range examples.

## Smoke Cases

Reference time: `2026-05-29 10:00 +08:00`.

- `明天下午三点提醒我开会` -> `2026-05-30 15:00 +08:00`
- `半小时后喝水` -> `2026-05-29 10:30 +08:00`
- `周日上午九点` -> `2026-05-31 09:00 +08:00`
- `下周一晚上8点15` -> `2026-06-01 20:15 +08:00`
- `三点半开会` -> missing date, parsed as the next available `03:30`
- `查看今天安排` -> today range
- `查看本周日程` -> current week range
- `查看下周安排` -> next week range
