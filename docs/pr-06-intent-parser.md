# PR 6: Intent Parser

## Scope

- Add a reusable calendar intent parser.
- Recognize create, query, delete and update commands.
- Extract event titles, target times, query ranges and reminder lead time.
- Return missing-field hints for later confirmation and multi-turn dialog flows.

## Supported Examples

- `明天下午三点提醒我开项目会`
- `提醒我半小时后喝水`
- `查看今天的安排`
- `播报本周日程`
- `删除明天下午三点的项目会`
- `把周六上午十点的会议改到下午两点`

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- Smoke checks should verify intent type, extracted title, parsed time and missing-field output.

## Smoke Results

Reference time: `2026-05-30 10:00 +08:00`.

- `明天下午三点提醒我开项目会` -> create, title `项目会`, no missing fields.
- `提醒我半小时后喝水` -> create, title `喝水`, no missing fields.
- `查看今天的安排` -> query, range `今天`.
- `播报本周日程` -> query, range `本周`, voice presentation.
- `删除明天下午三点的项目会` -> delete, title `项目会`.
- `把周六上午十点的会议改到下午两点` -> update, target title `会议`.
- `明天提醒我开会` -> create, title `开会`, missing `time`.
