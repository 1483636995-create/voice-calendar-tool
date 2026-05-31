import { useState } from 'react'
import { Check, Clock3, Trash2, X, XCircle } from 'lucide-react'
import type { CalendarEvent } from '../types/calendar'

interface EventCardProps {
  event: CalendarEvent
  onDeleteEvent?: (eventId: string) => Promise<CalendarEvent | undefined>
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

export function EventCard({ event, onDeleteEvent }: EventCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()
  const canDelete = Boolean(onDeleteEvent)
  const deleteButtonLabel = event.status === 'scheduled' ? '取消预约' : '删除记录'

  const handleDeleteEvent = async () => {
    if (!onDeleteEvent || isDeleting) {
      return
    }

    setIsDeleting(true)
    setDeleteError(undefined)

    try {
      const deletedEvent = await onDeleteEvent(event.id)

      if (!deletedEvent) {
        setDeleteError('日程不存在')
      }
    } catch {
      setDeleteError('删除失败')
    } finally {
      setIsDeleting(false)
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
        {deleteError ? <p className="event-action-error">{deleteError}</p> : null}
      </div>
      <div className="event-actions">
        <span className={`event-status status-${event.status}`}>{statusLabels[event.status]}</span>
        {canDelete ? (
          isConfirmingDelete ? (
            <div className="event-delete-confirm" role="group" aria-label={`确认删除：${event.title}`}>
              <button
                className="confirm-delete-button"
                type="button"
                onClick={handleDeleteEvent}
                disabled={isDeleting}
              >
                <Check size={14} strokeWidth={2.4} />
                {isDeleting ? '删除中' : '确认删除'}
              </button>
              <button
                className="dismiss-delete-button"
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
                aria-label={`放弃删除：${event.title}`}
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>
          ) : (
            <button
              className="delete-event-button"
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              aria-label={`${deleteButtonLabel}：${event.title}`}
            >
              {event.status === 'scheduled' ? (
                <XCircle size={15} strokeWidth={2.2} />
              ) : (
                <Trash2 size={15} strokeWidth={2.2} />
              )}
              {deleteButtonLabel}
            </button>
          )
        ) : null}
      </div>
    </article>
  )
}
