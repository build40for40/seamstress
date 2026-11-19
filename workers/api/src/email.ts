import { formatMinutes, formatPence } from '@seamstress/shared'
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

const POSTMARK_URL = 'https://api.postmarkapp.com/email/withTemplate'

export const clientEmail = (team: TeamRow, client: ClientRow | null, { automatic = true } = {}) =>
  client?.email && (!automatic || team.auto_email_clients === 1) ? client.email : null

const camel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function withText(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withText)
  if (typeof value !== 'object' || value === null) return value
  const model: Record<string, unknown> = {}
  for (const [rawKey, entry] of Object.entries(value)) {
    const key = camel(rawKey)
    model[key] = withText(entry)
    if (typeof entry === 'number' && (key === 'pence' || key.endsWith('Pence'))) model[`${key}Text`] = formatPence(entry)
    else if (typeof entry === 'number' && (key === 'minutes' || key.endsWith('Minutes'))) model[`${key}Text`] = formatMinutes(entry)
    else if (typeof entry === 'string' && key === 'dueDate') model.dueDateText = dayFormat.format(new Date(`${entry}T12:00:00Z`))
    else if (typeof entry === 'string' && key === 'month') model.monthText = monthFormat.format(new Date(`${entry}-01T12:00:00Z`))
  }
  return model
}

export const templateModel = (team: TeamRow, model: Record<string, unknown>) => ({
  atelierName: team.name,
  ...(withText(model) as Record<string, unknown>),
})

const headerSafe = (text: string) => text.replace(/["<>\\\r\n]/g, '').trim()

async function deliver(env: Env, alias: EmailAlias, { team, to, model }: Email) {
  const response = await fetch(POSTMARK_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN,
    },
    body: JSON.stringify({
      From: `"${headerSafe(team.name)} via Seamless" <${env.EMAIL_FROM}>`,
      To: to,
      ReplyTo: team.reply_to_email,
      TemplateAlias: alias,
      TemplateModel: templateModel(team, model),
      MessageStream: 'outbound',
    }),
  })
  if (response.ok) return
  const body = (await response.json().catch(() => null)) as { Message?: string } | null
  throw new Error(`Postmark said ${response.status}${body?.Message ? `: ${body.Message}` : ''}`)
}

async function sendAndLog(env: Env, alias: EmailAlias, email: Email) {
  let detail: Record<string, unknown>
  try {
    if (!env.POSTMARK_SERVER_TOKEN) throw new Error('No Postmark token is set')
    await deliver(env, alias, email)
    detail = { alias, to: email.to, status: 'sent' }
  } catch (error) {
    console.error(`email ${alias} failed`, error)
    detail = { alias, to: email.to, status: 'failed', error: error instanceof Error ? error.message : String(error) }
  }
  try {
    await logActivity(email.team.id, { orderId: email.orderId ?? null, kind: 'email', detail })
  } catch (error) {
    console.error('could not log the email', error)
  }
}

export function sendEmail(env: Env, ctx: Pick<ExecutionContext, 'waitUntil'>, alias: EmailAlias, email: Email) {
  ctx.waitUntil(sendAndLog(env, alias, email))
}
