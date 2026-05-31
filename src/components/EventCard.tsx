import { useState } from 'react'
import { Clock3, XCircle } from 'lucide-react'
import type { CalendarEvent } from '../types/calendar'

interface EventCardProps {
  event: CalendarEvent
  onCancelEvent?: (eventId: string) => Promise<CalendarEvent | undefined>
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

export function EventCard({ event, onCancelEvent }: EventCardProps) {
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string>()
  const canCancel = event.status === 'scheduled' && Boolean(onCancelEvent)

  const handleCancelEvent = async () => {
    if (!onCancelEvent || isCancelling) {
      return
    }

    setIsCancelling(true)
    setCancelError(undefined)

    try {
      const cancelledEvent = await onCancelEvent(event.id)

      if (!cancelledEvent) {
        setCancelError('日程不存在')
      }
    } catch {
      setCancelError('取消失败')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <article className="event-card">
      <div className="event-time">
        <Clock3 size={16} strokeWidth={2.2} />
        {formatEventTime(event.startAt)}
      </div>
      <div className="event-body">
        <h3>{event.title}</h3>
        {event.note ? <p>{event.note}</p> : null}
        {cancelError ? <p className="event-action-error">{cancelError}</p> : null}
      </div>
      <div className="event-actions">
        <span className={`event-status status-${event.status}`}>{statusLabels[event.status]}</span>
        {canCancel ? (
          <button
            className="cancel-event-button"
            type="button"
            onClick={handleCancelEvent}
            disabled={isCancelling}
            aria-label={`取消预约：${event.title}`}
          >
            <XCircle size={15} strokeWidth={2.2} />
            {isCancelling ? '取消中' : '取消预约'}
          </button>
        ) : null}
      </div>
    </article>
  )
}
