import { describe, expect, it } from 'vitest'
import { dueLabel, formatDate, formatDateTime, initials, parsePounds, penceToPoundsText, todayInLondon } from './format'

describe('dates in Europe/London', () => {
  it("takes today from London, not the browser's zone", () => {
    expect(todayInLondon(new Date('2026-06-30T23:30:00Z'))).toBe('2026-07-01')
    expect(todayInLondon(new Date('2026-11-19T23:30:00Z'))).toBe('2026-11-19')
  })

  it('shows a short date, with the year only when it differs', () => {
    expect(formatDate('2026-11-19', '2026-11-19')).toBe('Thu 19 Nov')
    expect(formatDate('2027-01-04', '2026-11-19')).toBe('4 Jan 2027')
  })

  it('shows an instant at its London wall time', () => {
    expect(formatDateTime('2026-07-01T08:05:00Z', '2026-07-01')).toBe('Wed 1 Jul, 09:05')
  })

  it('says how far off a due date is', () => {
    expect(dueLabel('2026-11-19', '2026-11-19')).toBe('due today')
    expect(dueLabel('2026-11-20', '2026-11-19')).toBe('due tomorrow')
    expect(dueLabel('2026-11-17', '2026-11-19')).toBe('2 days late')
    expect(dueLabel('2026-12-10', '2026-11-19')).toBe('due Thu 10 Dec')
  })
})

describe('money input', () => {
  it('reads pounds as pence', () => {
    expect(parsePounds('25')).toBe(2500)
    expect(parsePounds('£1,200.5')).toBe(120050)
    expect(parsePounds('12.345')).toBeNull()
    expect(parsePounds('abc')).toBeNull()
  })

  it('writes pence back as pounds', () => {
    expect(penceToPoundsText(2500)).toBe('25')
    expect(penceToPoundsText(2550)).toBe('25.50')
    expect(penceToPoundsText(null)).toBe('')
  })
})

describe('initials', () => {
  it('takes the first and last name', () => {
    expect(initials('Ada Mary Example')).toBe('AE')
    expect(initials('bea')).toBe('B')
  })
})
