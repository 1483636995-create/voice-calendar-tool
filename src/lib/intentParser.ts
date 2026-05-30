import {
  parseChineseDateRange,
  parseChineseDateTime,
  type ParsedDateRange,
  type ParsedDateTime,
} from './timeParser'

export type CalendarIntentType = 'create' | 'query' | 'delete' | 'update' | 'unknown'
export type CalendarIntentMissingField = 'title' | 'time' | 'target' | 'newTime'
export type QueryPresentationMode = 'list' | 'voice'

interface BaseCalendarIntent {
  type: CalendarIntentType
  rawText: string
  normalizedText: string
  confidence: number
  missing: CalendarIntentMissingField[]
}

export interface CreateEventIntent extends BaseCalendarIntent {
  type: 'create'
  title?: string
  dateTime?: ParsedDateTime
  reminderMinutesBefore?: number
}

export interface QueryEventsIntent extends BaseCalendarIntent {
  type: 'query'
  dateRange?: ParsedDateRange
  presentation: QueryPresentationMode
}

export interface DeleteEventIntent extends BaseCalendarIntent {
  type: 'delete'
  title?: string
  dateTime?: ParsedDateTime
}

export interface UpdateEventIntent extends BaseCalendarIntent {
  type: 'update'
  targetTitle?: string
  targetDateTime?: ParsedDateTime
  newDateTime?: ParsedDateTime
}

export interface UnknownIntent extends BaseCalendarIntent {
  type: 'unknown'
  reason: string
}

export type CalendarIntent =
  | CreateEventIntent
  | QueryEventsIntent
  | DeleteEventIntent
  | UpdateEventIntent
  | UnknownIntent

const createKeywords = ['添加', '新增', '创建', '安排', '提醒我', '记一下', '帮我记', '设个提醒']
const explicitQueryKeywords = ['查看', '查询', '看看', '播报', '朗读', '读一下', '念一下']
const queryKeywords = ['查看', '查询', '看看', '播报', '朗读', '读一下', '日程', '安排', '有什么事', '有什么安排']
const deleteKeywords = ['删除', '删掉', '取消', '移除', '不用提醒', '不要提醒']
const updateKeywords = ['改到', '改成', '改为', '修改', '调整到', '推迟到', '提前到', '延期到']
const voiceQueryKeywords = ['播报', '朗读', '读一下', '念一下']
const fillerWords = [
  '请',
  '帮我',
  '给我',
  '我',
  '一下',
  '一个',
  '一条',
  '日程',
  '安排',
  '事件',
  '待办',
  '提醒',
  '提醒我',
  '设个提醒',
  '添加',
  '新增',
  '创建',
  '查看',
  '查询',
  '看看',
  '删除',
  '删掉',
  '取消',
  '移除',
  '把',
  '将',
  '的',
  '在',
  '于',
]

const normalizeSpeechText = (text: string): string => {
  return text
    .trim()
    .replace(/[，。！？、；]/g, ' ')
    .replace(/\s+/g, '')
}

const includesAny = (text: string, keywords: string[]): boolean => {
  return keywords.some((keyword) => text.includes(keyword))
}

const removeMatchedDateTime = (text: string, dateTime?: ParsedDateTime): string => {
  if (!dateTime?.matchedText) {
    return text
  }

  return dateTime.matchedText
    .split(/\s+/)
    .filter(Boolean)
    .reduce((nextText, part) => nextText.replace(part, ''), text)
}

const removeKeywords = (text: string, keywords: string[]): string => {
  return keywords.reduce((nextText, keyword) => nextText.replaceAll(keyword, ''), text)
}

const cleanupTitle = (text: string): string | undefined => {
  let normalizedTitle = removeKeywords(text, fillerWords)
    .replace(/(吧|呀|啊|哦)$/g, '')
    .replace(/\s+/g, '')
    .trim()

  const leadingActionMatch = normalizedTitle.match(/^(开|参加|去|做|办理|处理|完成)(.+)$/)

  if (leadingActionMatch && leadingActionMatch[2].length >= 2) {
    normalizedTitle = leadingActionMatch[2]
  }

  return normalizedTitle || undefined
}

const extractTitle = (
  normalizedText: string,
  dateTime: ParsedDateTime | undefined,
  intentKeywords: string[],
): string | undefined => {
  const withoutTime = removeMatchedDateTime(normalizedText, dateTime)
  const withoutIntent = removeKeywords(withoutTime, intentKeywords)
  return cleanupTitle(withoutIntent)
}

const parseReminderMinutesBefore = (normalizedText: string): number | undefined => {
  const reminderMatch = normalizedText.match(/提前(\d{1,3}|十|十五|二十|三十|半)(分钟|分|小时|个小时)提醒/)

  if (!reminderMatch) {
    return undefined
  }

  const [, rawAmount, unit] = reminderMatch
  const amountMap: Record<string, number> = {
    十: 10,
    十五: 15,
    二十: 20,
    三十: 30,
    半: 0.5,
  }
  const amount = /^\d+$/.test(rawAmount) ? Number(rawAmount) : amountMap[rawAmount]

  if (amount === undefined) {
    return undefined
  }

  return unit.includes('小时') ? Math.round(amount * 60) : Math.round(amount)
}

const getIntentConfidence = (hasKeyword: boolean, filledFields: number, totalFields: number): number => {
  const keywordScore = hasKeyword ? 0.35 : 0.15
  const fieldScore = totalFields === 0 ? 0.5 : (filledFields / totalFields) * 0.55
  return Math.min(0.95, Number((keywordScore + fieldScore).toFixed(2)))
}

const parseCreateIntent = (rawText: string, normalizedText: string, referenceDate: Date): CreateEventIntent => {
  const dateTime = parseChineseDateTime(normalizedText, referenceDate)
  const title = extractTitle(normalizedText, dateTime, createKeywords)
  const missing: CalendarIntentMissingField[] = []

  if (!title) {
    missing.push('title')
  }

  if (!dateTime || dateTime.missing.includes('time')) {
    missing.push('time')
  }

  return {
    type: 'create',
    rawText,
    normalizedText,
    title,
    dateTime,
    reminderMinutesBefore: parseReminderMinutesBefore(normalizedText),
    missing,
    confidence: getIntentConfidence(includesAny(normalizedText, createKeywords), Number(Boolean(title)) + Number(Boolean(dateTime)), 2),
  }
}

const parseQueryIntent = (rawText: string, normalizedText: string, referenceDate: Date): QueryEventsIntent => {
  const dateRange = parseChineseDateRange(normalizedText, referenceDate)

  return {
    type: 'query',
    rawText,
    normalizedText,
    dateRange,
    presentation: includesAny(normalizedText, voiceQueryKeywords) ? 'voice' : 'list',
    missing: [],
    confidence: getIntentConfidence(includesAny(normalizedText, queryKeywords), dateRange ? 1 : 0, 1),
  }
}

const parseDeleteIntent = (rawText: string, normalizedText: string, referenceDate: Date): DeleteEventIntent => {
  const dateTime = parseChineseDateTime(normalizedText, referenceDate)
  const title = extractTitle(normalizedText, dateTime, deleteKeywords)
  const missing: CalendarIntentMissingField[] = []

  if (!title && !dateTime) {
    missing.push('target')
  }

  return {
    type: 'delete',
    rawText,
    normalizedText,
    title,
    dateTime,
    missing,
    confidence: getIntentConfidence(includesAny(normalizedText, deleteKeywords), Number(Boolean(title)) + Number(Boolean(dateTime)), 2),
  }
}

const splitUpdateText = (normalizedText: string): [string, string] | undefined => {
  const keyword = updateKeywords.find((item) => normalizedText.includes(item))

  if (!keyword) {
    return undefined
  }

  const [targetText, nextText] = normalizedText.split(keyword)

  if (!targetText || !nextText) {
    return undefined
  }

  return [targetText, nextText]
}

const parseUpdateIntent = (rawText: string, normalizedText: string, referenceDate: Date): UpdateEventIntent => {
  const updateParts = splitUpdateText(normalizedText)
  const targetText = updateParts?.[0] ?? normalizedText
  const nextText = updateParts?.[1] ?? ''
  const targetDateTime = parseChineseDateTime(targetText, referenceDate)
  const newDateTime = parseChineseDateTime(nextText, referenceDate)
  const targetTitle = extractTitle(targetText, targetDateTime, updateKeywords)
  const missing: CalendarIntentMissingField[] = []

  if (!targetTitle && !targetDateTime) {
    missing.push('target')
  }

  if (!newDateTime) {
    missing.push('newTime')
  }

  return {
    type: 'update',
    rawText,
    normalizedText,
    targetTitle,
    targetDateTime,
    newDateTime,
    missing,
    confidence: getIntentConfidence(includesAny(normalizedText, updateKeywords), Number(Boolean(targetTitle || targetDateTime)) + Number(Boolean(newDateTime)), 2),
  }
}

const detectIntentType = (normalizedText: string, referenceDate: Date): CalendarIntentType => {
  if (!normalizedText) {
    return 'unknown'
  }

  if (includesAny(normalizedText, updateKeywords)) {
    return 'update'
  }

  if (includesAny(normalizedText, deleteKeywords)) {
    return 'delete'
  }

  const looksLikeQuestion =
    /有什么|哪些|几件|多少/.test(normalizedText) || normalizedText.endsWith('吗')

  if (includesAny(normalizedText, explicitQueryKeywords)) {
    return 'query'
  }

  if (includesAny(normalizedText, queryKeywords) && looksLikeQuestion) {
    return 'query'
  }

  if (includesAny(normalizedText, createKeywords)) {
    return 'create'
  }

  const parsedDateTime = parseChineseDateTime(normalizedText, referenceDate)
  const title = extractTitle(normalizedText, parsedDateTime, [])

  if (parsedDateTime && title) {
    return 'create'
  }

  return 'unknown'
}

export const parseCalendarIntent = (
  text: string,
  referenceDate: Date = new Date(),
): CalendarIntent => {
  const rawText = text.trim()
  const normalizedText = normalizeSpeechText(rawText)
  const type = detectIntentType(normalizedText, referenceDate)

  if (type === 'create') {
    return parseCreateIntent(rawText, normalizedText, referenceDate)
  }

  if (type === 'query') {
    return parseQueryIntent(rawText, normalizedText, referenceDate)
  }

  if (type === 'delete') {
    return parseDeleteIntent(rawText, normalizedText, referenceDate)
  }

  if (type === 'update') {
    return parseUpdateIntent(rawText, normalizedText, referenceDate)
  }

  return {
    type: 'unknown',
    rawText,
    normalizedText,
    reason: normalizedText ? '未识别到明确的日历操作' : '输入为空',
    missing: [],
    confidence: 0,
  }
}
