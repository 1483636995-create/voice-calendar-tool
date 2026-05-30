export const getCalendarMonthDays = (date: Date): Date[] => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const startOffset = firstDay.getDay()
  const endOffset = 6 - lastDay.getDay()
  const start = new Date(firstDay)
  const totalDays = startOffset + lastDay.getDate() + endOffset
  start.setDate(firstDay.getDate() - startOffset)

  return Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}
