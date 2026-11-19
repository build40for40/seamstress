import { isGarmentWork } from './billing'
import { monthOf, monthRange } from './time'
import type { Member, PayRate, TimeEntry } from './types'

export type TimesheetEntry = Pick<TimeEntry, 'id' | 'memberId' | 'garmentId' | 'kind' | 'dateLocal' | 'minutes'> & {
  orderId: string | null
}
export type PayRateInput = Pick<PayRate, 'ratePence' | 'effectiveFrom'>

export interface TimesheetDay {
  dateLocal: string
  billableMinutes: number
  generalMinutes: number
  totalMinutes: number
}

export interface TimesheetOrder {
  orderId: string
  minutes: number
}

export interface TimesheetResult {
  memberId: string
  timeZone: string
  month: string
  billableMinutes: number
  generalMinutes: number
  totalMinutes: number
  ratePence: number | null
  payPence: number
  byDay: TimesheetDay[]
  byOrder: TimesheetOrder[]
  entryIds: string[]
}

export function rateOn(payRates: readonly PayRateInput[], dateLocal: string): number | null {
  const sorted = [...payRates].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  const inForce = sorted.filter((rate) => rate.effectiveFrom <= dateLocal).at(-1) ?? sorted[0]
  return inForce?.ratePence ?? null
}

export function timesheet(
  member: Pick<Member, 'id' | 'timeZone'>,
  month: string,
  entries: readonly TimesheetEntry[],
  payRates: readonly PayRateInput[],
): TimesheetResult {
  const mine = entries
    .filter((entry) => entry.memberId === member.id && entry.minutes !== null && monthOf(entry.dateLocal) === month)
    .sort((a, b) => a.dateLocal.localeCompare(b.dateLocal))

  const days = new Map<string, TimesheetDay>()
  const orders = new Map<string, TimesheetOrder>()
  let billableMinutes = 0
  let generalMinutes = 0
  let payNumerator = 0

  for (const entry of mine) {
    const minutes = entry.minutes!
    const billable = isGarmentWork(entry)
    const day = days.get(entry.dateLocal) ?? {
      dateLocal: entry.dateLocal,
      billableMinutes: 0,
      generalMinutes: 0,
      totalMinutes: 0,
    }
    if (billable) {
      billableMinutes += minutes
      day.billableMinutes += minutes
      if (entry.orderId !== null) {
        const order = orders.get(entry.orderId) ?? { orderId: entry.orderId, minutes: 0 }
        order.minutes += minutes
        orders.set(entry.orderId, order)
      }
    } else {
      generalMinutes += minutes
      day.generalMinutes += minutes
    }
    day.totalMinutes += minutes
    days.set(entry.dateLocal, day)
    payNumerator += minutes * (rateOn(payRates, entry.dateLocal) ?? 0)
  }

  return {
    memberId: member.id,
    timeZone: member.timeZone,
    month,
    billableMinutes,
    generalMinutes,
    totalMinutes: billableMinutes + generalMinutes,
    ratePence: rateOn(payRates, monthRange(month).last),
    payPence: Math.round(payNumerator / 60),
    byDay: [...days.values()],
    byOrder: [...orders.values()].sort((a, b) => b.minutes - a.minutes || a.orderId.localeCompare(b.orderId)),
    entryIds: mine.map((entry) => entry.id),
  }
}
