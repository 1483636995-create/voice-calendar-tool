import { BellRing } from 'lucide-react'
import { EventCard } from './EventCard'
import type { CalendarEvent } from '../types/calendar'

interface ReminderCenterProps {
  events: CalendarEvent[]
}

export function ReminderCenter({ events }: ReminderCenterProps) {
  return (
    <section className="reminder-panel" aria-labelledby="reminder-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reminder</p>
          <h2 id="reminder-title">提醒中心</h2>
        </div>
        <BellRing size={22} strokeWidth={2.1} />
      </div>

      <div className="event-list compact-list">
        {events.length > 0 ? (
          events.map((event) => <EventCard event={event} key={event.id} />)
        ) : (
          <div className="empty-state">暂无即将提醒</div>
        )}
      </div>
    </section>
  )
}
