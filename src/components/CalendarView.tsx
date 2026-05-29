import { CalendarDays } from 'lucide-react'

interface CalendarViewProps {
  today: Date
  todayCount: number
  weekCount: number
  totalCount: number
}

const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']

const getMonthDays = (date: Date): Date[] => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const startOffset = firstDay.getDay()
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - startOffset)

  return Array.from({ length: 35 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

export function CalendarView({ today, todayCount, weekCount, totalCount }: CalendarViewProps) {
  const days = getMonthDays(today)
  const monthLabel = today.toLocaleDateString('zh-CN', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="calendar-panel" aria-labelledby="calendar-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2 id="calendar-title">{monthLabel}</h2>
        </div>
        <CalendarDays size={22} strokeWidth={2.1} />
      </div>

      <div className="metric-grid" aria-label="日程统计">
        <div>
          <span>{todayCount}</span>
          <p>今日</p>
        </div>
        <div>
          <span>{weekCount}</span>
          <p>本周</p>
        </div>
        <div>
          <span>{totalCount}</span>
          <p>全部</p>
        </div>
      </div>

      <div className="month-grid" aria-label="月历">
        {weekdayNames.map((weekday) => (
          <span className="weekday" key={weekday}>
            {weekday}
          </span>
        ))}
        {days.map((day) => {
          const isCurrentMonth = day.getMonth() === today.getMonth()
          const isToday = day.toDateString() === today.toDateString()
          const dayClassName = [
            'day-cell',
            isCurrentMonth ? '' : 'muted-day',
            isToday ? 'current-day' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <span className={dayClassName} key={day.toISOString()}>
              {day.getDate()}
            </span>
          )
        })}
      </div>
    </section>
  )
}
