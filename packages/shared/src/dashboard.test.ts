import { describe, expect, it } from 'vitest'
import { dashboard } from './dashboard'
import { entries, invoices, orders, ratePence } from './test/fixtures'

const sentInvoices = invoices.map((invoice) => ({
  sentAt: invoice.sentAt,
  totalPence: invoice.finalPricePence ?? invoice.hourlyTotalPence,
  minutes: invoice.minutes,
}))

describe('dashboard', () => {
  const november = dashboard(entries, sentInvoices, orders, ratePence, '2026-11')

  it('values unbilled work at the hourly rate', () => {
    expect(november.unbilled.pence).toBe(231_000)
  })

  it('works out what November invoices earned per hour against the rate', () => {
    expect(november.earned).toEqual({
      invoiceCount: 1,
      minutes: 38 * 60,
      pence: 240_000,
      perHourPence: 6316,
      ratePence: 6000,
    })
  })

  it('counts active orders over their quote', () => {
    expect(november.overQuote).toEqual({ count: 1, orderIds: ['SE-1002'] })
  })

  it("shares billed hours over paid hours, leaving out waiting and the held-back sleeve", () => {
    expect(november.billableShare.paidMinutes).toBe(39.5 * 60)
    expect(november.billableShare.billableMinutes).toBe(35 * 60)
    expect(november.billableShare.share).toBeCloseTo(35 / 39.5)
  })

  it('shows nothing earned in a month with no invoices sent', () => {
    const october = dashboard(entries, sentInvoices, orders, ratePence, '2026-10')
    expect(october.earned.perHourPence).toBeNull()
    expect(october.billableShare.paidMinutes).toBe(42 * 60)
  })
})
