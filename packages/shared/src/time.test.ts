import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  daysBetween,
  elapsedMinutes,
  isTimeZone,
  localDate,
  monthOf,
  monthRange,
  timerNeedsCheck,
  tooShortToKeep,
} from './time'

describe('localDate', () => {
  it('gives the date where she is, not in UTC', () => {
    expect(localDate('2026-11-18T19:00:00Z', 'Asia/Kolkata')).toBe('2026-11-19')
    expect(localDate('2026-11-18T19:00:00Z', 'Europe/London')).toBe('2026-11-18')
  })

  it('follows British Summer Time', () => {
    expect(localDate('2026-07-31T23:30:00Z', 'Europe/London')).toBe('2026-08-01')
    expect(localDate('2026-12-31T23:30:00Z', 'Europe/London')).toBe('2026-12-31')
  })

  it('puts the end of October in November for Kolkata', () => {
    expect(monthOf(localDate('2026-10-31T20:00:00Z', 'Asia/Kolkata'))).toBe('2026-11')
    expect(monthOf(localDate('2026-10-31T20:00:00Z', 'Europe/Lisbon'))).toBe('2026-10')
  })
})

describe('calendar maths', () => {
  it('adds days across month ends', () => {
    expect(addDays('2026-11-29', 2)).toBe('2026-12-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(daysBetween('2026-11-19', '2026-11-21')).toBe(2)
  })

  it('knows the first and last day of a month', () => {
    expect(monthRange('2026-11')).toEqual({ first: '2026-11-01', last: '2026-11-30' })
    expect(monthRange('2028-02')).toEqual({ first: '2028-02-01', last: '2028-02-29' })
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })

  it('checks time zone names', () => {
    expect(isTimeZone('Europe/Lisbon')).toBe(true)
    expect(isTimeZone('Mars/Olympus')).toBe(false)
  })
})

describe('timer', () => {
  it('counts whole minutes', () => {
    expect(elapsedMinutes('2026-11-19T09:05:00Z', '2026-11-19T10:30:00Z')).toBe(85)
  })

  it('throws away anything under a minute', () => {
    expect(tooShortToKeep('2026-11-19T09:05:00Z', '2026-11-19T09:05:59Z')).toBe(true)
    expect(tooShortToKeep('2026-11-19T09:05:00Z', '2026-11-19T09:06:00Z')).toBe(false)
  })

  it('asks after 8 hours or past her midnight', () => {
    expect(timerNeedsCheck('2026-11-19T09:00:00Z', '2026-11-19T17:00:00Z', 'Europe/London')).toBe(false)
    expect(timerNeedsCheck('2026-11-19T09:00:00Z', '2026-11-19T17:01:00Z', 'Europe/London')).toBe(true)
    expect(timerNeedsCheck('2026-11-19T17:00:00Z', '2026-11-19T19:00:00Z', 'Asia/Kolkata')).toBe(true)
    expect(timerNeedsCheck('2026-11-19T17:00:00Z', '2026-11-19T19:00:00Z', 'Europe/London')).toBe(false)
  })
})
