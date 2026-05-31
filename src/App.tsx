import { useMemo, useState } from 'react'
import './App.css'
import { CalendarView } from './components/CalendarView'
import { EventList } from './components/EventList'
import { ReminderCenter } from './components/ReminderCenter'
import { VoicePanel } from './components/VoicePanel'
import { useEvents } from './hooks/useEvents'

const getStartOfDay = (date: Date): Date => {
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

const getEndOfDay = (date: Date): Date => {
  const nextDate = getStartOfDay(date)
  nextDate.setDate(nextDate.getDate() + 1)
  return nextDate
}

const getStartOfWeek = (date: Date): Date => {
  const nextDate = getStartOfDay(date)
  const day = nextDate.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  nextDate.setDate(nextDate.getDate() + mondayOffset)
  return nextDate
}

const getEndOfWeek = (date: Date): Date => {
  const nextDate = getStartOfWeek(date)
  nextDate.setDate(nextDate.getDate() + 7)
  return nextDate
}

const isSameCalendarDay = (left: Date, right: Date): boolean => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

const formatScheduleDateLabel = (date: Date): string => {
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function App() {
  const {
    addEvent,
    dataSource,
    deleteEvent,
    errorMessage,
    events,
    isLoading,
    queryEvents,
    scheduledEvents,
    updateEvent,
  } = useEvents()
  const today = useMemo(() => new Date(), [])
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const todayEvents = queryEvents({ from: getStartOfDay(today), to: getEndOfDay(today) })
  const weekEvents = queryEvents({ from: getStartOfWeek(today), to: getEndOfWeek(today) })
  const selectedDateEvents = queryEvents({ from: getStartOfDay(selectedDate), to: getEndOfDay(selectedDate) })
  const isSelectedToday = isSameCalendarDay(selectedDate, today)
  const selectedDateLabel = formatScheduleDateLabel(selectedDate)
  const scheduleTitle = isSelectedToday ? '今日日程' : `${selectedDateLabel}日程`
  const scheduleEmptyLabel = isSelectedToday ? '今天还没有安排' : `${selectedDateLabel}还没有安排`
  const statusLabel = isLoading
    ? '正在同步日程'
    : dataSource === 'api'
      ? '后端 API 已连接'
      : '本地兜底模式'

  const handleVisibleMonthChange = (date: Date) => {
    setVisibleMonth(date)
    setSelectedDate(date)
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
  }

  const handleCancelEvent = (eventId: string) => {
    return updateEvent(eventId, { status: 'cancelled' })
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Voice Calendar Tool</p>
          <h1>语音日历助手</h1>
        </div>
        <div className="header-status" aria-label="应用状态" title={errorMessage}>
          <span className={`status-dot status-${dataSource}`}></span>
          {statusLabel}
        </div>
      </header>

      <section className="dashboard-grid" aria-label="语音日历工作台">
        <VoicePanel onCreateEvent={addEvent} onDeleteEvent={deleteEvent} onQueryEvents={queryEvents} />
        <CalendarView
          events={events}
          today={today}
          visibleMonth={visibleMonth}
          selectedDate={selectedDate}
          onVisibleMonthChange={handleVisibleMonthChange}
          onSelectDate={handleSelectDate}
          todayCount={todayEvents.length}
          weekCount={weekEvents.length}
          totalCount={events.length}
        />
        <EventList
          title={scheduleTitle}
          events={selectedDateEvents}
          emptyLabel={scheduleEmptyLabel}
          onCancelEvent={handleCancelEvent}
        />
        <ReminderCenter events={scheduledEvents} />
      </section>
    </main>
  )
}

export default App
