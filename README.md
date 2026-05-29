# Voice Calendar Tool

语音版日历工具，面向日常日程管理场景，目标是让用户通过自然语言语音完成事件添加、查看、删除和提醒管理。

## 项目目标

- 用语音作为核心入口，减少手动填写日历的步骤。
- 支持中文自然语言时间表达，例如“明天下午三点”“半小时后”“本周日”。
- 在关键操作前提供确认，降低误识别导致的误添加或误删风险。
- 通过页面列表、日历视图、浏览器通知和语音播报形成完整提醒闭环。

## 计划功能

- 语音添加事件：识别标题、日期、时间和提醒需求。
- 语音查看日程：支持查看今天、明天、本周和全部安排。
- 语音删除事件：按标题和时间匹配候选事件，确认后删除。
- 事件提醒：到点弹出页面提醒、浏览器通知，并进行语音播报。
- 多轮澄清：当语音指令缺少时间或标题时继续追问。
- 冲突检测：添加事件前提示同一时间段的已有安排。

## 技术栈

- React
- TypeScript
- Vite
- Lucide React
- Node.js
- Express
- Zod
- Web Speech API
- Browser Notification API
- LocalStorage

## 本地运行

前端开发服务：

```bash
npm install
npm run dev
```

后端 API 服务：

```bash
npm run server:dev
```

默认前端地址：

```text
http://127.0.0.1:5173/
```

默认 API 地址：

```text
http://127.0.0.1:4000/api
```

## 后端 API

- `GET /api/health`
- `GET /api/events`
- `GET /api/events?from=...&to=...&status=scheduled`
- `POST /api/events`
- `PATCH /api/events/:eventId`
- `DELETE /api/events/:eventId`

## 开发记录

本项目按照比赛要求采用持续迭代方式开发。每个 PR 尽量只包含一个独立功能，并在 PR 描述中说明功能、实现思路和测试方式。

### 当前进度

- PR 1：事件数据模型与本地存储。
- PR 2：语音日历工具主界面。
- PR 3：后端 API 服务与文件持久化。

## Demo

Demo 视频链接将在作品完成后补充到这里。
