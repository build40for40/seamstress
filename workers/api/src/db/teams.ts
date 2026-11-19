import { db, newId, nowIso } from './db'
import type { TeamRow } from './rows'

export type NewTeam = Pick<TeamRow, 'name' | 'reply_to_email' | 'hourly_rate_pence'>
export type NewOwner = { name: string; workosUserId: string; timeZone?: string }

export const getTeam = (teamId: string) =>
  db().prepare('SELECT * FROM teams WHERE id = ?').bind(teamId).first<TeamRow>()

export async function createTeamWithOwner(team: NewTeam, owner: NewOwner) {
  const teamId = newId()
  const memberId = newId()
  const now = nowIso()
  await db().batch([
    db()
      .prepare('INSERT INTO teams (id, name, reply_to_email, hourly_rate_pence, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(teamId, team.name, team.reply_to_email, team.hourly_rate_pence, now),
    db()
      .prepare(
        "INSERT INTO members (id, team_id, role, name, time_zone, workos_user_id, created_at) VALUES (?, ?, 'owner', ?, ?, ?, ?)",
      )
      .bind(memberId, teamId, owner.name, owner.timeZone ?? 'Europe/London', owner.workosUserId, now),
  ])
  return { teamId, memberId }
}

const PATCHABLE = [
  'name',
  'reply_to_email',
  'hourly_rate_pence',
  'auto_email_clients',
  'show_pay_estimate',
  'business_address',
  'company_number',
  'vat_number',
  'bank_account_name',
  'bank_sort_code',
  'bank_account_number',
  'bank_iban',
  'bank_bic',
  'payment_terms',
] as const

export type TeamPatch = Partial<Pick<TeamRow, (typeof PATCHABLE)[number]>>

export async function updateTeam(teamId: string, patch: TeamPatch) {
  const keys = PATCHABLE.filter((key) => patch[key] !== undefined)
  if (keys.length > 0) {
    await db()
      .prepare(`UPDATE teams SET ${keys.map((key) => `${key} = ?`).join(', ')} WHERE id = ?`)
      .bind(...keys.map((key) => patch[key]), teamId)
      .run()
  }
  return getTeam(teamId)
}
