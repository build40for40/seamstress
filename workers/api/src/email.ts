import { logActivity } from './db/activity'
import type { ClientRow, TeamRow } from './db/rows'

export type EmailAlias =
  | 'seamstress-order-received'
  | 'seamstress-order-ready'
  | 'seamstress-invoice'
  | 'seamstress-garments-done'
  | 'seamstress-timesheet-sent'

export type Email = {
  team: TeamRow
  to: string
  orderId?: string | null
  model: Record<string, unknown>
}

export const clientEmail = (team: TeamRow, client: ClientRow | null, { automatic = true } = {}) =>
  client?.email && (!automatic || team.auto_email_clients === 1) ? client.email : null

export function sendEmail(_env: Env, ctx: ExecutionContext, alias: EmailAlias, email: Email) {
  console.log(`email ${alias} not sent: Postmark isn't wired up yet`)
  ctx.waitUntil(
    logActivity(email.team.id, {
      orderId: email.orderId ?? null,
      kind: 'email',
      detail: { alias, to: email.to, status: 'not_sent' },
    }).catch((error) => console.error('could not log the email', error)),
  )
}
