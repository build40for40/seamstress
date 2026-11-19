import { addDays } from './time'
import type { Garment, Order, OrderStatus } from './types'

export type DueFlag = 'overdue' | 'due_soon' | null

export interface DueFlagInput {
  dueDate: string
  status: OrderStatus
  garments: readonly Pick<Garment, 'status'>[]
}

export const DUE_SOON_DAYS = 2

export function allGarmentsDone(garments: readonly Pick<Garment, 'status'>[]): boolean {
  return garments.length > 0 && garments.every((garment) => garment.status === 'done')
}

export function dueFlag(order: DueFlagInput, today: string): DueFlag {
  if (order.status !== 'open' || allGarmentsDone(order.garments)) return null
  if (order.dueDate < today) return 'overdue'
  if (order.dueDate <= addDays(today, DUE_SOON_DAYS)) return 'due_soon'
  return null
}

export interface WorkroomSortable {
  express: boolean
  dueDate: string
  lastWorkedAt: string | null
}

export function workroomOrder(a: WorkroomSortable, b: WorkroomSortable): number {
  if (a.express !== b.express) return a.express ? -1 : 1
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
  if (a.lastWorkedAt === b.lastWorkedAt) return 0
  if (a.lastWorkedAt === null) return 1
  if (b.lastWorkedAt === null) return -1
  return a.lastWorkedAt > b.lastWorkedAt ? -1 : 1
}

const ORDER_MOVES: Record<OrderStatus, readonly OrderStatus[]> = {
  open: ['ready', 'cancelled'],
  ready: ['open', 'collected', 'cancelled'],
  collected: [],
  cancelled: ['open'],
}

export function canMoveOrder(
  order: Pick<Order, 'status'>,
  to: OrderStatus,
  garments: readonly Pick<Garment, 'status'>[],
): boolean {
  if (!ORDER_MOVES[order.status].includes(to)) return false
  return to !== 'ready' || allGarmentsDone(garments)
}

export function takesTime(order: Pick<Order, 'status'>): boolean {
  return order.status === 'open'
}

export function garmentRef(orderNumber: string, position: number): string {
  let letters = ''
  for (let n = position; n >= 0; n = Math.floor(n / 26) - 1) {
    letters = String.fromCharCode(65 + (n % 26)) + letters
  }
  return `${orderNumber}-${letters}`
}

export function orderNumber(n: number): string {
  return `SE-${n}`
}

export function invoiceNumber(n: number): string {
  return `INV-${String(n).padStart(4, '0')}`
}
