import { db, newId, nowIso, updateStatement } from './db'
import type { TimeEntryRow } from './rows'

export type EntryFilter = {
  orderId?: string
  garmentIds?: string[]
  memberId?: string
  invoiceId?: string
  reviewStatus?: NonNullable<TimeEntryRow['review_status']>
  from?: string
  to?: string
}

export type NewEntry = Pick<TimeEntryRow, 'member_id' | 'garment_id' | 'kind' | 'date_local' | 'created_by'> &
  Partial<Pick<TimeEntryRow, 'minutes' | 'started_at' | 'ended_at' | 'note' | 'review_status'>>

export const getEntry = (teamId: string, entryId: string) =>
  db().prepare('SELECT * FROM time_entries WHERE team_id = ? AND id = ?').bind(teamId, entryId).first<TimeEntryRow>()

export function listEntries(teamId: string, filter: EntryFilter = {}) {
  const where = ['team_id = ?']
  const values: unknown[] = [teamId]
  if (filter.orderId) {
    where.push('garment_id IN (SELECT id FROM garments WHERE team_id = ? AND order_id = ?)')
    values.push(teamId, filter.orderId)
  }
  if (filter.garmentIds) {
    where.push('garment_id IN (SELECT value FROM json_each(?))')
    values.push(JSON.stringify(filter.garmentIds))
  }
  if (filter.memberId) {
    where.push('member_id = ?')
    values.push(filter.memberId)
  }
  if (filter.invoiceId) {
    where.push('invoice_id = ?')
    values.push(filter.invoiceId)
  }
  if (filter.reviewStatus) {
    where.push('review_status = ?')
    values.push(filter.reviewStatus)
  }
  if (filter.from) {
    where.push('date_local >= ?')
    values.push(filter.from)
  }
  if (filter.to) {
    where.push('date_local <= ?')
    values.push(filter.to)
  }
  return db()
    .prepare(`SELECT * FROM time_entries WHERE ${where.join(' AND ')} ORDER BY date_local, coalesce(started_at, created_at)`)
    .bind(...values)
    .all<TimeEntryRow>()
    .then((result) => result.results)
}

export const runningEntry = (teamId: string, memberId: string) =>
  db()
    .prepare('SELECT * FROM time_entries WHERE team_id = ? AND member_id = ? AND ended_at IS NULL AND started_at IS NOT NULL')
    .bind(teamId, memberId)
    .first<TimeEntryRow>()

export function insertEntry(teamId: string, id: string, entry: NewEntry) {
  const now = nowIso()
  return db()
    .prepare(
      `INSERT INTO time_entries (id, team_id, member_id, garment_id, kind, date_local, minutes, started_at, ended_at, note, review_status, created_by, created_at, updated_at)
       SELECT ?, team_id, id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM members
       WHERE team_id = ? AND id = ? AND (? IS NULL OR EXISTS (SELECT 1 FROM garments WHERE team_id = ? AND id = ?))`,
    )
    .bind(
      id,
      entry.garment_id,
      entry.kind,
      entry.date_local,
      entry.minutes ?? null,
      entry.started_at ?? null,
      entry.ended_at ?? null,
      entry.note ?? null,
      entry.garment_id ? (entry.review_status ?? 'waiting') : null,
      entry.created_by,
      now,
      now,
      teamId,
      entry.member_id,
      entry.garment_id,
      teamId,
      entry.garment_id,
    )
}

export async function createEntry(teamId: string, entry: NewEntry) {
  const id = newId()
  const result = await insertEntry(teamId, id, entry).run()
  return result.meta.changes > 0 ? getEntry(teamId, id) : null
}

export type EntryPatch = Partial<
  Pick<TimeEntryRow, 'garment_id' | 'kind' | 'date_local' | 'minutes' | 'started_at' | 'ended_at' | 'note' | 'review_status' | 'invoice_id'>
>

export const updateEntryStatement = (teamId: string, entryId: string, patch: EntryPatch) =>
  updateStatement<TimeEntryRow>('time_entries', teamId, entryId, { ...patch, updated_at: nowIso() }, [
    'garment_id',
    'kind',
    'date_local',
    'minutes',
    'started_at',
    'ended_at',
    'note',
    'review_status',
    'invoice_id',
    'updated_at',
  ])!

export async function updateEntry(teamId: string, entryId: string, patch: EntryPatch) {
  await updateEntryStatement(teamId, entryId, patch).run()
  return getEntry(teamId, entryId)
}

export async function deleteEntry(teamId: string, entryId: string) {
  const result = await db().prepare('DELETE FROM time_entries WHERE team_id = ? AND id = ?').bind(teamId, entryId).run()
  return result.meta.changes > 0
}
