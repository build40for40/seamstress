import { describe, expect, it } from 'vitest'
import {
  createEntrySchema,
  createOrderSchema,
  createTeamSchema,
  monthSchema,
  reviewSchema,
  startTimerSchema,
  updateInvoiceSchema,
} from './schemas'

describe('startTimerSchema', () => {
  it('defaults to sewing on a garment and waiting on general time', () => {
    expect(startTimerSchema.parse({ garmentId: 'g1' })).toEqual({ garmentId: 'g1', kind: 'sewing' })
    expect(startTimerSchema.parse({ garmentId: null })).toEqual({ garmentId: null, kind: 'waiting' })
  })

  it('refuses waiting on a garment and sewing on general time', () => {
    expect(startTimerSchema.safeParse({ garmentId: 'g1', kind: 'waiting' }).success).toBe(false)
    expect(startTimerSchema.safeParse({ garmentId: null, kind: 'sewing' }).success).toBe(false)
  })
})

describe('createEntrySchema', () => {
  const entry = { garmentId: 'g1', kind: 'fitting', dateLocal: '2026-11-18', minutes: 120 }

  it('takes typed time on a garment', () => {
    expect(createEntrySchema.parse(entry)).toMatchObject(entry)
  })

  it('refuses whole-minute nonsense and bad dates', () => {
    expect(createEntrySchema.safeParse({ ...entry, minutes: 0 }).success).toBe(false)
    expect(createEntrySchema.safeParse({ ...entry, minutes: 1.5 }).success).toBe(false)
    expect(createEntrySchema.safeParse({ ...entry, dateLocal: '2026-02-30' }).success).toBe(false)
  })
})

describe('createOrderSchema', () => {
  const order = {
    client: { name: 'Client Six (fake)', phone: '000 000' },
    description: 'Hem',
    quotePence: 2500,
    dueDate: '2026-11-27',
    garments: [{ description: 'Trousers: hem' }],
  }

  it('takes a new client inline and fills in the defaults', () => {
    expect(createOrderSchema.parse(order)).toMatchObject({
      express: false,
      garments: [{ description: 'Trousers: hem', assigneeIds: [] }],
    })
  })

  it('takes an existing client by id', () => {
    expect(createOrderSchema.parse({ ...order, client: { id: 'c1' } }).client).toEqual({ id: 'c1' })
  })

  it('asks for a quote, a due date and a garment', () => {
    expect(createOrderSchema.safeParse({ ...order, quotePence: undefined }).success).toBe(false)
    expect(createOrderSchema.safeParse({ ...order, dueDate: '' }).success).toBe(false)
    expect(createOrderSchema.safeParse({ ...order, garments: [] }).success).toBe(false)
  })
})

describe('other bodies', () => {
  it('wants money in whole pence', () => {
    const team = { name: 'Atelier (fake)', replyToEmail: 'atelier@example.com', hourlyRatePence: 6000 }
    expect(createTeamSchema.safeParse(team).success).toBe(true)
    expect(createTeamSchema.safeParse({ ...team, hourlyRatePence: 60.5 }).success).toBe(false)
    expect(createTeamSchema.safeParse({ ...team, replyToEmail: 'nope' }).success).toBe(false)
  })

  it('lets a final price be cleared', () => {
    expect(updateInvoiceSchema.parse({ finalPricePence: null })).toEqual({ finalPricePence: null })
  })

  it('defaults review lists to empty', () => {
    expect(reviewSchema.parse({ approveOrderId: 'o1' })).toEqual({ entries: [], photos: [], approveOrderId: 'o1' })
  })

  it('checks months', () => {
    expect(monthSchema.safeParse('2026-11').success).toBe(true)
    expect(monthSchema.safeParse('2026-13').success).toBe(false)
  })
})
