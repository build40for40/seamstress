import { activityStatement } from './activity'
import { db, newId, nowIso } from './db'
import type { TimesheetRow } from './rows'

export const listTimesheets = (teamId: string, filter: { month?: string; memberId?: string } = {}) => {
  const where = ['team_id = ?']
  const values: unknown[] = [teamId]
  if (filter.month) {
    where.push('month = ?')
    values.push(filter.month)
  }
  if (filter.memberId) {
    where.push('member_id = ?')
    values.push(filter.memberId)
  }
  return db()
    .prepare(`SELECT * FROM timesheets WHERE ${where.join(' AND ')} ORDER BY month, member_id`)
    .bind(...values)
    .all<TimesheetRow>()
    .then((result) => result.results)
}

export const sentMonths = (teamId: string, memberId: string) =>
  listTimesheets(teamId, { memberId }).then((rows) => rows.map((row) => row.month))

export const getTimesheet = (teamId: string, memberId: string, month: string) =>
  db()
    .prepare('SELECT * FROM timesheets WHERE team_id = ? AND member_id = ? AND month = ?')
    .bind(teamId, memberId, month)
    .first<TimesheetRow>()

export async function sendTimesheet(teamId: string, memberId: string, month: string) {
  await db()
    .prepare(
      `INSERT INTO timesheets (id, team_id, member_id, month, sent_at)
       SELECT ?, team_id, id, ?, ? FROM members WHERE team_id = ? AND id = ?
       ON CONFLICT DO NOTHING`,
    )
    .bind(newId(), month, nowIso(), teamId, memberId)
    .run()
  return getTimesheet(teamId, memberId, month)
}

export async function reopenTimesheet(teamId: string, memberId: string, month: string, reopenedBy: string) {
  if (!(await getTimesheet(teamId, memberId, month))) return false
  await db().batch([
    db().prepare('DELETE FROM timesheets WHERE team_id = ? AND member_id = ? AND month = ?').bind(teamId, memberId, month),
    activityStatement(teamId, { memberId: reopenedBy, kind: 'timesheet_reopened', detail: { memberId, month } }),
  ])
  return true
}
