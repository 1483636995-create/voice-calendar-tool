import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { Mic, MicOff, Send, Volume2 } from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { parseCalendarIntent, type CalendarIntent, type CreateEventIntent } from '../lib/intentParser'
import type { CalendarEvent, CreateCalendarEventInput, EventDateRange } from '../types/calendar'

interface VoicePanelProps {
  onCreateEvent: (input: CreateCalendarEventInput) => Promise<CalendarEvent>
  onDeleteEvent: (eventId: string) => Promise<CalendarEvent | undefined>
  onQueryEvents: (range?: EventDateRange) => CalendarEvent[]
}

const quickCommands = ['查看今天安排', '明天下午三点项目会', '播报本周日程', '删除明天下午三点项目会']

interface PendingDelete {
  event: CalendarEvent
}

interface PendingCreate {
  input: CreateCalendarEventInput
  conflicts: CalendarEvent[]
}

interface PendingCreateClarification {
  commandText: string
  intent: CreateEventIntent
}

const DEFAULT_EVENT_DURATION_MS = 30 * 60 * 1000

const intentLabels: Record<CalendarIntent['type'], string> = {
  create: '添加日程',
  query: '查看日程',
  delete: '删除日程',
  update: '修改日程',
  unknown: '未识别',
}

const missingLabels: Record<string, string> = {
  title: '标题',
  time: '时间',
  target: '目标事件',
  newTime: '新时间',
}

const formatDateTime = (value: Date | string): string => {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const buildIntentSummary = (intent: CalendarIntent): string => {
  if (intent.type === 'create') {
    const title = intent.title ? `“${intent.title}”` : '新的日程'
    const time = intent.dateTime ? formatDateTime(intent.dateTime.startAt) : '待补充时间'
    return `识别为添加日程：${title}，时间 ${time}`
  }

  if (intent.type === 'query') {
    return `识别为查看日程：${intent.dateRange?.label ?? '默认范围'}`
  }

  if (intent.type === 'delete') {
    const target = intent.title ?? intent.dateTime?.matchedText ?? '待确认事件'
    return `识别为删除日程：${target}`
  }

  if (intent.type === 'update') {
    const target = intent.targetTitle ?? intent.targetDateTime?.matchedText ?? '待确认事件'
    const nextTime = intent.newDateTime ? formatDateTime(intent.newDateTime.startAt) : '待补充新时间'
    return `识别为修改日程：${target}，改到 ${nextTime}`
  }

  return '还没有识别到明确的日历指令'
}

const buildCreateEventInput = (
  intent: CalendarIntent,
  commandText: string,
): CreateCalendarEventInput | undefined => {
  if (intent.type !== 'create' || !intent.title || !intent.dateTime || intent.missing.length > 0) {
    return undefined
  }

  return {
    title: intent.title,
    startAt: intent.dateTime.startAt,
    reminderMinutesBefore: intent.reminderMinutesBefore,
    sourceText: commandText,
    status: 'scheduled',
  }
}

const buildCreateSuccessReply = (event: CalendarEvent): string => {
  return `已添加日程：“${event.title}”，时间 ${formatDateTime(event.startAt)}`
}

const buildCreateFailureReply = (error: unknown): string => {
  const reason = error instanceof Error ? error.message : '创建失败'
  return `添加日程失败：${reason}`
}

const buildCreateClarificationReply = (intent: CreateEventIntent): string => {
  const needsTitle = intent.missing.includes('title')
  const needsTime = intent.missing.includes('time')

  if (needsTitle && needsTime) {
    return '我还需要日程标题和具体时间，比如“项目会，明天下午三点”'
  }

  if (needsTitle) {
    const timeText = intent.dateTime ? formatDateTime(intent.dateTime.startAt) : '这个时间'
    return `请补充 ${timeText} 的日程标题`
  }

  if (needsTime) {
    const titleText = intent.title ? `“${intent.title}”` : '这个日程'
    return `请补充${titleText}的具体时间，比如“三点”或“明天下午三点”`
  }

  return '请继续补充日程信息'
}

const getEventStartTime = (event: CalendarEvent | CreateCalendarEventInput): number => {
  return new Date(event.startAt).getTime()
}

const getEventEndTime = (event: CalendarEvent | CreateCalendarEventInput): number => {
  if (event.endAt) {
    return new Date(event.endAt).getTime()
  }

  return getEventStartTime(event) + DEFAULT_EVENT_DURATION_MS
}

const hasTimeOverlap = (
  nextEvent: CreateCalendarEventInput,
  existingEvent: CalendarEvent,
): boolean => {
  const nextStart = getEventStartTime(nextEvent)
  const nextEnd = getEventEndTime(nextEvent)
  const existingStart = getEventStartTime(existingEvent)
  const existingEnd = getEventEndTime(existingEvent)

  return nextStart < existingEnd && nextEnd > existingStart
}

const findCreateConflicts = (
  input: CreateCalendarEventInput,
  events: CalendarEvent[],
): CalendarEvent[] => {
  return events.filter((event) => event.status === 'scheduled' && hasTimeOverlap(input, event))
}

const buildCreateConflictReply = (conflicts: CalendarEvent[]): string => {
  const preview = conflicts.slice(0, 3).map(buildQueryEventLine).join('；')
  const moreText = conflicts.length > 3 ? `；还有 ${conflicts.length - 3} 个冲突日程` : ''
  return `该时段已有安排：${preview}${moreText}。请说“确认添加”继续添加，或说“取消”放弃`
}

const getCreateIntentScore = (intent: CreateEventIntent): number => {
  return Number(Boolean(intent.title)) + Number(Boolean(intent.dateTime)) + (2 - intent.missing.length)
}

const getClarifiedCreateIntent = (
  pendingClarification: PendingCreateClarification,
  nextText: string,
): PendingCreateClarification => {
  const candidateTexts = [
    `${pendingClarification.commandText} ${nextText}`,
    `${nextText} ${pendingClarification.commandText}`,
    [
      pendingClarification.intent.dateTime?.matchedText,
      nextText,
      pendingClarification.intent.title,
    ].filter(Boolean).join(' '),
    [
      pendingClarification.intent.title,
      pendingClarification.intent.dateTime?.matchedText,
      nextText,
    ].filter(Boolean).join(' '),
  ].filter((value, index, values) => value.trim() && values.indexOf(value) === index)

  const candidates = candidateTexts
    .map((commandText) => {
      const intent = parseCalendarIntent(commandText)
      return intent.type === 'create' ? { commandText, intent } : undefined
    })
    .filter((candidate): candidate is PendingCreateClarification => Boolean(candidate))

  return candidates.reduce<PendingCreateClarification>(
    (bestCandidate, candidate) => {
      const candidateScore = getCreateIntentScore(candidate.intent)
      const bestScore = getCreateIntentScore(bestCandidate.intent)

      if (candidate.intent.missing.length < bestCandidate.intent.missing.length) {
        return candidate
      }

      if (candidate.intent.missing.length === bestCandidate.intent.missing.length && candidateScore > bestScore) {
        return candidate
      }

      return bestCandidate
    },
    pendingClarification,
  )
}

const getQueryLabel = (intent: CalendarIntent): string => {
  if (intent.type !== 'query') {
    return '日程'
  }

  return intent.dateRange?.label ?? '全部日程'
}

const buildQueryRange = (intent: CalendarIntent): EventDateRange | undefined => {
  if (intent.type !== 'query') {
    return undefined
  }

  return {
    from: intent.dateRange?.from,
    to: intent.dateRange?.to,
    status: 'scheduled',
  }
}

const buildQueryEventLine = (event: CalendarEvent, index: number): string => {
  return `${index + 1}. ${formatDateTime(event.startAt)} ${event.title}`
}

const buildQueryReply = (intent: CalendarIntent, events: CalendarEvent[]): string => {
  const label = getQueryLabel(intent)

  if (events.length === 0) {
    return `${label}没有安排`
  }

  const visibleEvents = events.slice(0, 3).map(buildQueryEventLine).join('；')
  const moreText = events.length > 3 ? `；还有 ${events.length - 3} 个日程` : ''

  return `${label}共有 ${events.length} 个日程：${visibleEvents}${moreText}`
}

const normalizeMatchText = (value: string): string => {
  return value.toLocaleLowerCase('zh-CN').replace(/\s+/g, '')
}

const isSameDay = (left: Date, right: Date): boolean => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

const matchesDeleteTitle = (event: CalendarEvent, title?: string): boolean => {
  if (!title) {
    return true
  }

  const eventTitle = normalizeMatchText(event.title)
  const targetTitle = normalizeMatchText(title)

  return eventTitle.includes(targetTitle) || targetTitle.includes(eventTitle)
}

const matchesDeleteDateTime = (event: CalendarEvent, intent: CalendarIntent): boolean => {
  if (intent.type !== 'delete' || !intent.dateTime) {
    return true
  }

  const eventDate = new Date(event.startAt)
  const targetDate = intent.dateTime.startAt
  const missesDate = intent.dateTime.missing.includes('date')
  const missesTime = intent.dateTime.missing.includes('time')

  if (!missesDate && !isSameDay(eventDate, targetDate)) {
    return false
  }

  if (!missesTime) {
    return eventDate.getHours() === targetDate.getHours() && eventDate.getMinutes() === targetDate.getMinutes()
  }

  return true
}

const findDeleteCandidates = (intent: CalendarIntent, events: CalendarEvent[]): CalendarEvent[] => {
  if (intent.type !== 'delete') {
    return []
  }

  return events.filter((event) => matchesDeleteTitle(event, intent.title) && matchesDeleteDateTime(event, intent))
}

const buildDeleteCandidateReply = (intent: CalendarIntent, candidates: CalendarEvent[]): string => {
  if (intent.type !== 'delete') {
    return '还没有识别到要删除的日程'
  }

  if (intent.missing.length > 0) {
    return '请补充要删除的日程标题或时间'
  }

  if (candidates.length === 0) {
    return '没有找到可删除的日程，请换一个标题或时间再试'
  }

  if (candidates.length > 1) {
    const preview = candidates.slice(0, 3).map(buildQueryEventLine).join('；')
    return `找到 ${candidates.length} 个可能的日程：${preview}。请补充更具体的时间或标题后再删除`
  }

  const [event] = candidates
  return `找到日程：“${event.title}”，时间 ${formatDateTime(event.startAt)}。请说“确认删除”完成删除，或说“取消”放弃`
}

const isConfirmDeleteCommand = (commandText: string): boolean => {
  const text = normalizeMatchText(commandText)
  return ['确认', '确认删除', '确定', '确定删除', '是的', '删除吧', '删掉吧'].includes(text)
}

const isConfirmCreateCommand = (commandText: string): boolean => {
  const text = normalizeMatchText(commandText)
  return ['确认', '确认添加', '确定', '确定添加', '继续添加', '仍然添加', '添加吧', '是的'].includes(text)
}

const isCancelDeleteCommand = (commandText: string): boolean => {
  const text = normalizeMatchText(commandText)
  return ['取消', '不删了', '先不删', '放弃'].includes(text)
}

const isCancelCreateCommand = (commandText: string): boolean => {
  const text = normalizeMatchText(commandText)
  return ['取消', '不加了', '先不加', '放弃'].includes(text)
}

const buildDeleteSuccessReply = (event: CalendarEvent): string => {
  return `已删除日程：“${event.title}”，时间 ${formatDateTime(event.startAt)}`
}

const buildDeleteFailureReply = (error: unknown): string => {
  const reason = error instanceof Error ? error.message : '删除失败'
  return `删除日程失败：${reason}`
}

export function VoicePanel({ onCreateEvent, onDeleteEvent, onQueryEvents }: VoicePanelProps) {
  const [draftText, setDraftText] = useState('')
  const [latestCommand, setLatestCommand] = useState('')
  const [intent, setIntent] = useState<CalendarIntent>()
  const [assistantReply, setAssistantReply] = useState('等待语音输入')
  const [queryResults, setQueryResults] = useState<CalendarEvent[]>([])
  const [pendingCreate, setPendingCreate] = useState<PendingCreate>()
  const [pendingCreateClarification, setPendingCreateClarification] = useState<PendingCreateClarification>()
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { cancel, isSupported: canSpeak, speak } = useSpeechSynthesis()

  const handleCommand = useCallback(
    async (commandText: string) => {
      const normalizedText = commandText.trim()

      if (!normalizedText) {
        return
      }

      if (pendingCreateClarification && isCancelCreateCommand(normalizedText)) {
        const cancelReply = '已取消添加操作'
        setPendingCreateClarification(undefined)
        setQueryResults([])
        setLatestCommand(normalizedText)
        setDraftText(normalizedText)
        setAssistantReply(cancelReply)
        speak(cancelReply)
        return
      }

      if (pendingCreate && isCancelCreateCommand(normalizedText)) {
        const cancelReply = '已取消添加操作'
        setPendingCreate(undefined)
        setQueryResults([])
        setLatestCommand(normalizedText)
        setDraftText(normalizedText)
        setAssistantReply(cancelReply)
        speak(cancelReply)
        return
      }

      if (pendingCreate && isConfirmCreateCommand(normalizedText)) {
        setLatestCommand(normalizedText)
        setDraftText(normalizedText)
        setIsSubmitting(true)

        try {
          const createdEvent = await onCreateEvent(pendingCreate.input)
          const successReply = buildCreateSuccessReply(createdEvent)
          setPendingCreate(undefined)
          setQueryResults([])
          setAssistantReply(successReply)
          speak(successReply)
        } catch (error) {
          const failureReply = buildCreateFailureReply(error)
          setAssistantReply(failureReply)
          speak(failureReply)
        } finally {
          setIsSubmitting(false)
        }

        return
      }

      if (pendingDelete && isCancelDeleteCommand(normalizedText)) {
        const cancelReply = '已取消删除操作'
        setPendingDelete(undefined)
        setQueryResults([])
        setLatestCommand(normalizedText)
        setDraftText(normalizedText)
        setAssistantReply(cancelReply)
        speak(cancelReply)
        return
      }

      if (pendingDelete && isConfirmDeleteCommand(normalizedText)) {
        setLatestCommand(normalizedText)
        setDraftText(normalizedText)
        setIsSubmitting(true)

        try {
          const deletedEvent = await onDeleteEvent(pendingDelete.event.id)
          const successReply = deletedEvent
            ? buildDeleteSuccessReply(deletedEvent)
            : '日程已经不存在，无需重复删除'
          setPendingDelete(undefined)
          setQueryResults([])
          setAssistantReply(successReply)
          speak(successReply)
        } catch (error) {
          const failureReply = buildDeleteFailureReply(error)
          setAssistantReply(failureReply)
          speak(failureReply)
        } finally {
          setIsSubmitting(false)
        }

        return
      }

      const clarifiedCreate = pendingCreateClarification
        ? getClarifiedCreateIntent(pendingCreateClarification, normalizedText)
        : undefined
      const parsedIntent = clarifiedCreate?.intent ?? parseCalendarIntent(normalizedText)
      const commandForIntent = clarifiedCreate?.commandText ?? normalizedText
      const reply = buildIntentSummary(parsedIntent)
      setLatestCommand(commandForIntent)
      setDraftText(commandForIntent)
      setIntent(parsedIntent)
      setQueryResults([])
      setPendingCreate(undefined)
      setPendingCreateClarification(undefined)
      setPendingDelete(undefined)

      if (parsedIntent.type === 'create') {
        const createInput = buildCreateEventInput(parsedIntent, commandForIntent)

        if (!createInput) {
          const clarificationReply = buildCreateClarificationReply(parsedIntent)
          setPendingCreateClarification({ commandText: commandForIntent, intent: parsedIntent })
          setAssistantReply(clarificationReply)
          speak(clarificationReply)
          return
        }

        const scheduledEvents = onQueryEvents({ status: 'scheduled' })
        const conflicts = findCreateConflicts(createInput, scheduledEvents)

        if (conflicts.length > 0) {
          const conflictReply = buildCreateConflictReply(conflicts)
          setPendingCreate({ input: createInput, conflicts })
          setQueryResults(conflicts)
          setAssistantReply(conflictReply)
          speak(conflictReply)
          return
        }

        setIsSubmitting(true)

        try {
          const createdEvent = await onCreateEvent(createInput)
          const successReply = buildCreateSuccessReply(createdEvent)
          setAssistantReply(successReply)
          speak(successReply)
        } catch (error) {
          const failureReply = buildCreateFailureReply(error)
          setAssistantReply(failureReply)
          speak(failureReply)
        } finally {
          setIsSubmitting(false)
        }

        return
      }

      if (parsedIntent.type === 'query') {
        const events = onQueryEvents(buildQueryRange(parsedIntent))
        const queryReply = buildQueryReply(parsedIntent, events)
        setQueryResults(events)
        setAssistantReply(queryReply)
        speak(queryReply)
        return
      }

      if (parsedIntent.type === 'delete') {
        const scheduledEvents = onQueryEvents({ status: 'scheduled' })
        const candidates = findDeleteCandidates(parsedIntent, scheduledEvents)
        const deleteReply = buildDeleteCandidateReply(parsedIntent, candidates)

        setQueryResults(candidates)
        setAssistantReply(deleteReply)

        if (candidates.length === 1 && parsedIntent.missing.length === 0) {
          setPendingDelete({ event: candidates[0] })
        }

        speak(deleteReply)
        return
      }

      setAssistantReply(reply)
      speak(reply)
    },
    [
      onCreateEvent,
      onDeleteEvent,
      onQueryEvents,
      pendingCreate,
      pendingCreateClarification,
      pendingDelete,
      speak,
    ],
  )

  const {
    errorMessage,
    interimTranscript,
    isListening,
    isSupported: canRecognize,
    startListening,
    stopListening,
    transcript,
  } = useSpeechRecognition({ onFinalResult: (text) => void handleCommand(text) })

  const shownTranscript = interimTranscript || transcript || latestCommand || '等待语音输入'
  const missingText = useMemo(() => {
    if (!intent?.missing.length) {
      return undefined
    }

    return intent.missing.map((field) => missingLabels[field] ?? field).join('、')
  }, [intent])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleCommand(draftText)
  }

  const handleQuickCommand = (command: string) => {
    void handleCommand(command)
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
      return
    }

    cancel()
    startListening()
  }

  const speakCurrentReply = () => {
    if (!canSpeak) {
      return
    }

    cancel()
    speak(assistantReply)
  }

  return (
    <section className="voice-panel" aria-labelledby="voice-panel-title" aria-busy={isSubmitting}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Voice Input</p>
          <h2 id="voice-panel-title">语音指令</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="播报当前回复"
          onClick={speakCurrentReply}
          disabled={!canSpeak}
        >
          <Volume2 size={18} strokeWidth={2.2} />
        </button>
      </div>

      <button
        className={`voice-control-button ${isListening ? 'is-listening' : ''}`}
        type="button"
        aria-label={isListening ? '停止语音输入' : '开始语音输入'}
        aria-pressed={isListening}
        onClick={toggleListening}
        disabled={!canRecognize || isSubmitting}
      >
        {isListening ? <MicOff size={34} strokeWidth={2.1} /> : <Mic size={34} strokeWidth={2.1} />}
      </button>

      <div className="transcript-box">
        <span className="transcript-label">{isListening ? '正在聆听' : '识别文本'}</span>
        <p>{shownTranscript}</p>
      </div>

      <div className="assistant-reply" aria-live="polite">
        <span>{intent ? intentLabels[intent.type] : '助手回复'}</span>
        <p>{assistantReply}</p>
        {queryResults.length > 0 ? (
          <ul className="query-result-list" aria-label="查询结果">
            {queryResults.slice(0, 4).map((event) => (
              <li key={event.id}>
                <strong>{formatDateTime(event.startAt)}</strong>
                <span>{event.title}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {pendingCreate ? (
          <small>等待确认添加：说“确认添加”继续，或说“取消”放弃</small>
        ) : null}
        {pendingCreateClarification ? (
          <small>等待补充信息：可以继续说标题或具体时间，或说“取消”放弃</small>
        ) : null}
        {pendingDelete ? <small>等待确认删除：说“确认删除”或“取消”</small> : null}
        {isSubmitting ? <small>{pendingDelete ? '正在删除日程...' : '正在创建日程...'}</small> : null}
        {missingText ? <small>待补充：{missingText}</small> : null}
        {errorMessage ? <small>{errorMessage}</small> : null}
        {!canRecognize ? <small>当前浏览器不支持语音识别，请使用文本输入</small> : null}
      </div>

      <div className="command-row" aria-label="常用指令">
        {quickCommands.map((command) => (
          <button
            className="command-chip"
            type="button"
            key={command}
            disabled={isSubmitting}
            onClick={() => handleQuickCommand(command)}
          >
            {command}
          </button>
        ))}
      </div>

      <form className="input-row" onSubmit={handleSubmit}>
        <input
          aria-label="文本指令"
          placeholder="输入一条日程指令"
          value={draftText}
          disabled={isSubmitting}
          onChange={(event) => setDraftText(event.target.value)}
        />
        <button className="primary-icon-button" type="submit" aria-label="发送文本指令" disabled={isSubmitting}>
          <Send size={18} strokeWidth={2.4} />
        </button>
      </form>
    </section>
  )
}
