import { CalendarDays } from 'lucide-react'
import { getCalendarMonthDays } from '../lib/calendarGrid'

interface CalendarViewProps {
  today: Date
  todayCount: number
  weekCount: number
  totalCount: number
}

const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']

export function CalendarView({ today, todayCount, weekCount, totalCount }: CalendarViewProps) {
  const days = getCalendarMonthDays(today)
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
          const isCurrentMonth =
            day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth()
          const isToday = day.toDateString() === today.toDateString()
          if (!isCurrentMonth) {
            return <span aria-hidden="true" className="day-cell empty-day" key={day.toISOString()} />
          }

          const dayClassName = [
            'day-cell',
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
