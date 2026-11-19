import { db, nowIso } from './db'
import type { GarmentRow, OrderRow, OrderStatus, TimeEntryRow } from './rows'

export type MemberOrderRow = OrderRow & { other_garments: number; last_worked_at: string | null }
export type MemberGarmentRow = GarmentRow & { my_minutes: number }

const assignedTo = (garment: string) =>
  `EXISTS (SELECT 1 FROM garment_assignments a WHERE a.garment_id = ${garment}.id AND a.member_id = ?1 AND a.removed_at IS NULL)`

export async function listMemberOrders(teamId: string, memberId: string, statuses: OrderStatus[] = ['open']) {
  const orders = await db()
    .prepare(
      `SELECT o.*,
         (SELECT count(*) FROM garments g WHERE g.team_id = ?2 AND g.order_id = o.id AND NOT ${assignedTo('g')}) AS other_garments,
         (SELECT max(coalesce(e.started_at, e.created_at)) FROM time_entries e JOIN garments g ON g.id = e.garment_id
            WHERE e.team_id = ?2 AND e.member_id = ?1 AND g.order_id = o.id) AS last_worked_at
       FROM orders o
       WHERE o.team_id = ?2 AND o.status IN (SELECT value FROM json_each(?3))
         AND EXISTS (SELECT 1 FROM garments g WHERE g.team_id = ?2 AND g.order_id = o.id AND ${assignedTo('g')})
       ORDER BY o.express DESC, o.due_date IS NULL, o.due_date, o.number`,
    )
    .bind(memberId, teamId, JSON.stringify(statuses))
    .all<MemberOrderRow>()
  const garments = await listMemberGarments(teamId, memberId, orders.results.map((order) => order.id))
  return { orders: orders.results, garments }
}

export const listMemberGarments = (teamId: string, memberId: string, orderIds: string[]) =>
  db()
    .prepare(
      `SELECT g.*,
         coalesce((SELECT sum(e.minutes) FROM time_entries e WHERE e.team_id = ?2 AND e.garment_id = g.id AND e.member_id = ?1), 0) AS my_minutes
       FROM garments g
       WHERE g.team_id = ?2 AND g.order_id IN (SELECT value FROM json_each(?3)) AND ${assignedTo('g')}
       ORDER BY g.order_id, g.position`,
    )
    .bind(memberId, teamId, JSON.stringify(orderIds))
    .all<MemberGarmentRow>()
    .then((result) => result.results)

export async function getMemberGarment(teamId: string, memberId: string, garmentId: string) {
  const garment = await db()
    .prepare(
      `SELECT g.*,
         coalesce((SELECT sum(e.minutes) FROM time_entries e WHERE e.team_id = ?2 AND e.garment_id = g.id AND e.member_id = ?1), 0) AS my_minutes
       FROM garments g WHERE g.team_id = ?2 AND g.id = ?3 AND ${assignedTo('g')}`,
    )
    .bind(memberId, teamId, garmentId)
    .first<MemberGarmentRow>()
  if (!garment) return null
  const order = await db()
    .prepare('SELECT * FROM orders WHERE team_id = ? AND id = ?')
    .bind(teamId, garment.order_id)
    .first<OrderRow>()
  return order ? { garment, order } : null
}

export type EntryWithRef = TimeEntryRow & { garment_ref: string | null }

export const getMemberEntry = (teamId: string, memberId: string, entryId: string) =>
  db()
    .prepare(
      `SELECT e.*, g.ref AS garment_ref FROM time_entries e LEFT JOIN garments g ON g.id = e.garment_id
       WHERE e.team_id = ? AND e.member_id = ? AND e.id = ?`,
    )
    .bind(teamId, memberId, entryId)
    .first<EntryWithRef>()

export const runningTimer = (teamId: string, memberId: string) =>
  db()
    .prepare(
      `SELECT e.*, g.ref AS garment_ref FROM time_entries e LEFT JOIN garments g ON g.id = e.garment_id
       WHERE e.team_id = ? AND e.member_id = ? AND e.ended_at IS NULL AND e.started_at IS NOT NULL`,
    )
    .bind(teamId, memberId)
    .first<EntryWithRef>()

export const finishTimerStatement = (teamId: string, entryId: string, endedAt: string, minutes: number) =>
  db()
    .prepare(
      `UPDATE time_entries SET ended_at = ?, minutes = ?, updated_at = ?
       WHERE team_id = ? AND id = ? AND ended_at IS NULL`,
    )
    .bind(endedAt, minutes, nowIso(), teamId, entryId)

export const discardTimerStatement = (teamId: string, entryId: string) =>
  db().prepare('DELETE FROM time_entries WHERE team_id = ? AND id = ? AND ended_at IS NULL').bind(teamId, entryId)

export const startGarmentStatement = (teamId: string, garmentId: string) =>
  db()
    .prepare(`UPDATE garments SET status = 'in_progress', updated_at = ? WHERE team_id = ? AND id = ? AND status = 'todo'`)
    .bind(nowIso(), teamId, garmentId)

export const listOrderGarmentStatuses = (teamId: string, orderId: string) =>
  db()
    .prepare('SELECT status FROM garments WHERE team_id = ? AND order_id = ?')
    .bind(teamId, orderId)
    .all<Pick<GarmentRow, 'status'>>()
    .then((result) => result.results)

export type MemberMonthEntry = {
  id: string
  memberId: string
  garmentId: string | null
  kind: TimeEntryRow['kind']
  dateLocal: string
  minutes: number | null
  orderId: string | null
  orderNumber: string | null
}

export const listMemberEntriesBetween = (teamId: string, memberId: string, from: string, to: string) =>
  db()
    .prepare(
      `SELECT e.id, e.member_id AS memberId, e.garment_id AS garmentId, e.kind, e.date_local AS dateLocal, e.minutes,
         o.id AS orderId, o.number AS orderNumber
       FROM time_entries e
       LEFT JOIN garments g ON g.id = e.garment_id AND g.team_id = e.team_id
       LEFT JOIN orders o ON o.id = g.order_id AND o.team_id = e.team_id
       WHERE e.team_id = ? AND e.member_id = ? AND e.date_local BETWEEN ? AND ?
       ORDER BY e.date_local, coalesce(e.started_at, e.created_at)`,
    )
    .bind(teamId, memberId, from, to)
    .all<MemberMonthEntry>()
    .then((result) => result.results)
