import { dueFlag, lockReason, type TimesheetResult } from '@seamless/shared'
import type { MemberRow, OrderRow, PhotoRow, TeamRow, TimesheetRow, TimeEntryRow } from '../db/rows'
import type { EntryWithRef, MemberGarmentRow, MemberOrderRow } from '../db/workroom'

export const seamstressMe = (member: MemberRow, team: TeamRow) => ({
  id: member.id,
  name: member.name,
  role: member.role,
  timeZone: member.time_zone,
  team: { name: team.name, showPayEstimate: team.show_pay_estimate === 1 },
})

export const seamstressGarment = (garment: MemberGarmentRow) => ({
  id: garment.id,
  orderId: garment.order_id,
  ref: garment.ref,
  position: garment.position,
  description: garment.description,
  status: garment.status,
  myMinutes: garment.my_minutes,
})

export const seamstressOrderSummary = (order: OrderRow) => ({
  id: order.id,
  number: order.number,
  description: order.description,
  dueDate: order.due_date,
  express: order.express === 1,
  status: order.status,
})

export function seamstressOrder(order: MemberOrderRow, garments: MemberGarmentRow[], today: string) {
  const mine = garments.filter((garment) => garment.order_id === order.id)
  return {
    ...seamstressOrderSummary(order),
    dueFlag: order.due_date ? dueFlag({ dueDate: order.due_date, status: order.status, garments: mine }, today) : null,
    lastWorkedAt: order.last_worked_at,
    garments: mine.map(seamstressGarment),
    otherGarments: order.other_garments,
  }
}

export const seamstressEntry = (entry: TimeEntryRow, sentMonths: readonly string[] = []) => ({
  id: entry.id,
  garmentId: entry.garment_id,
  kind: entry.kind,
  dateLocal: entry.date_local,
  minutes: entry.minutes,
  startedAt: entry.started_at,
  endedAt: entry.ended_at,
  note: entry.note,
  reviewStatus: entry.review_status,
  invoiced: entry.invoice_id !== null,
  locked: lockReason({ invoiceId: entry.invoice_id, dateLocal: entry.date_local }, sentMonths) !== null,
})

export const seamstressSavedEntry = (entry: EntryWithRef, sentMonths: readonly string[] = []) => ({
  ...seamstressEntry(entry, sentMonths),
  garmentRef: entry.garment_ref,
})

export const seamstressTimer = (entry: EntryWithRef, needsCheck: boolean) => ({
  ...seamstressSavedEntry(entry),
  needsCheck,
})

export const seamstressPhoto = (photo: PhotoRow, viewer: MemberRow) => ({
  id: photo.id,
  garmentId: photo.garment_id,
  url: `/photos/${photo.id}`,
  caption: photo.caption,
  label: photo.label,
  reviewStatus: photo.review_status,
  takenOn: photo.taken_on,
  mine: photo.member_id === viewer.id,
})

export const seamstressTimesheet = (
  result: TimesheetResult,
  orderNumbers: Map<string, string>,
  sent: TimesheetRow | null,
  team: TeamRow,
) => {
  const showPay = team.show_pay_estimate === 1
  return {
    month: result.month,
    timeZone: result.timeZone,
    billableMinutes: result.billableMinutes,
    generalMinutes: result.generalMinutes,
    totalMinutes: result.totalMinutes,
    ratePence: showPay ? result.ratePence : null,
    payPence: showPay ? result.payPence : null,
    byDay: result.byDay,
    byOrder: result.byOrder.map((order) => ({ ...order, number: orderNumbers.get(order.orderId) ?? null })),
    sentAt: sent?.sent_at ?? null,
  }
}
