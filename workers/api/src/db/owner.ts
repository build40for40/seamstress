import { activityStatement } from './activity'
import { db, nowIso } from './db'
import type { PhotoRow, ReviewStatus, TimeEntryRow } from './rows'

export type EntryWithOrderRow = TimeEntryRow & { order_id: string | null; client_id: string | null }

export function listEntriesWithOrder(teamId: string, filter: { from?: string; to?: string; orderIds?: string[] } = {}) {
  const where = ['e.team_id = ?1']
  const values: unknown[] = [teamId]
  if (filter.from) {
    values.push(filter.from)
    where.push(`e.date_local >= ?${values.length}`)
  }
  if (filter.to) {
    values.push(filter.to)
    where.push(`e.date_local <= ?${values.length}`)
  }
  if (filter.orderIds) {
    values.push(JSON.stringify(filter.orderIds))
    where.push(`g.order_id IN (SELECT value FROM json_each(?${values.length}))`)
  }
  return db()
    .prepare(
      `SELECT e.*, g.order_id, o.client_id FROM time_entries e
       LEFT JOIN garments g ON g.team_id = ?1 AND g.id = e.garment_id
       LEFT JOIN orders o ON o.team_id = ?1 AND o.id = g.order_id
       WHERE ${where.join(' AND ')}
       ORDER BY e.date_local, coalesce(e.started_at, e.created_at)`,
    )
    .bind(...values)
    .all<EntryWithOrderRow>()
    .then((result) => result.results)
}

export type ReviewTarget = { id: string; order_id: string; invoice_id: string | null; minutes: number | null }

export const listReviewEntryTargets = (teamId: string, ids: string[]) =>
  db()
    .prepare(
      `SELECT e.id, g.order_id, e.invoice_id, e.minutes FROM time_entries e JOIN garments g ON g.id = e.garment_id
       WHERE e.team_id = ? AND g.team_id = e.team_id AND e.id IN (SELECT value FROM json_each(?))`,
    )
    .bind(teamId, JSON.stringify(ids))
    .all<ReviewTarget>()
    .then((result) => result.results)

export const listReviewPhotoTargets = (teamId: string, ids: string[]) =>
  db()
    .prepare(
      `SELECT p.id, g.order_id FROM photos p JOIN garments g ON g.id = p.garment_id
       WHERE p.team_id = ? AND g.team_id = p.team_id AND p.id IN (SELECT value FROM json_each(?))`,
    )
    .bind(teamId, JSON.stringify(ids))
    .all<{ id: string; order_id: string }>()
    .then((result) => result.results)

export const listWaitingOnOrder = (teamId: string, orderId: string) =>
  db()
    .batch<{ id: string }>([
      db()
        .prepare(
          `SELECT e.id FROM time_entries e JOIN garments g ON g.id = e.garment_id
           WHERE e.team_id = ?1 AND g.team_id = ?1 AND g.order_id = ?2
             AND e.review_status = 'waiting' AND e.minutes IS NOT NULL AND e.invoice_id IS NULL`,
        )
        .bind(teamId, orderId),
      db()
        .prepare(
          `SELECT p.id FROM photos p JOIN garments g ON g.id = p.garment_id
           WHERE p.team_id = ?1 AND g.team_id = ?1 AND g.order_id = ?2 AND p.review_status = 'waiting'`,
        )
        .bind(teamId, orderId),
    ])
    .then(([entries, photos]) => ({
      entryIds: entries!.results.map((row) => row.id),
      photoIds: photos!.results.map((row) => row.id),
    }))

export type ReviewDecision = { id: string; status: Exclude<ReviewStatus, 'waiting'> }

export async function applyReview(
  teamId: string,
  reviewer: string,
  { entries, photos }: { entries: ReviewDecision[]; photos: ReviewDecision[] },
  activity: { orderId: string; detail: Record<string, unknown> }[],
) {
  const now = nowIso()
  const statements = [
    ...entries.map(({ id, status }) =>
      db()
        .prepare(
          `UPDATE time_entries SET review_status = ?, updated_at = ?
           WHERE team_id = ? AND id = ? AND garment_id IS NOT NULL AND invoice_id IS NULL AND minutes IS NOT NULL`,
        )
        .bind(status, now, teamId, id),
    ),
    ...photos.map(({ id, status }) =>
      db().prepare('UPDATE photos SET review_status = ? WHERE team_id = ? AND id = ?').bind(status, teamId, id),
    ),
    ...activity.map(({ orderId, detail }) => activityStatement(teamId, { orderId, memberId: reviewer, kind: 'reviewed', detail })),
  ]
  if (statements.length > 0) await db().batch(statements)
}

export type WaitingEntryRow = TimeEntryRow & { order_id: string; ref: string; member_name: string }

export const listWaitingEntries = (teamId: string) =>
  db()
    .prepare(
      `SELECT e.*, g.order_id, g.ref, m.name AS member_name FROM time_entries e
       JOIN garments g ON g.id = e.garment_id AND g.team_id = e.team_id
       JOIN members m ON m.id = e.member_id
       WHERE e.team_id = ? AND e.review_status = 'waiting' AND e.minutes IS NOT NULL AND e.invoice_id IS NULL
       ORDER BY coalesce(e.ended_at, e.created_at) DESC`,
    )
    .bind(teamId)
    .all<WaitingEntryRow>()
    .then((result) => result.results)

export const listWaitingPhotos = (teamId: string) =>
  db()
    .prepare(
      `SELECT p.*, g.order_id, g.ref, m.name AS member_name FROM photos p
       JOIN garments g ON g.id = p.garment_id AND g.team_id = p.team_id
       JOIN members m ON m.id = p.member_id
       WHERE p.team_id = ? AND p.review_status = 'waiting'
       ORDER BY p.created_at DESC`,
    )
    .bind(teamId)
    .all<PhotoRow & { order_id: string; ref: string; member_name: string }>()
    .then((result) => result.results)

export const sessionCounts = (teamId: string, months: string[]) =>
  db()
    .prepare(
      `SELECT
         (SELECT count(*) FROM time_entries WHERE team_id = ?1 AND review_status = 'waiting' AND minutes IS NOT NULL AND invoice_id IS NULL)
           + (SELECT count(*) FROM photos WHERE team_id = ?1 AND review_status = 'waiting') AS waitingReviews,
         (SELECT count(*) FROM timesheets WHERE team_id = ?1 AND month IN (SELECT value FROM json_each(?2))) AS sentTimesheets,
         (SELECT count(*) FROM orders o WHERE o.team_id = ?1 AND o.status = 'open'
            AND EXISTS (SELECT 1 FROM garments g WHERE g.team_id = ?1 AND g.order_id = o.id)
            AND NOT EXISTS (SELECT 1 FROM garments g WHERE g.team_id = ?1 AND g.order_id = o.id AND g.status != 'done')) AS readyToCollect`,
    )
    .bind(teamId, JSON.stringify(months))
    .first<{ waitingReviews: number; sentTimesheets: number; readyToCollect: number }>()
    .then((row) => row ?? { waitingReviews: 0, sentTimesheets: 0, readyToCollect: 0 })
