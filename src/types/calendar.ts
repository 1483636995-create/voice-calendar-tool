export type CalendarEventStatus = 'scheduled' | 'completed' | 'cancelled'

export interface CalendarEvent {
  id: string
  title: string
  startAt: string
  endAt?: string
  reminderMinutesBefore?: number
  note?: string
  sourceText?: string
  status: CalendarEventStatus
  createdAt: string
  updatedAt: string
}

export interface CreateCalendarEventInput {
  title: string
  startAt: Date | string
  endAt?: Date | string
  reminderMinutesBefore?: number
  note?: string
  sourceText?: string
  status?: CalendarEventStatus
}

export interface UpdateCalendarEventInput {
  title?: string
  startAt?: Date | string
  endAt?: Date | string | null
  reminderMinutesBefore?: number | null
  note?: string | null
  sourceText?: string | null
  status?: CalendarEventStatus
}

export interface EventDateRange {
  from?: Date | string
  to?: Date | string
  status?: CalendarEventStatus | CalendarEventStatus[]
}

export interface EventMutationResult {
  event: CalendarEvent
  events: CalendarEvent[]
}
