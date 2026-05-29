export type ParsedDateTimeKind = 'absolute' | 'relative'
export type ParsedDateTimeGranularity = 'minute' | 'hour' | 'day'
export type MissingDateTimeField = 'date' | 'time'

export interface ParsedDateTime {
  startAt: Date
  kind: ParsedDateTimeKind
  granularity: ParsedDateTimeGranularity
  matchedText: string
  missing: MissingDateTimeField[]
  confidence: number
}

export interface ParsedDateRange {
  from: Date
  to: Date
  matchedText: string
  label: string
}

interface DateMatch {
  date: Date
  matchedText: string
  hasDate: boolean
}

interface TimeMatch {
  hour: number
  minute: number
  matchedText: string
  granularity: ParsedDateTimeGranularity
}

const chineseDigits: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

const weekdayMap: Record<string, number> = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
}

const numberPattern = String.raw`\d{1,4}|[零〇一二两三四五六七八九十]{1,6}`
const meridiemPattern = String.raw`凌晨|清晨|早上|上午|中午|下午|傍晚|晚上|今晚|夜里|夜间`

const startOfDay = (date: Date): Date => {
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const startOfWeek = (date: Date): Date => {
  const nextDate = startOfDay(date)
  const day = nextDate.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  nextDate.setDate(nextDate.getDate() + mondayOffset)
  return nextDate
}

const getWeekdayFromWeekStart = (referenceDate: Date, targetWeekday: number, weekOffset: number): Date => {
  const offsetFromMonday = targetWeekday === 0 ? 6 : targetWeekday - 1
  return addDays(startOfWeek(referenceDate), weekOffset * 7 + offsetFromMonday)
}

const getUpcomingWeekday = (referenceDate: Date, targetWeekday: number): Date => {
  const today = startOfDay(referenceDate)
  const diff = (targetWeekday - today.getDay() + 7) % 7
  return addDays(today, diff)
}

const parseChineseInteger = (rawValue: string): number | undefined => {
  const value = rawValue.trim()

  if (/^\d+$/.test(value)) {
    return Number(value)
  }

  if (!value) {
    return undefined
  }

  if (value.includes('十')) {
    const [rawTens, rawOnes] = value.split('十')
    const tens = rawTens ? chineseDigits[rawTens] : 1
    const ones = rawOnes ? chineseDigits[rawOnes] : 0

    if (tens === undefined || ones === undefined) {
      return undefined
    }

    return tens * 10 + ones
  }

  if (value.length > 1) {
    const digits = [...value].map((char) => chineseDigits[char])

    if (digits.some((digit) => digit === undefined)) {
      return undefined
    }

    return Number(digits.join(''))
  }

  return chineseDigits[value]
}

const parseChineseYear = (rawValue: string): number | undefined => {
  if (/^\d{4}$/.test(rawValue)) {
    return Number(rawValue)
  }

  const digits = [...rawValue].map((char) => chineseDigits[char])

  if (digits.length !== 4 || digits.some((digit) => digit === undefined)) {
    return undefined
  }

  return Number(digits.join(''))
}

const parseRelativeAmount = (rawValue: string, unit: string): number | undefined => {
  if (rawValue === '半') {
    return unit.includes('小时') || unit.includes('钟头') ? 0.5 : undefined
  }

  if (rawValue === '一刻') {
    return 15
  }

  return parseChineseInteger(rawValue)
}

const normalizeHourByMeridiem = (hour: number, meridiem?: string): number => {
  if (!meridiem) {
    return hour
  }

  if (['凌晨', '清晨', '早上', '上午'].includes(meridiem)) {
    return hour === 12 ? 0 : hour
  }

  if (meridiem === '中午') {
    return hour < 11 ? hour + 12 : hour
  }

  if (['下午', '傍晚', '晚上', '今晚'].includes(meridiem)) {
    return hour < 12 ? hour + 12 : hour
  }

  if (['夜里', '夜间'].includes(meridiem)) {
    return hour >= 6 && hour < 12 ? hour + 12 : hour
  }

  return hour
}

const createDate = (year: number, month: number, day: number): Date | undefined => {
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }

  return startOfDay(date)
}

const parseRelativeDateTime = (input: string, referenceDate: Date): ParsedDateTime | undefined => {
  const relativeMatch = input.match(
    new RegExp(`(半|一刻|${numberPattern})\\s*(分钟|分|小时|钟头|天|周|星期|个星期)后`),
  )

  if (!relativeMatch) {
    return undefined
  }

  const [, rawAmount, unit] = relativeMatch
  const amount = parseRelativeAmount(rawAmount, unit)

  if (amount === undefined) {
    return undefined
  }

  const startAt = new Date(referenceDate)
  let granularity: ParsedDateTimeGranularity = 'minute'

  if (unit === '分钟' || unit === '分') {
    startAt.setMinutes(startAt.getMinutes() + amount)
  } else if (unit === '小时' || unit === '钟头') {
    startAt.setMinutes(startAt.getMinutes() + amount * 60)
  } else if (unit === '天') {
    startAt.setDate(startAt.getDate() + amount)
    granularity = 'day'
  } else {
    startAt.setDate(startAt.getDate() + amount * 7)
    granularity = 'day'
  }

  return {
    startAt,
    kind: 'relative',
    granularity,
    matchedText: relativeMatch[0],
    missing: [],
    confidence: 0.95,
  }
}

const parseDateMatch = (input: string, referenceDate: Date): DateMatch | undefined => {
  const today = startOfDay(referenceDate)

  const dayWordMatches: Array<[string, number]> = [
    ['大后天', 3],
    ['后天', 2],
    ['明天', 1],
    ['今天', 0],
    ['昨天', -1],
  ]

  const dayWordMatch = dayWordMatches.find(([word]) => input.includes(word))

  if (dayWordMatch) {
    return {
      date: addDays(today, dayWordMatch[1]),
      matchedText: dayWordMatch[0],
      hasDate: true,
    }
  }

  const nextWeekMatch = input.match(new RegExp(`下(?:周|星期|礼拜)([一二三四五六日天])`))

  if (nextWeekMatch) {
    const targetWeekday = weekdayMap[nextWeekMatch[1]]
    return {
      date: getWeekdayFromWeekStart(referenceDate, targetWeekday, 1),
      matchedText: nextWeekMatch[0],
      hasDate: true,
    }
  }

  const currentWeekMatch = input.match(
    new RegExp(`(?:本|这)(?:周|星期|礼拜)([一二三四五六日天])`),
  )

  if (currentWeekMatch) {
    const targetWeekday = weekdayMap[currentWeekMatch[1]]
    return {
      date: getWeekdayFromWeekStart(referenceDate, targetWeekday, 0),
      matchedText: currentWeekMatch[0],
      hasDate: true,
    }
  }

  const weekdayMatch = input.match(new RegExp(`(?:周|星期|礼拜)([一二三四五六日天])`))

  if (weekdayMatch) {
    const targetWeekday = weekdayMap[weekdayMatch[1]]
    return {
      date: getUpcomingWeekday(referenceDate, targetWeekday),
      matchedText: weekdayMatch[0],
      hasDate: true,
    }
  }

  const fullDateMatch = input.match(
    new RegExp(`(${numberPattern})年\\s*(${numberPattern})月\\s*(${numberPattern})(?:日|号)`),
  )

  if (fullDateMatch) {
    const year = parseChineseYear(fullDateMatch[1])
    const month = parseChineseInteger(fullDateMatch[2])
    const day = parseChineseInteger(fullDateMatch[3])
    const date =
      year !== undefined && month !== undefined && day !== undefined
        ? createDate(year, month, day)
        : undefined

    if (date) {
      return { date, matchedText: fullDateMatch[0], hasDate: true }
    }
  }

  const monthDayMatch = input.match(
    new RegExp(`(${numberPattern})月\\s*(${numberPattern})(?:日|号)`),
  )

  if (monthDayMatch) {
    const month = parseChineseInteger(monthDayMatch[1])
    const day = parseChineseInteger(monthDayMatch[2])
    let date =
      month !== undefined && day !== undefined
        ? createDate(referenceDate.getFullYear(), month, day)
        : undefined

    if (date && month !== undefined && day !== undefined && date.getTime() < today.getTime()) {
      date = createDate(referenceDate.getFullYear() + 1, month, day)
    }

    if (date) {
      return { date, matchedText: monthDayMatch[0], hasDate: true }
    }
  }

  const dayOnlyMatch = input.match(new RegExp(`(${numberPattern})(?:日|号)`))

  if (dayOnlyMatch) {
    const day = parseChineseInteger(dayOnlyMatch[1])
    let date = day !== undefined
      ? createDate(referenceDate.getFullYear(), referenceDate.getMonth() + 1, day)
      : undefined

    if (date && day !== undefined && date.getTime() < today.getTime()) {
      date = createDate(referenceDate.getFullYear(), referenceDate.getMonth() + 2, day)
    }

    if (date) {
      return { date, matchedText: dayOnlyMatch[0], hasDate: true }
    }
  }

  return undefined
}

const parseTimeMatch = (input: string): TimeMatch | undefined => {
  const colonTimeMatch = input.match(/(\d{1,2})[:：](\d{1,2})/)

  if (colonTimeMatch) {
    const hour = Number(colonTimeMatch[1])
    const minute = Number(colonTimeMatch[2])

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return {
        hour,
        minute,
        matchedText: colonTimeMatch[0],
        granularity: 'minute',
      }
    }
  }

  const timeMatch = input.match(
    new RegExp(
      `(${meridiemPattern})?\\s*(${numberPattern})\\s*(?:点|时)(?:\\s*(半|一刻|三刻|${numberPattern})\\s*(?:分|分钟)?)?`,
    ),
  )

  if (!timeMatch) {
    return undefined
  }

  const [, meridiem, rawHour, rawMinute] = timeMatch
  const parsedHour = parseChineseInteger(rawHour)

  if (parsedHour === undefined || parsedHour < 0 || parsedHour > 23) {
    return undefined
  }

  let minute = 0
  let granularity: ParsedDateTimeGranularity = 'hour'

  if (rawMinute) {
    granularity = 'minute'

    if (rawMinute === '半') {
      minute = 30
    } else if (rawMinute === '一刻') {
      minute = 15
    } else if (rawMinute === '三刻') {
      minute = 45
    } else {
      const parsedMinute = parseChineseInteger(rawMinute)

      if (parsedMinute === undefined || parsedMinute < 0 || parsedMinute > 59) {
        return undefined
      }

      minute = parsedMinute
    }
  }

  const hour = normalizeHourByMeridiem(parsedHour, meridiem)

  if (hour < 0 || hour > 23) {
    return undefined
  }

  return {
    hour,
    minute,
    matchedText: timeMatch[0].trim(),
    granularity,
  }
}

const mergeDateAndTime = (
  dateMatch: DateMatch | undefined,
  timeMatch: TimeMatch | undefined,
  referenceDate: Date,
): Date => {
  const date = dateMatch?.date ? new Date(dateMatch.date) : startOfDay(referenceDate)

  if (timeMatch) {
    date.setHours(timeMatch.hour, timeMatch.minute, 0, 0)

    if (!dateMatch?.hasDate && date.getTime() <= referenceDate.getTime()) {
      date.setDate(date.getDate() + 1)
    }
  }

  return date
}

const getMatchedText = (dateMatch: DateMatch | undefined, timeMatch: TimeMatch | undefined): string => {
  return [dateMatch?.matchedText, timeMatch?.matchedText].filter(Boolean).join(' ')
}

export const parseChineseDateTime = (
  input: string,
  referenceDate: Date = new Date(),
): ParsedDateTime | undefined => {
  const normalizedInput = input.trim()

  if (!normalizedInput) {
    return undefined
  }

  const relativeResult = parseRelativeDateTime(normalizedInput, referenceDate)

  if (relativeResult) {
    return relativeResult
  }

  const dateMatch = parseDateMatch(normalizedInput, referenceDate)
  const timeMatch = parseTimeMatch(normalizedInput)

  if (!dateMatch && !timeMatch) {
    return undefined
  }

  const missing: MissingDateTimeField[] = []

  if (!dateMatch) {
    missing.push('date')
  }

  if (!timeMatch) {
    missing.push('time')
  }

  const startAt = mergeDateAndTime(dateMatch, timeMatch, referenceDate)
  const confidence = dateMatch && timeMatch ? 0.9 : timeMatch ? 0.75 : 0.65

  return {
    startAt,
    kind: 'absolute',
    granularity: timeMatch?.granularity ?? 'day',
    matchedText: getMatchedText(dateMatch, timeMatch),
    missing,
    confidence,
  }
}

export const parseChineseDateRange = (
  input: string,
  referenceDate: Date = new Date(),
): ParsedDateRange | undefined => {
  const normalizedInput = input.trim()
  const today = startOfDay(referenceDate)

  const createDayRange = (date: Date, matchedText: string, label: string): ParsedDateRange => {
    return {
      from: date,
      to: addDays(date, 1),
      matchedText,
      label,
    }
  }

  if (normalizedInput.includes('今天')) {
    return createDayRange(today, '今天', '今天')
  }

  if (normalizedInput.includes('明天')) {
    return createDayRange(addDays(today, 1), '明天', '明天')
  }

  if (normalizedInput.includes('后天')) {
    return createDayRange(addDays(today, 2), '后天', '后天')
  }

  if (/(本周|这周|本星期|这星期|本礼拜|这礼拜)/.test(normalizedInput)) {
    const from = startOfWeek(referenceDate)
    return {
      from,
      to: addDays(from, 7),
      matchedText: normalizedInput.match(/本周|这周|本星期|这星期|本礼拜|这礼拜/)?.[0] ?? '本周',
      label: '本周',
    }
  }

  if (/(下周|下星期|下礼拜)/.test(normalizedInput)) {
    const from = addDays(startOfWeek(referenceDate), 7)
    return {
      from,
      to: addDays(from, 7),
      matchedText: normalizedInput.match(/下周|下星期|下礼拜/)?.[0] ?? '下周',
      label: '下周',
    }
  }

  const parsedDateTime = parseChineseDateTime(normalizedInput, referenceDate)

  if (parsedDateTime && !parsedDateTime.missing.includes('date')) {
    const from = startOfDay(parsedDateTime.startAt)
    return createDayRange(from, parsedDateTime.matchedText, parsedDateTime.matchedText)
  }

  return undefined
}
