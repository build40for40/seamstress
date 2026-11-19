import { isGarmentWork, isOverQuote, runningCost, unbilled, type Unbilled, type UnbilledEntry } from './billing'
import { localDate, monthOf } from './time'
import { STUDIO_TIME_ZONE, type Invoice, type Order, type TimeEntry } from './types'

export type DashboardEntry = UnbilledEntry & Pick<TimeEntry, 'dateLocal'>
export type DashboardInvoice = Pick<Invoice, 'sentAt'> & { totalPence: number; minutes: number }
export type DashboardOrder = Pick<Order, 'id' | 'status' | 'quotePence'>

export interface Dashboard {
  month: string
  unbilled: Unbilled
  earned: {
    invoiceCount: number
    minutes: number
    pence: number
    perHourPence: number | null
    ratePence: number
  }
  overQuote: { count: number; orderIds: string[] }
  billableShare: { billableMinutes: number; paidMinutes: number; share: number | null }
}

export function dashboard(
  entries: readonly DashboardEntry[],
  invoices: readonly DashboardInvoice[],
  orders: readonly DashboardOrder[],
  ratePence: number,
  month: string,
): Dashboard {
  const sentThisMonth = invoices.filter(
    (invoice) => invoice.sentAt !== null && monthOf(localDate(invoice.sentAt, STUDIO_TIME_ZONE)) === month,
  )
  const earnedMinutes = sentThisMonth.reduce((sum, invoice) => sum + invoice.minutes, 0)
  const earnedPence = sentThisMonth.reduce((sum, invoice) => sum + invoice.totalPence, 0)

  const overQuoteIds = orders
    .filter((order) => order.status === 'open' || order.status === 'ready')
    .filter((order) =>
      isOverQuote(
        runningCost(
          entries.filter((entry) => entry.orderId === order.id),
          ratePence,
          'owner',
        ),
        order.quotePence,
      ),
    )
    .map((order) => order.id)

  const paidThisMonth = entries.filter((entry) => entry.minutes !== null && monthOf(entry.dateLocal) === month)
  const paidMinutes = paidThisMonth.reduce((sum, entry) => sum + entry.minutes!, 0)
  const billableMinutes = paidThisMonth
    .filter((entry) => isGarmentWork(entry) && (entry.reviewStatus !== 'held_back' || entry.invoiceId !== null))
    .reduce((sum, entry) => sum + entry.minutes!, 0)

  return {
    month,
    unbilled: unbilled(entries, ratePence),
    earned: {
      invoiceCount: sentThisMonth.length,
      minutes: earnedMinutes,
      pence: earnedPence,
      perHourPence: earnedMinutes > 0 ? Math.round((earnedPence * 60) / earnedMinutes) : null,
      ratePence,
    },
    overQuote: { count: overQuoteIds.length, orderIds: overQuoteIds },
    billableShare: {
      billableMinutes,
      paidMinutes,
      share: paidMinutes > 0 ? billableMinutes / paidMinutes : null,
    },
  }
}
