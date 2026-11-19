import { describe, expect, it } from 'vitest'
import { entries, members, payRatesFor, timesheets } from './test/fixtures'
import { rateOn, timesheet } from './timesheet'

const member = (id: string) => members.find((m) => m.id === id)!
const sheetFor = (memberId: string, month: string) =>
  timesheet(member(memberId), month, entries, payRatesFor(memberId))

describe('timesheet', () => {
  it.each(timesheets.map((sheet) => [sheet.memberId, sheet.month, sheet] as const))(
    '%s %s matches the fixture totals and pay',
    (memberId, month, expected) => {
      const sheet = sheetFor(memberId, month)
      expect(sheet.totalMinutes).toBe(expected.totalMinutes)
      expect(sheet.payPence).toBe(expected.payPence)
    },
  )

  it('splits billable and general time', () => {
    const sheet = sheetFor('S01', '2026-10')
    expect(sheet.billableMinutes).toBe(38 * 60)
    expect(sheet.generalMinutes).toBe(30)
    expect(sheet.byOrder).toEqual([{ orderId: 'SE-1001', minutes: 38 * 60 }])
    expect(sheet.byDay.find((day) => day.dateLocal === '2026-10-13')).toEqual({
      dateLocal: '2026-10-13',
      billableMinutes: 180,
      generalMinutes: 30,
      totalMinutes: 210,
    })
  })

  it("SE-1004's hours split across October and November", () => {
    const october = sheetFor('S03', '2026-10').byOrder.find((order) => order.orderId === 'SE-1004')
    const november = sheetFor('S03', '2026-11').byOrder.find((order) => order.orderId === 'SE-1004')
    expect(october?.minutes).toBe(3.5 * 60)
    expect(november?.minutes).toBe(4.5 * 60)
  })

  it("keeps SE-1005's held-back sleeve on Bea's timesheet", () => {
    const sheet = sheetFor('S02', '2026-11')
    expect(sheet.entryIds).toContain('T028')
    expect(sheet.byOrder.find((order) => order.orderId === 'SE-1005')?.minutes).toBe(17.5 * 60 + 180)
  })

  it('only ever counts her own hours', () => {
    const sheet = sheetFor('S04', '2026-11')
    expect(sheet.totalMinutes).toBe(0)
    expect(sheet.entryIds).toEqual([])
  })

  it('gives the same totals when run twice', () => {
    expect(sheetFor('S02', '2026-11')).toEqual(sheetFor('S02', '2026-11'))
  })

  it('pays each entry at the rate in force on its date', () => {
    const rates = [
      { ratePence: 1800, effectiveFrom: '2026-01-01' },
      { ratePence: 2000, effectiveFrom: '2026-11-15' },
    ]
    const sheet = timesheet(member('S01'), '2026-11', entries, rates)
    expect(sheet.payPence).toBe(1.5 * 2000 + 1 * 2000)
    expect(timesheet(member('S01'), '2026-10', entries, rates).payPence).toBe(38.5 * 1800)
    expect(sheet.ratePence).toBe(2000)
  })

  it('skips a running timer', () => {
    const running = { ...entries[0]!, id: 'running', minutes: null, dateLocal: '2026-11-19' }
    expect(timesheet(member('S01'), '2026-11', [running], payRatesFor('S01')).totalMinutes).toBe(0)
  })
})

describe('rateOn', () => {
  const rates = [
    { ratePence: 2000, effectiveFrom: '2026-11-15' },
    { ratePence: 1800, effectiveFrom: '2026-06-01' },
  ]

  it('uses the latest rate on or before the date', () => {
    expect(rateOn(rates, '2026-11-14')).toBe(1800)
    expect(rateOn(rates, '2026-11-15')).toBe(2000)
  })

  it('falls back to the earliest rate before any applies', () => {
    expect(rateOn(rates, '2026-01-01')).toBe(1800)
    expect(rateOn([], '2026-01-01')).toBeNull()
  })
})
