import { addDays, localDate } from '@seamless/shared/time'

const noon = (dateLocal: string) => new Date(`${dateLocal}T12:00:00Z`)

const longDay = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
const shortDay = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
const monthName = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' })
const monthOnly = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long' })

export const formatLongDay = (dateLocal: string) => longDay.format(noon(dateLocal))

export const formatShortDay = (dateLocal: string) => shortDay.format(noon(dateLocal))

export const formatMonth = (month: string) => monthName.format(noon(`${month}-01`))

export const formatMonthName = (month: string) => monthOnly.format(noon(`${month}-01`))

export function formatRelativeDay(dateLocal: string, today: string) {
  if (dateLocal === today) return 'today'
  if (dateLocal === addDays(today, -1)) return 'yesterday'
  if (dateLocal === addDays(today, 1)) return 'tomorrow'
  return formatShortDay(dateLocal)
}

function parts(instant: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((part) => part.type === type)?.value ?? 0)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') }
}

export function clockTime(instant: string | Date, timeZone: string) {
  const { hour, minute } = parts(new Date(instant), timeZone)
  return `${hour}:${String(minute).padStart(2, '0')}`
}

export function clockInput(instant: string | Date, timeZone: string) {
  const { hour, minute } = parts(new Date(instant), timeZone)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export const localHour = (instant: string | Date, timeZone: string) => parts(new Date(instant), timeZone).hour

function offsetMs(instant: Date, timeZone: string) {
  const p = parts(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

export function zonedToUtc(dateLocal: string, time: string, timeZone: string): string {
  const [year, month, day] = dateLocal.split('-').map(Number) as [number, number, number]
  const [hour, minute] = time.split(':').map(Number) as [number, number]
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const first = guess - offsetMs(new Date(guess), timeZone)
  const second = guess - offsetMs(new Date(first), timeZone)
  return new Date(second).toISOString()
}

export function startedLabel(startedAt: string, timeZone: string, now: Date = new Date()) {
  const day = formatRelativeDay(localDate(startedAt, timeZone), localDate(now, timeZone))
  return `Started ${clockTime(startedAt, timeZone)} ${day}`
}

export function greeting(now: Date, timeZone: string) {
  const hour = localHour(now, timeZone)
  if (hour < 5) return 'Up late'
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

export function stopwatch(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${hours}:${pad(minutes)}:${pad(seconds)}`
}
