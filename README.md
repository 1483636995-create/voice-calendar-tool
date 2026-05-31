# Voice Calendar Tool

语音版日历工具，面向日常日程管理场景，目标是让用户通过自然语言语音完成事件添加、查看、删除和提醒管理。

## 在线演示与部署

作品仓库地址：

```text
https://github.com/1483636995-create/voice-calendar-tool
```

前端 GitHub Pages 地址：

```text
https://1483636995-create.github.io/voice-calendar-tool/
```

Demo 视频链接：

```text
https://pan.baidu.com/s/1PDG1kk37CUiZpQnZVZykOg?pwd=xt1j
```

提取码：

```text
xt1j
```

在线演示默认使用浏览器本地存储兜底，无需评委配置密钥或环境变量即可体验新增、查看、删除和提醒流程。
如需接入公网后端 API，可在 GitHub 仓库变量中配置 `VITE_API_BASE_URL`，值为后端服务的 `/api` 地址，然后重新运行 Pages 部署工作流。
如果后端启用了 `API_KEY`，还需要配置仓库变量 `VITE_API_KEY`，前端会通过 `x-demo-api-key` 请求头访问 API。

部署方式：

- 前端：GitHub Pages，通过 `.github/workflows/deploy-pages.yml` 自动构建发布。
- API：Express 后端可按 `render.yaml` 部署到 Render；本地开发仍可使用 `npm run server:dev`。
- 在线兜底：如果没有配置 `VITE_API_BASE_URL`，线上页面会自动使用 LocalStorage，保证评委直接打开页面也能完整体验核心流程。
- 公网 API：建议配置 `CORS_ALLOWED_ORIGINS`、`API_KEY` 和持久磁盘；`render.yaml` 已提供对应示例。

## 项目目标

- 用语音作为核心入口，减少手动填写日历的步骤。
- 支持中文自然语言时间表达，例如“明天下午三点”“半小时后”“本周日”。
- 在关键操作前提供确认，降低误识别导致的误添加或误删风险。
- 通过页面列表、日历视图、浏览器通知和语音播报形成完整提醒闭环。

## 核心功能

- 语音添加事件：识别标题、日期、时间和提醒需求。
- 语音查看日程：支持查看今天、明天、本周和全部安排。
- 语音删除事件：按标题和时间匹配候选事件，确认后删除。
- 事件提醒：到点弹出页面提醒、浏览器通知，并进行语音播报。
- 多轮澄清：当语音指令缺少时间或标题时继续追问。
- 冲突检测：添加事件前提示同一时间段的已有安排。
- 手动操作：支持点击日期查看当天日程，并对日程进行二次确认删除。

## 使用示例

可以直接在在线演示页中点击麦克风或使用文本输入框测试以下指令：

```text
明天下午三点项目会议
添加明天
下午三点项目会
查看今天安排
播报本周日程
删除明天下午三点项目会议
确认删除
```

当新增日程缺少标题或具体时间时，系统会继续追问；当新增日程与已有安排冲突时，系统会提示冲突并等待确认。

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

公网部署安全配置：

```text
CORS_ALLOWED_ORIGINS=https://1483636995-create.github.io
API_KEY=<自定义访问密钥>
EVENT_DATA_FILE=/var/data/events.json
```

如果配置了 `API_KEY`，前端 Pages 也需要配置同值的仓库变量 `VITE_API_KEY` 并重新部署。

## 前端数据策略

前端优先通过后端 API 读取和写入日程事件。若后端服务未启动、未配置公网 API 或请求失败，会自动回退到 LocalStorage，保证 Demo 和本地开发时界面仍可使用。

线上演示默认使用 LocalStorage，这意味着日程数据只保存在当前浏览器，不会上传到服务器，也不会被其他评委看到。若启用公网后端，应配置 API Key、CORS 白名单和持久化存储。

## 开发记录

本项目按照比赛要求采用持续迭代方式开发。每个 PR 尽量只包含一个独立功能，并在 PR 描述中说明功能、实现思路和测试方式。

### 当前进度

- PR 1：事件数据模型与本地存储。
- PR 2：语音日历工具主界面。
- PR 3：后端 API 服务与文件持久化。
- PR 4：前端接入后端事件 API。
- PR 5：中文自然语言时间解析。
- PR 6：语音日历指令意图解析。
- PR 7：浏览器语音识别与语音播报。
- PR 8：修复跨六周月份的月历日期显示。
- PR 9：语音新增日程闭环。
- PR 10：语音查看日程闭环。
- PR 11：语音删除日程闭环。
- PR 12：提醒中心与浏览器通知。
- PR 13：GitHub Pages 部署配置。
- PR 14：补充 GitHub Pages 部署配置并确认线上访问。
- PR 15：修复默认提醒与部署安全风险。
- PR 16：支持选择年份和月份查看月历。
- PR 17：补充 PR16 到 README 开发进度。
- PR 18：支持点击日期查看当天日程。
- PR 19：同步 README 开发进度至 PR18。
- PR 20：新增日程时检测时间冲突。
- PR 21：在日历中标记有日程的日期。
- PR 22：支持新增日程多轮澄清。
- PR 23：支持手动取消预约。
- PR 24：点击麦克风时停止当前语音播报。
- PR 25：手动删除日程时增加确认并清除记录。
- PR 26：补充 Demo 视频链接与最终使用示例。

## Demo

Demo 视频链接：

- 百度网盘：https://pan.baidu.com/s/1PDG1kk37CUiZpQnZVZykOg?pwd=xt1j
- 提取码：xt1j
