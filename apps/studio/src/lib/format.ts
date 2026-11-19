import { daysBetween, localDate, STUDIO_TIME_ZONE } from '@seamstress/shared'

export { formatMinutes, formatPence } from '@seamstress/shared'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

const dateWithYearFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: STUDIO_TIME_ZONE,
})

const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function todayInLondon(now: Date = new Date()): string {
  return localDate(now, STUDIO_TIME_ZONE)
}

export function formatDate(dateLocal: string, today: string = todayInLondon()): string {
  const date = new Date(`${dateLocal}T00:00:00Z`)
  return dateLocal.slice(0, 4) === today.slice(0, 4) ? dateFormatter.format(date) : dateWithYearFormatter.format(date)
}

export function formatDateTime(instant: string, today: string = todayInLondon()): string {
  return `${formatDate(localDate(instant, STUDIO_TIME_ZONE), today)}, ${timeFormatter.format(new Date(instant))}`
}

export function formatTime(instant: string): string {
  return timeFormatter.format(new Date(instant))
}

export function formatMonth(month: string): string {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`))
}

export function dueLabel(dueDate: string, today: string = todayInLondon()): string {
  const days = daysBetween(today, dueDate)
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  if (days === -1) return 'a day late'
  if (days < 0) return `${-days} days late`
  if (days < 7) return `due in ${days} days`
  return `due ${formatDate(dueDate, today)}`
}

export function parsePounds(text: string): number | null {
  const cleaned = text.replace(/[£,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}

export function penceToPoundsText(pence: number | null): string {
  if (pence === null) return ''
  return pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2)
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0]!.charAt(0)
  const last = words.length > 1 ? words[words.length - 1]!.charAt(0) : ''
  return (first + last).toUpperCase()
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}
