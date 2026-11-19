import { db, newId, nowIso } from './db'
import type { ActivityRow } from './rows'

export type NewActivity = {
  orderId?: string | null
  garmentId?: string | null
  memberId?: string | null
  kind: string
  detail?: Record<string, unknown>
}

export const activityStatement = (teamId: string, activity: NewActivity) =>
  db()
    .prepare(
      'INSERT INTO activity (id, team_id, order_id, garment_id, member_id, kind, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      newId(),
      teamId,
      activity.orderId ?? null,
      activity.garmentId ?? null,
      activity.memberId ?? null,
      activity.kind,
      JSON.stringify(activity.detail ?? {}),
      nowIso(),
    )

export const logActivity = (teamId: string, activity: NewActivity) => activityStatement(teamId, activity).run()

export const listActivity = (teamId: string, orderId: string) =>
  db()
    .prepare('SELECT * FROM activity WHERE team_id = ? AND order_id = ? ORDER BY created_at, rowid')
    .bind(teamId, orderId)
    .all<ActivityRow>()
    .then((result) => result.results)
