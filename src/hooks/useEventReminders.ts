import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSpeechSynthesis } from './useSpeechSynthesis'
import type { CalendarEvent } from '../types/calendar'

type NotificationPermissionState = NotificationPermission | 'unsupported'

export interface EventReminderItem {
  event: CalendarEvent
  key: string
  reminderAt: Date
  leadMinutes: number
  minutesUntilReminder: number
  isDue: boolean
}

interface UseEventRemindersResult {
  activeReminder?: EventReminderItem
  dismissActiveReminder: () => void
  notificationPermission: NotificationPermissionState
  reminderItems: EventReminderItem[]
  requestNotificationPermission: () => Promise<void>
}

const DEFAULT_REMINDER_MINUTES = 30
const UPCOMING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const DUE_GRACE_MS = 10 * 60 * 1000
const CLOCK_TICK_MS = 30 * 1000

const getNotificationPermission = (): NotificationPermissionState => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return window.Notification.permission
}

export const getReminderLeadMinutes = (event: CalendarEvent): number => {
  return event.reminderMinutesBefore ?? DEFAULT_REMINDER_MINUTES
}

export const getReminderTime = (event: CalendarEvent): Date => {
  const startAt = new Date(event.startAt)
  const reminderAt = new Date(startAt)
  reminderAt.setMinutes(reminderAt.getMinutes() - getReminderLeadMinutes(event))
  return reminderAt
}

export const getReminderItems = (events: CalendarEvent[], now: Date): EventReminderItem[] => {
  const nowTime = now.getTime()

  return events
    .filter((event) => event.status === 'scheduled')
    .map((event) => {
      const reminderAt = getReminderTime(event)
      const eventStartTime = new Date(event.startAt).getTime()
      const reminderTime = reminderAt.getTime()
      const minutesUntilReminder = Math.ceil((reminderTime - nowTime) / 60000)

      return {
        event,
        key: `${event.id}:${reminderAt.toISOString()}`,
        reminderAt,
        leadMinutes: getReminderLeadMinutes(event),
        minutesUntilReminder,
        isDue: nowTime >= reminderTime && nowTime <= eventStartTime + DUE_GRACE_MS,
      }
    })
    .filter((item) => {
      const reminderTime = item.reminderAt.getTime()
      const eventStartTime = new Date(item.event.startAt).getTime()
      const isUpcoming = reminderTime > nowTime && reminderTime <= nowTime + UPCOMING_WINDOW_MS
      const isDueOrRecent = nowTime >= reminderTime && nowTime <= eventStartTime + DUE_GRACE_MS

      return isUpcoming || isDueOrRecent
    })
    .sort((left, right) => left.reminderAt.getTime() - right.reminderAt.getTime())
}

const buildReminderSpeech = (item: EventReminderItem): string => {
  return `日程提醒：${item.event.title}，将在 ${new Date(item.event.startAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })} 开始`
}

export const useEventReminders = (events: CalendarEvent[]): UseEventRemindersResult => {
  const [now, setNow] = useState(() => new Date())
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>(getNotificationPermission)
  const [notifiedKeys, setNotifiedKeys] = useState<string[]>([])
  const [activeReminder, setActiveReminder] = useState<EventReminderItem>()
  const { speak } = useSpeechSynthesis()

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => window.clearInterval(intervalId)
  }, [])

  const reminderItems = useMemo(() => getReminderItems(events, now), [events, now])

  const nextDueReminder = useMemo(() => {
    return reminderItems.find((item) => item.isDue && !notifiedKeys.includes(item.key))
  }, [notifiedKeys, reminderItems])

  useEffect(() => {
    if (!nextDueReminder) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setNotifiedKeys((previousKeys) => [...previousKeys, nextDueReminder.key])
      setActiveReminder(nextDueReminder)

      const message = buildReminderSpeech(nextDueReminder)
      speak(message)

      if (notificationPermission === 'granted') {
        new Notification('日程提醒', {
          body: `${nextDueReminder.event.title} 即将开始`,
          tag: nextDueReminder.key,
        })
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [nextDueReminder, notificationPermission, speak])

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported')
      return
    }

    const permission = await window.Notification.requestPermission()
    setNotificationPermission(permission)
  }, [])

  const dismissActiveReminder = useCallback(() => {
    setActiveReminder(undefined)
  }, [])

  return {
    activeReminder,
    dismissActiveReminder,
    notificationPermission,
    reminderItems,
    requestNotificationPermission,
  }
}
