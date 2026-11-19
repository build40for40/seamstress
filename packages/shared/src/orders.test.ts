import { describe, expect, it } from 'vitest'
import { canMoveOrder, dueFlag, garmentRef, invoiceNumber, orderNumber, workroomOrder } from './orders'
import { garmentsOf, orderById, orders } from './test/fixtures'

const TODAY = '2026-11-19'
const flagFor = (id: string) => dueFlag({ ...orderById(id), garments: garmentsOf(id) }, TODAY)

describe('dueFlag', () => {
  it('flags the fixture orders as of 19 November', () => {
    expect(Object.fromEntries(orders.map((order) => [order.id, flagFor(order.id)]))).toEqual({
      'SE-1001': null,
      'SE-1002': null,
      'SE-1003': 'due_soon',
      'SE-1004': null,
      'SE-1005': 'overdue',
      'SE-1006': null,
    })
  })

  it('counts due today and in two days as due soon, three days as fine', () => {
    const order = { status: 'open' as const, garments: [{ status: 'todo' as const }] }
    expect(dueFlag({ ...order, dueDate: '2026-11-19' }, TODAY)).toBe('due_soon')
    expect(dueFlag({ ...order, dueDate: '2026-11-21' }, TODAY)).toBe('due_soon')
    expect(dueFlag({ ...order, dueDate: '2026-11-22' }, TODAY)).toBeNull()
  })

  it('drops the flag once every garment is done', () => {
    expect(dueFlag({ dueDate: '2026-11-01', status: 'open', garments: [{ status: 'done' }] }, TODAY)).toBeNull()
  })
})

describe('workroomOrder', () => {
  it('puts express first, then due date, then the most recently worked', () => {
    const list = [
      { id: 'late', express: false, dueDate: '2026-12-12', lastWorkedAt: '2026-11-18T10:00:00Z' },
      { id: 'soon-old', express: false, dueDate: '2026-11-20', lastWorkedAt: '2026-11-10T10:00:00Z' },
      { id: 'never', express: false, dueDate: '2026-11-20', lastWorkedAt: null },
      { id: 'soon-new', express: false, dueDate: '2026-11-20', lastWorkedAt: '2026-11-18T10:00:00Z' },
      { id: 'express', express: true, dueDate: '2026-12-30', lastWorkedAt: null },
    ]
    expect(list.sort(workroomOrder).map((order) => order.id)).toEqual([
      'express',
      'soon-new',
      'soon-old',
      'never',
      'late',
    ])
  })
})

describe('canMoveOrder', () => {
  it('only offers ready once every garment is done', () => {
    expect(canMoveOrder({ status: 'open' }, 'ready', garmentsOf('SE-1003'))).toBe(false)
    expect(canMoveOrder({ status: 'open' }, 'ready', garmentsOf('SE-1002'))).toBe(true)
  })

  it('goes ready to collected, and never back from collected', () => {
    expect(canMoveOrder({ status: 'ready' }, 'collected', [])).toBe(true)
    expect(canMoveOrder({ status: 'open' }, 'collected', [])).toBe(false)
    expect(canMoveOrder({ status: 'collected' }, 'open', [])).toBe(false)
    expect(canMoveOrder({ status: 'open' }, 'cancelled', [])).toBe(true)
  })
})

describe('numbers', () => {
  it('formats order, garment and invoice numbers', () => {
    expect(orderNumber(1001)).toBe('SE-1001')
    expect(garmentRef('SE-1003', 0)).toBe('SE-1003-A')
    expect(garmentRef('SE-1003', 1)).toBe('SE-1003-B')
    expect(garmentRef('SE-1003', 26)).toBe('SE-1003-AA')
    expect(invoiceNumber(1)).toBe('INV-0001')
  })
})
