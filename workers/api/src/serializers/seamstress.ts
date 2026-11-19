import type { MemberRow, OrderRow, PhotoRow, TeamRow, TimeEntryRow } from '../db/rows'
import type { MemberGarmentRow, MemberOrderRow } from '../db/workroom'

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

export const seamstressOrder = (order: MemberOrderRow, garments: MemberGarmentRow[]) => ({
  ...seamstressOrderSummary(order),
  lastWorkedAt: order.last_worked_at,
  garments: garments.filter((garment) => garment.order_id === order.id).map(seamstressGarment),
  otherGarments: order.other_garments,
})

export const seamstressEntry = (entry: TimeEntryRow) => ({
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
