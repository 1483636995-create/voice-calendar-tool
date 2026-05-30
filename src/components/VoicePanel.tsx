import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { Mic, MicOff, Send, Volume2 } from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { parseCalendarIntent, type CalendarIntent } from '../lib/intentParser'

const quickCommands = ['查看今天安排', '明天下午三点项目会', '播报本周日程']

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

const formatDateTime = (value: Date): string => {
  return value.toLocaleString('zh-CN', {
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

export function VoicePanel() {
  const [draftText, setDraftText] = useState('')
  const [latestCommand, setLatestCommand] = useState('')
  const [intent, setIntent] = useState<CalendarIntent>()
  const [assistantReply, setAssistantReply] = useState('等待语音输入')
  const { cancel, isSupported: canSpeak, speak } = useSpeechSynthesis()

  const handleCommand = useCallback(
    (commandText: string) => {
      const normalizedText = commandText.trim()

      if (!normalizedText) {
        return
      }

      const parsedIntent = parseCalendarIntent(normalizedText)
      const reply = buildIntentSummary(parsedIntent)
      setLatestCommand(normalizedText)
      setDraftText(normalizedText)
      setIntent(parsedIntent)
      setAssistantReply(reply)
      speak(reply)
    },
    [speak],
  )

  const {
    errorMessage,
    interimTranscript,
    isListening,
    isSupported: canRecognize,
    startListening,
    stopListening,
    transcript,
  } = useSpeechRecognition({ onFinalResult: handleCommand })

  const shownTranscript = interimTranscript || transcript || latestCommand || '等待语音输入'
  const missingText = useMemo(() => {
    if (!intent?.missing.length) {
      return undefined
    }

    return intent.missing.map((field) => missingLabels[field] ?? field).join('、')
  }, [intent])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleCommand(draftText)
  }

  const handleQuickCommand = (command: string) => {
    handleCommand(command)
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
      return
    }

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
    <section className="voice-panel" aria-labelledby="voice-panel-title">
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
        disabled={!canRecognize}
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
          onChange={(event) => setDraftText(event.target.value)}
        />
        <button className="primary-icon-button" type="submit" aria-label="发送文本指令">
          <Send size={18} strokeWidth={2.4} />
        </button>
      </form>
    </section>
  )
}
