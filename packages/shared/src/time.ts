const MINUTE_MS = 60_000
const FORGOTTEN_AFTER_MINUTES = 8 * 60

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    formatters.set(timeZone, formatter)
  }
  return formatter
}

export function isTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone)
    return true
  } catch {
    return false
  }
}

export function localDate(instant: string | Date, timeZone: string): string {
  const parts = formatterFor(timeZone).formatToParts(new Date(instant))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function monthOf(dateLocal: string): string {
  return dateLocal.slice(0, 7)
}

function toUtcDate(dateLocal: string): Date {
  return new Date(`${dateLocal}T00:00:00Z`)
}

function fromUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(dateLocal: string, days: number): string {
  const date = toUtcDate(dateLocal)
  date.setUTCDate(date.getUTCDate() + days)
  return fromUtcDate(date)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / (24 * 60 * MINUTE_MS))
}

export function monthRange(month: string): { first: string; last: string } {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number]
  return {
    first: `${month}-01`,
    last: fromUtcDate(new Date(Date.UTC(year, monthNumber, 0))),
  }
}

export function addMonths(month: string, months: number): string {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number]
  return fromUtcDate(new Date(Date.UTC(year, monthNumber - 1 + months, 1))).slice(0, 7)
}

export function elapsedMinutes(startedAt: string, endedAt: string): number {
  return Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / MINUTE_MS)
}

export function tooShortToKeep(startedAt: string, endedAt: string): boolean {
  return new Date(endedAt).getTime() - new Date(startedAt).getTime() < MINUTE_MS
}

export function timerNeedsCheck(startedAt: string, now: string | Date, timeZone: string): boolean {
  const nowIso = new Date(now).toISOString()
  return (
    elapsedMinutes(startedAt, nowIso) > FORGOTTEN_AFTER_MINUTES ||
    localDate(nowIso, timeZone) !== localDate(startedAt, timeZone)
  )
}
