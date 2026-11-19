import { db } from './db'
import type { GarmentRow, OrderRow, OrderStatus } from './rows'

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
