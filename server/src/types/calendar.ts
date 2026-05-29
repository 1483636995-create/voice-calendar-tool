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
  startAt: string
  endAt?: string
  reminderMinutesBefore?: number
  note?: string
  sourceText?: string
  status?: CalendarEventStatus
}

export interface UpdateCalendarEventInput {
  title?: string
  startAt?: string
  endAt?: string | null
  reminderMinutesBefore?: number | null
  note?: string | null
  sourceText?: string | null
  status?: CalendarEventStatus
}

export interface EventQuery {
  from?: string
  to?: string
  status?: CalendarEventStatus | CalendarEventStatus[]
}
