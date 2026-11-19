import { describe, expect, it } from 'vitest'
import { clockTime, formatLongDay, formatRelativeDay, greeting, startedLabel, stopwatch, zonedToUtc } from './dates'

describe('workroom dates', () => {
  it('formats a local date without shifting it', () => {
    expect(formatLongDay('2026-11-10')).toBe('Tuesday 10 November')
  })

  it('names today, yesterday and other days', () => {
    expect(formatRelativeDay('2026-11-19', '2026-11-19')).toBe('today')
    expect(formatRelativeDay('2026-11-18', '2026-11-19')).toBe('yesterday')
    expect(formatRelativeDay('2026-11-10', '2026-11-19')).toBe('Tue 10 Nov')
  })

  it('shows clock times in her own time zone', () => {
    expect(clockTime('2026-11-18T09:05:00Z', 'Europe/London')).toBe('9:05')
    expect(clockTime('2026-11-18T09:05:00Z', 'America/New_York')).toBe('4:05')
  })

  it('turns a time she picks in her zone into UTC, across summer time', () => {
    expect(zonedToUtc('2026-11-18', '17:30', 'Europe/London')).toBe('2026-11-18T17:30:00.000Z')
    expect(zonedToUtc('2026-07-01', '17:30', 'Europe/London')).toBe('2026-07-01T16:30:00.000Z')
    expect(zonedToUtc('2026-11-18', '17:30', 'Asia/Kolkata')).toBe('2026-11-18T12:00:00.000Z')
  })

  it('says when a forgotten timer started', () => {
    expect(startedLabel('2026-11-18T09:05:00Z', 'Europe/London', new Date('2026-11-19T08:00:00Z'))).toBe(
      'Started 9:05 yesterday',
    )
  })

  it('greets by her local hour and ticks as h:mm:ss', () => {
    expect(greeting(new Date('2026-11-19T08:00:00Z'), 'Europe/London')).toBe('Morning')
    expect(greeting(new Date('2026-11-19T08:00:00Z'), 'America/Los_Angeles')).toBe('Up late')
    expect(stopwatch(5_107_000)).toBe('1:25:07')
  })
})
