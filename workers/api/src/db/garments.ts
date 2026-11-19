import { db, newId, nowIso, updateStatement } from './db'
import type { AssignmentRow, GarmentRow } from './rows'

export type AssigneeRow = Pick<AssignmentRow, 'garment_id' | 'member_id' | 'assigned_at'> & { name: string }

const garmentLetter = (position: number) =>
  position < 26 ? String.fromCharCode(65 + position) : String(position + 1)

export const insertGarment = (teamId: string, orderId: string, garmentId: string, position: number, description: string) =>
  db()
    .prepare(
      `INSERT INTO garments (id, team_id, order_id, ref, position, description, created_at, updated_at)
       SELECT ?, team_id, id, number || '-' || ?, ?, ?, ?, ? FROM orders WHERE team_id = ? AND id = ?`,
    )
    .bind(garmentId, garmentLetter(position), position, description, nowIso(), nowIso(), teamId, orderId)

export const insertAssignment = (teamId: string, garmentId: string, memberId: string) =>
  db()
    .prepare(
      `INSERT INTO garment_assignments (id, team_id, garment_id, member_id, assigned_at)
       SELECT ?, team_id, ?, id, ? FROM members WHERE team_id = ? AND id = ? AND removed_at IS NULL
       ON CONFLICT DO NOTHING`,
    )
    .bind(newId(), garmentId, nowIso(), teamId, memberId)

export const getGarment = (teamId: string, garmentId: string) =>
  db().prepare('SELECT * FROM garments WHERE team_id = ? AND id = ?').bind(teamId, garmentId).first<GarmentRow>()

export const listGarments = (teamId: string, orderIds: string[]) =>
  db()
    .prepare(
      `SELECT * FROM garments WHERE team_id = ? AND order_id IN (SELECT value FROM json_each(?))
       ORDER BY order_id, position`,
    )
    .bind(teamId, JSON.stringify(orderIds))
    .all<GarmentRow>()
    .then((result) => result.results)

export async function addGarment(teamId: string, orderId: string, garment: { description: string; assigneeIds?: string[] }) {
  const last = await db()
    .prepare('SELECT max(position) AS position FROM garments WHERE team_id = ? AND order_id = ?')
    .bind(teamId, orderId)
    .first<{ position: number | null }>()
  const id = newId()
  await db().batch([
    insertGarment(teamId, orderId, id, (last?.position ?? -1) + 1, garment.description),
    ...[...new Set(garment.assigneeIds ?? [])].map((memberId) => insertAssignment(teamId, id, memberId)),
  ])
  return getGarment(teamId, id)
}

export async function updateGarment(teamId: string, garmentId: string, patch: Partial<Pick<GarmentRow, 'description' | 'status'>>) {
  await updateStatement<GarmentRow>('garments', teamId, garmentId, { ...patch, updated_at: nowIso() }, [
    'description',
    'status',
    'updated_at',
  ])?.run()
  return getGarment(teamId, garmentId)
}

export const listAssignees = (teamId: string, garmentIds: string[]) =>
  db()
    .prepare(
      `SELECT a.garment_id, a.member_id, a.assigned_at, m.name FROM garment_assignments a
       JOIN members m ON m.id = a.member_id
       WHERE a.team_id = ? AND a.removed_at IS NULL AND a.garment_id IN (SELECT value FROM json_each(?))
       ORDER BY a.assigned_at`,
    )
    .bind(teamId, JSON.stringify(garmentIds))
    .all<AssigneeRow>()
    .then((result) => result.results)

export async function setAssignees(teamId: string, garmentId: string, memberIds: string[]) {
  if (!(await getGarment(teamId, garmentId))) return null
  const ids = [...new Set(memberIds)]
  await db().batch([
    db()
      .prepare(
        `UPDATE garment_assignments SET removed_at = ?
         WHERE team_id = ? AND garment_id = ? AND removed_at IS NULL AND member_id NOT IN (SELECT value FROM json_each(?))`,
      )
      .bind(nowIso(), teamId, garmentId, JSON.stringify(ids)),
    ...ids.map((memberId) => insertAssignment(teamId, garmentId, memberId)),
  ])
  return listAssignees(teamId, [garmentId])
}

export async function isAssigned(teamId: string, garmentId: string, memberId: string) {
  const row = await db()
    .prepare(
      'SELECT 1 FROM garment_assignments WHERE team_id = ? AND garment_id = ? AND member_id = ? AND removed_at IS NULL',
    )
    .bind(teamId, garmentId, memberId)
    .first()
  return row !== null
}
