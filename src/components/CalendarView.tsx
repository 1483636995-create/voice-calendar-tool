import type { ChangeEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { getCalendarMonthDays } from '../lib/calendarGrid'

interface CalendarViewProps {
  today: Date
  visibleMonth: Date
  onVisibleMonthChange: (date: Date) => void
  todayCount: number
  weekCount: number
  totalCount: number
}

const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  label: `${index + 1}月`,
  value: index,
}))

const getMonthStart = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

const getYearOptions = (visibleYear: number): number[] => {
  return Array.from({ length: 11 }, (_, index) => visibleYear - 5 + index)
}

export function CalendarView({
  today,
  visibleMonth,
  onVisibleMonthChange,
  todayCount,
  weekCount,
  totalCount,
}: CalendarViewProps) {
  const monthStart = getMonthStart(visibleMonth)
  const days = getCalendarMonthDays(monthStart)
  const monthLabel = monthStart.toLocaleDateString('zh-CN', {
    month: 'long',
    year: 'numeric',
  })
  const yearOptions = getYearOptions(monthStart.getFullYear())
  const todayMonth = getMonthStart(today)

  const changeVisibleMonth = (year: number, month: number) => {
    onVisibleMonthChange(new Date(year, month, 1))
  }

  const handlePreviousMonth = () => {
    changeVisibleMonth(monthStart.getFullYear(), monthStart.getMonth() - 1)
  }

  const handleNextMonth = () => {
    changeVisibleMonth(monthStart.getFullYear(), monthStart.getMonth() + 1)
  }

  const handleYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
    changeVisibleMonth(Number(event.target.value), monthStart.getMonth())
  }

  const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    changeVisibleMonth(monthStart.getFullYear(), Number(event.target.value))
  }

  return (
    <section className="calendar-panel" aria-labelledby="calendar-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2 id="calendar-title">{monthLabel}</h2>
        </div>
        <CalendarDays size={22} strokeWidth={2.1} />
      </div>

      <div className="calendar-controls" aria-label="切换日历月份">
        <button
          aria-label="查看上个月"
          className="icon-button"
          onClick={handlePreviousMonth}
          title="上个月"
          type="button"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="calendar-select-group">
          <select
            aria-label="选择年份"
            className="calendar-select year-select"
            onChange={handleYearChange}
            value={monthStart.getFullYear()}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}年
              </option>
            ))}
          </select>
          <select
            aria-label="选择月份"
            className="calendar-select month-select"
            onChange={handleMonthChange}
            value={monthStart.getMonth()}
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
        <button
          aria-label="查看下个月"
          className="icon-button"
          onClick={handleNextMonth}
          title="下个月"
          type="button"
        >
          <ChevronRight size={18} strokeWidth={2.2} />
        </button>
        <button
          aria-label="回到本月"
          className="icon-button"
          onClick={() => onVisibleMonthChange(todayMonth)}
          title="回到本月"
          type="button"
        >
          <RotateCcw size={17} strokeWidth={2.2} />
        </button>
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
            day.getFullYear() === monthStart.getFullYear() && day.getMonth() === monthStart.getMonth()
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
