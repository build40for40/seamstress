import { db, newId, nowIso, randomToken, updateStatement } from './db'
import type { MemberRow, PayRateRow, TeamRow } from './rows'

export type MemberWithTeam = { member: MemberRow; team: TeamRow }

export async function hashKey(key: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const newMemberKey = () => randomToken(32)

const memberWithTeam = (where: string) => `
  SELECT m.id, m.team_id, m.role, m.name, m.time_zone, m.workos_user_id, m.key_hash, m.removed_at, m.created_at,
    json_object(
      'id', t.id, 'name', t.name, 'reply_to_email', t.reply_to_email, 'hourly_rate_pence', t.hourly_rate_pence,
      'auto_email_clients', t.auto_email_clients, 'show_pay_estimate', t.show_pay_estimate,
      'next_order_number', t.next_order_number, 'next_invoice_number', t.next_invoice_number, 'created_at', t.created_at,
      'business_address', t.business_address, 'company_number', t.company_number, 'vat_number', t.vat_number,
      'bank_account_name', t.bank_account_name, 'bank_sort_code', t.bank_sort_code,
      'bank_account_number', t.bank_account_number, 'bank_iban', t.bank_iban, 'bank_bic', t.bank_bic,
      'payment_terms', t.payment_terms
    ) AS team
  FROM members m JOIN teams t ON t.id = m.team_id
  WHERE ${where} AND m.removed_at IS NULL`

async function findMemberWithTeam(where: string, value: string): Promise<MemberWithTeam | null> {
  const row = await db().prepare(memberWithTeam(where)).bind(value).first<MemberRow & { team: string }>()
  if (!row) return null
  const { team, ...member } = row
  return { member, team: JSON.parse(team) as TeamRow }
}

export const findActiveMemberByWorkosUser = (workosUserId: string) =>
  findMemberWithTeam('m.workos_user_id = ?', workosUserId)

export async function findActiveMemberByKey(key: string) {
  return findMemberWithTeam('m.key_hash = ?', await hashKey(key))
}

export const listMembers = (teamId: string, { includeRemoved = false } = {}) =>
  db()
    .prepare(
      `SELECT * FROM members WHERE team_id = ? ${includeRemoved ? '' : 'AND removed_at IS NULL'} ORDER BY role, name`,
    )
    .bind(teamId)
    .all<MemberRow>()
    .then((result) => result.results)

export const getMember = (teamId: string, memberId: string) =>
  db().prepare('SELECT * FROM members WHERE team_id = ? AND id = ?').bind(teamId, memberId).first<MemberRow>()

export type NewMember = {
  name: string
  role?: MemberRow['role']
  timeZone: string
  ratePence: number
  effectiveFrom: string
}

export async function createMember(teamId: string, member: NewMember) {
  const id = newId()
  const key = newMemberKey()
  await db().batch([
    db()
      .prepare('INSERT INTO members (id, team_id, role, name, time_zone, key_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, teamId, member.role ?? 'seamstress', member.name, member.timeZone, await hashKey(key), nowIso()),
    insertPayRate(teamId, id, member.ratePence, member.effectiveFrom),
  ])
  return { id, key }
}

export type MemberPatch = Partial<Pick<MemberRow, 'name' | 'time_zone'>>

export async function updateMember(teamId: string, memberId: string, patch: MemberPatch) {
  await updateStatement<MemberRow>('members', teamId, memberId, patch, ['name', 'time_zone'])?.run()
  return getMember(teamId, memberId)
}

export async function issueMemberKey(teamId: string, memberId: string) {
  const key = newMemberKey()
  const result = await db()
    .prepare('UPDATE members SET key_hash = ? WHERE team_id = ? AND id = ? AND removed_at IS NULL')
    .bind(await hashKey(key), teamId, memberId)
    .run()
  return result.meta.changes > 0 ? key : null
}

export async function removeMember(teamId: string, memberId: string) {
  const result = await db()
    .prepare('UPDATE members SET removed_at = ?, key_hash = NULL WHERE team_id = ? AND id = ? AND removed_at IS NULL')
    .bind(nowIso(), teamId, memberId)
    .run()
  return result.meta.changes > 0
}

const insertPayRate = (teamId: string, memberId: string, ratePence: number, effectiveFrom: string) =>
  db()
    .prepare('INSERT INTO pay_rates (id, team_id, member_id, rate_pence, effective_from) VALUES (?, ?, ?, ?, ?)')
    .bind(newId(), teamId, memberId, ratePence, effectiveFrom)

export async function addPayRate(teamId: string, memberId: string, ratePence: number, effectiveFrom: string) {
  if (!(await getMember(teamId, memberId))) return false
  await insertPayRate(teamId, memberId, ratePence, effectiveFrom).run()
  return true
}

export const listPayRates = (teamId: string, memberIds?: string[]) => {
  const filter = memberIds ? `AND member_id IN (SELECT value FROM json_each(?))` : ''
  const statement = db().prepare(
    `SELECT * FROM pay_rates WHERE team_id = ? ${filter} ORDER BY member_id, effective_from`,
  )
  return (memberIds ? statement.bind(teamId, JSON.stringify(memberIds)) : statement.bind(teamId))
    .all<PayRateRow>()
    .then((result) => result.results)
}
