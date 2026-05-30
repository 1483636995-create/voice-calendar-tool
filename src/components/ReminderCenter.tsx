import { BellRing } from 'lucide-react'
import { useEventReminders, type EventReminderItem } from '../hooks/useEventReminders'
import type { CalendarEvent } from '../types/calendar'

interface ReminderCenterProps {
  events: CalendarEvent[]
}

const permissionLabels: Record<string, string> = {
  default: '开启通知',
  denied: '通知已关闭',
  granted: '通知已开启',
  unsupported: '不支持通知',
}

const formatReminderTime = (value: Date): string => {
  return value.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getReminderStatusLabel = (item: EventReminderItem): string => {
  if (item.isDue) {
    return '提醒中'
  }

  if (item.minutesUntilReminder <= 1) {
    return '1分钟内'
  }

  if (item.minutesUntilReminder < 60) {
    return `${item.minutesUntilReminder}分钟后`
  }

  const hours = Math.ceil(item.minutesUntilReminder / 60)
  return `${hours}小时后`
}

const buildReminderNote = (item: EventReminderItem): string => {
  const startTime = formatReminderTime(new Date(item.event.startAt))

  if (item.leadMinutes > 0) {
    return `日程 ${startTime} 开始，提前 ${item.leadMinutes} 分钟提醒`
  }

  return `日程 ${startTime} 开始时提醒`
}

export function ReminderCenter({ events }: ReminderCenterProps) {
  const {
    activeReminder,
    dismissActiveReminder,
    notificationPermission,
    reminderItems,
    requestNotificationPermission,
  } = useEventReminders(events)
  const canRequestNotification = notificationPermission === 'default'

  return (
    <section className="reminder-panel" aria-labelledby="reminder-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reminder</p>
          <h2 id="reminder-title">提醒中心</h2>
        </div>
        <button
          className="notification-button"
          type="button"
          onClick={() => void requestNotificationPermission()}
          disabled={!canRequestNotification}
        >
          <BellRing size={16} strokeWidth={2.2} />
          {permissionLabels[notificationPermission]}
        </button>
      </div>

      {activeReminder ? (
        <div className="active-reminder" role="alert">
          <div>
            <strong>{activeReminder.event.title}</strong>
            <p>{buildReminderNote(activeReminder)}</p>
          </div>
          <button className="ack-button" type="button" onClick={dismissActiveReminder}>
            知道了
          </button>
        </div>
      ) : null}

      <div className="event-list compact-list">
        {reminderItems.length > 0 ? (
          reminderItems.slice(0, 4).map((item) => (
            <article className={`reminder-card ${item.isDue ? 'is-due' : ''}`} key={item.key}>
              <div className="event-time">{formatReminderTime(item.reminderAt)}</div>
              <div className="event-body">
                <h3>{item.event.title}</h3>
                <p>{buildReminderNote(item)}</p>
              </div>
              <span className="event-status status-scheduled">{getReminderStatusLabel(item)}</span>
            </article>
          ))
        ) : (
          <div className="empty-state">暂无即将提醒</div>
        )}
      </div>
    </section>
  )
}
