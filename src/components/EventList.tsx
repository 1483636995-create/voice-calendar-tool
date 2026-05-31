import { ListChecks } from 'lucide-react'
import { EventCard } from './EventCard'
import type { CalendarEvent } from '../types/calendar'

interface EventListProps {
  title: string
  events: CalendarEvent[]
  emptyLabel: string
  onCancelEvent?: (eventId: string) => Promise<CalendarEvent | undefined>
}

export function EventList({ title, events, emptyLabel, onCancelEvent }: EventListProps) {
  return (
    <section className="event-list-panel" aria-labelledby="event-list-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Schedule</p>
          <h2 id="event-list-title">{title}</h2>
        </div>
        <ListChecks size={22} strokeWidth={2.1} />
      </div>

      <div className="event-list">
        {events.length > 0 ? (
          events.map((event) => <EventCard event={event} key={event.id} onCancelEvent={onCancelEvent} />)
        ) : (
          <div className="empty-state">{emptyLabel}</div>
        )}
      </div>
    </section>
  )
}
