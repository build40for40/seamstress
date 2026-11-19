import { activityStatement } from './activity'
import { insertClient, type NewClient } from './clients'
import { db, newId, nowIso, randomToken, updateStatement } from './db'
import { insertAssignment, insertGarment } from './garments'
import type { OrderRow, OrderStatus } from './rows'

export type NewOrderGarment = { description: string; assigneeIds?: string[] }

export type NewOrder = {
  client: { id: string } | NewClient
  description: string
  quote_pence: number | null
  due_date: string | null
  express: boolean
  garments: NewOrderGarment[]
}

export const newTrackingToken = () => randomToken(24)

export const listOrders = (teamId: string, { status }: { status?: OrderStatus } = {}) =>
  db()
    .prepare(
      `SELECT * FROM orders WHERE team_id = ? ${status ? 'AND status = ?' : ''}
       ORDER BY due_date IS NULL, due_date, number`,
    )
    .bind(...(status ? [teamId, status] : [teamId]))
    .all<OrderRow>()
    .then((result) => result.results)

export const getOrder = (teamId: string, orderId: string) =>
  db().prepare('SELECT * FROM orders WHERE team_id = ? AND id = ?').bind(teamId, orderId).first<OrderRow>()

export const findOrderByTrackingToken = (token: string) =>
  db().prepare('SELECT * FROM orders WHERE tracking_token = ?').bind(token).first<OrderRow>()

export async function createOrder(teamId: string, order: NewOrder, createdBy: string) {
  const orderId = newId()
  const now = nowIso()
  const statements: D1PreparedStatement[] = []

  let clientId: string
  if ('id' in order.client) {
    const exists = await db()
      .prepare('SELECT 1 FROM clients WHERE team_id = ? AND id = ?')
      .bind(teamId, order.client.id)
      .first()
    if (!exists) return null
    clientId = order.client.id
  } else {
    clientId = newId()
    statements.push(insertClient(teamId, clientId, order.client))
  }

  statements.push(
    db()
      .prepare(
        `INSERT INTO orders (id, team_id, number, client_id, description, quote_pence, due_date, express, tracking_token, created_at, updated_at)
         SELECT ?, id, 'SE-' || next_order_number, ?, ?, ?, ?, ?, ?, ?, ? FROM teams WHERE id = ?`,
      )
      .bind(
        orderId,
        clientId,
        order.description,
        order.quote_pence,
        order.due_date,
        order.express ? 1 : 0,
        newTrackingToken(),
        now,
        now,
        teamId,
      ),
    db().prepare('UPDATE teams SET next_order_number = next_order_number + 1 WHERE id = ?').bind(teamId),
  )

  order.garments.forEach((garment, position) => {
    const garmentId = newId()
    statements.push(insertGarment(teamId, orderId, garmentId, position, garment.description))
    for (const memberId of new Set(garment.assigneeIds ?? [])) {
      statements.push(insertAssignment(teamId, garmentId, memberId))
    }
  })

  statements.push(activityStatement(teamId, { orderId, memberId: createdBy, kind: 'created' }))

  await db().batch(statements)
  return (await getOrder(teamId, orderId))!
}

export type OrderPatch = Partial<Pick<OrderRow, 'client_id' | 'description' | 'quote_pence' | 'due_date' | 'express' | 'status'>>

export async function updateOrder(teamId: string, orderId: string, patch: OrderPatch) {
  const statement = updateStatement<OrderRow>('orders', teamId, orderId, { ...patch, updated_at: nowIso() }, [
    'client_id',
    'description',
    'quote_pence',
    'due_date',
    'express',
    'status',
    'updated_at',
  ])
  await statement?.run()
  return getOrder(teamId, orderId)
}

export async function regenerateTrackingToken(teamId: string, orderId: string) {
  const token = newTrackingToken()
  const result = await db()
    .prepare('UPDATE orders SET tracking_token = ?, updated_at = ? WHERE team_id = ? AND id = ?')
    .bind(token, nowIso(), teamId, orderId)
    .run()
  return result.meta.changes > 0 ? token : null
}
