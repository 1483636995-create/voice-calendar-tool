import { Clock3 } from 'lucide-react'
import type { CalendarEvent } from '../types/calendar'

interface EventCardProps {
  event: CalendarEvent
}

const statusLabels: Record<CalendarEvent['status'], string> = {
  scheduled: '待开始',
  completed: '已完成',
  cancelled: '已取消',
}

const formatEventTime = (value: string): string => {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="event-card">
      <div className="event-time">
        <Clock3 size={16} strokeWidth={2.2} />
        {formatEventTime(event.startAt)}
      </div>
      <div className="event-body">
        <h3>{event.title}</h3>
        {event.note ? <p>{event.note}</p> : null}
      </div>
      <span className={`event-status status-${event.status}`}>{statusLabels[event.status]}</span>
    </article>
  )
}
