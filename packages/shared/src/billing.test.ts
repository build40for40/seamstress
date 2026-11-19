import { describe, expect, it } from 'vitest'
import { hourlyTotal, invoiceDraft, isBillable, runningCost, splitPence, unbilled } from './billing'
import { entries, entriesOf, entryById, garmentsOf, invoices, orderById, ratePence } from './test/fixtures'

const draftFor = (orderId: string, overrides: Partial<Parameters<typeof invoiceDraft>[0]> = {}) =>
  invoiceDraft({
    order: orderById(orderId),
    garments: garmentsOf(orderId),
    entries: entriesOf(orderId),
    ratePence,
    ...overrides,
  })

describe('isBillable', () => {
  it('bills approved garment work only', () => {
    expect(isBillable(entryById('T001'))).toBe(true)
    expect(isBillable(entryById('T029'))).toBe(false)
    expect(isBillable(entryById('T006'))).toBe(false)
  })

  it('bills a held-back entry only once it is ticked', () => {
    expect(isBillable(entryById('T028'))).toBe(false)
    expect(isBillable(entryById('T028'), ['T028'])).toBe(true)
  })

  it('never bills waiting time, even if someone ticks it', () => {
    const waiting = { ...entryById('T006'), reviewStatus: 'approved' as const }
    expect(isBillable(waiting, ['T006'])).toBe(false)
  })
})

describe('hourlyTotal', () => {
  it('works in whole pence with no rounding of time', () => {
    expect(hourlyTotal(38 * 60, 6000)).toBe(228_000)
    expect(hourlyTotal(85, 6000)).toBe(8500)
  })

  it('rounds to the nearest penny', () => {
    expect(hourlyTotal(1, 5050)).toBe(84)
    expect(hourlyTotal(1, 5070)).toBe(85)
    expect(hourlyTotal(3, 1010)).toBe(51)
  })
})

describe('runningCost', () => {
  it('shows the client approved hours only, and the owner waiting ones too', () => {
    const se1005 = entriesOf('SE-1005')
    expect(runningCost(se1005, ratePence, 'client')).toEqual({ minutes: 13.5 * 60, pence: 81_000 })
    expect(runningCost(se1005, ratePence, 'owner')).toEqual({ minutes: 17.5 * 60, pence: 105_000 })
  })

  it('never counts the held-back sleeve', () => {
    const cost = runningCost([entryById('T028')], ratePence, 'owner')
    expect(cost.pence).toBe(0)
  })

  it('puts SE-1002 over its quote', () => {
    expect(runningCost(entriesOf('SE-1002'), ratePence, 'owner').pence).toBe(57_000)
    expect(orderById('SE-1002').quotePence).toBe(48_000)
  })
})

describe('unbilled', () => {
  it('finds every hour on no sent invoice, grouped by client and order', () => {
    const result = unbilled(entries, ratePence)
    expect(result.minutes).toBe(38.5 * 60)
    expect(result.pence).toBe(231_000)
    const c001 = result.clients.find((client) => client.clientId === 'C001')!
    expect(c001.orders).toEqual([{ orderId: 'SE-1004', minutes: 8 * 60, pence: 48_000 }])
    const orderIds = result.clients.flatMap((client) => client.orders.map((order) => order.orderId)).sort()
    expect(orderIds).toEqual(['SE-1002', 'SE-1003', 'SE-1004', 'SE-1005'])
  })

  it('leaves out general time and the held-back sleeve', () => {
    const se1005 = unbilled(entriesOf('SE-1005'), ratePence)
    expect(se1005.minutes).toBe(17.5 * 60)
    expect(unbilled([entryById('T006'), entryById('T017')], ratePence).pence).toBe(0)
  })
})

describe('splitPence', () => {
  it('splits so the lines add up to the rounded total', () => {
    const lines = splitPence([1, 1, 1], 5050)
    expect(lines.reduce((sum, pence) => sum + pence, 0)).toBe(hourlyTotal(3, 5050))
    expect(lines).toEqual([85, 84, 84])
  })
})

describe('invoiceDraft', () => {
  it('SE-1001: £2,280 of hours against the £2,400 quote it was billed at', () => {
    const beforeSending = entriesOf('SE-1001').map((entry) => ({ ...entry, invoiceId: null }))
    const draft = draftFor('SE-1001', { entries: beforeSending, finalPricePence: 240_000 })
    const sent = invoices.find((invoice) => invoice.id === 'INV-0001')!
    expect(draft.minutes).toBe(sent.minutes)
    expect(draft.hourlyTotalPence).toBe(228_000)
    expect(draft.hourlyTotalPence).toBe(sent.hourlyTotalPence)
    expect(draft.quotePence).toBe(240_000)
    expect(draft.differencePence).toBe(-12_000)
    expect(draft.totalPence).toBe(240_000)
    expect(draft.entryIds).toHaveLength(10)
  })

  it('SE-1001 once sent: its entries cannot be billed twice', () => {
    const draft = draftFor('SE-1001')
    expect(draft.minutes).toBe(0)
    expect(draft.entryIds).toEqual([])
  })

  it('SE-1002: a £570 draft over its £480 quote with no final price', () => {
    const draft = draftFor('SE-1002')
    expect(draft.hourlyTotalPence).toBe(57_000)
    expect(draft.quotePence).toBe(48_000)
    expect(draft.differencePence).toBe(9000)
    expect(draft.overQuote).toBe(true)
    expect(draft.finalPricePence).toBeNull()
    expect(draft.totalPence).toBe(57_000)
    expect(draft.lines).toEqual([
      {
        garmentId: 'SE-1002-A',
        ref: 'SE-1002-A',
        description: 'Velvet evening coat: reline and new cuffs',
        minutes: 9.5 * 60,
        pence: 57_000,
      },
    ])
  })

  it('SE-1005: leaves out waiting entries with a count and lists the held-back one unticked', () => {
    const draft = draftFor('SE-1005')
    expect(draft.minutes).toBe(13.5 * 60)
    expect(draft.waiting).toEqual({ count: 1, minutes: 4 * 60 })
    expect(draft.heldBack).toEqual([
      expect.objectContaining({ entryId: 'T028', minutes: 180, included: false }),
    ])
    expect(draft.entryIds).not.toContain('T028')
  })

  it('SE-1005: bills the held-back entry once ticked', () => {
    const draft = draftFor('SE-1005', { includedHeldBack: ['T028'] })
    expect(draft.minutes).toBe(16.5 * 60)
    expect(draft.hourlyTotalPence).toBe(99_000)
    expect(draft.heldBack[0]!.included).toBe(true)
    expect(draft.entryIds).toContain('T028')
  })

  it('SE-1003: a line per garment, with the waiting hem left out', () => {
    const draft = draftFor('SE-1003')
    expect(draft.lines.map((line) => [line.ref, line.minutes])).toEqual([
      ['SE-1003-A', 2.5 * 60],
      ['SE-1003-B', 0],
    ])
    expect(draft.waiting.count).toBe(1)
  })
})
