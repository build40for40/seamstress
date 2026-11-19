import { db, newId, nowIso } from './db'
import type { PhotoRow, ReviewStatus } from './rows'

export type NewPhoto = Pick<PhotoRow, 'garment_id' | 'member_id' | 'taken_on'> &
  Partial<Pick<PhotoRow, 'caption' | 'label' | 'review_status'>>

export const photoKey = (teamId: string, photoId: string, at = new Date()) => `teams/${teamId}/${at.getTime()}-${photoId}.jpg`

export const getPhoto = (teamId: string, photoId: string) =>
  db().prepare('SELECT * FROM photos WHERE team_id = ? AND id = ?').bind(teamId, photoId).first<PhotoRow>()

export const findPhoto = (photoId: string) =>
  db().prepare('SELECT * FROM photos WHERE id = ?').bind(photoId).first<PhotoRow>()

export function listPhotos(teamId: string, filter: { orderId?: string; garmentIds?: string[]; reviewStatus?: ReviewStatus }) {
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
  if (filter.reviewStatus) {
    where.push('review_status = ?')
    values.push(filter.reviewStatus)
  }
  return db()
    .prepare(`SELECT * FROM photos WHERE ${where.join(' AND ')} ORDER BY taken_on, created_at`)
    .bind(...values)
    .all<PhotoRow>()
    .then((result) => result.results)
}

export async function createPhoto(teamId: string, photo: NewPhoto, id = newId()) {
  const result = await db()
    .prepare(
      `INSERT INTO photos (id, team_id, garment_id, member_id, r2_key, caption, label, review_status, taken_on, created_at)
       SELECT ?, g.team_id, g.id, m.id, ?, ?, ?, ?, ?, ? FROM garments g JOIN members m ON m.team_id = g.team_id
       WHERE g.team_id = ? AND g.id = ? AND m.id = ?`,
    )
    .bind(
      id,
      photoKey(teamId, id),
      photo.caption ?? null,
      photo.label ?? null,
      photo.review_status ?? 'waiting',
      photo.taken_on,
      nowIso(),
      teamId,
      photo.garment_id,
      photo.member_id,
    )
    .run()
  return result.meta.changes > 0 ? getPhoto(teamId, id) : null
}

export const setPhotoReviewStatement = (teamId: string, photoId: string, status: ReviewStatus) =>
  db().prepare('UPDATE photos SET review_status = ? WHERE team_id = ? AND id = ?').bind(status, teamId, photoId)

export const deletePhoto = (teamId: string, photoId: string) =>
  db().prepare('DELETE FROM photos WHERE team_id = ? AND id = ?').bind(teamId, photoId).run()
