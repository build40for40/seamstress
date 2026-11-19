import { addMonths, localDate, monthOf } from '@seamless/shared/time'
import { createTeamSchema, updateTeamSchema } from '@seamless/shared/schemas'
import { BANK_FIELDS, STUDIO_TIME_ZONE } from '@seamless/shared/types'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireOwner, requireUser } from '../auth'
import { logActivity } from '../db/activity'
import { findActiveMemberByWorkosUser, getMember } from '../db/members'
import { sessionCounts } from '../db/owner'
import { createTeamWithOwner, getTeam, updateTeam } from '../db/teams'
import { sendEmail } from '../email'
import type { AppEnv } from '../env'
import * as serialize from '../serializers/owner'
import { validate } from '../validate'

const routes = new Hono<AppEnv>()

const thisMonth = () => monthOf(localDate(new Date(), STUDIO_TIME_ZONE))

routes.get('/session', requireUser, async (c) => {
  const found = await findActiveMemberByWorkosUser(c.var.userId)
  if (!found || found.member.role !== 'owner') return c.json({ member: null, team: null, counts: null })
  const month = thisMonth()
  const counts = await sessionCounts(found.team.id, [addMonths(month, -1), month])
  return c.json({ member: serialize.member(found.member), team: serialize.team(found.team), counts })
})

routes.post('/teams', requireUser, validate('json', createTeamSchema), async (c) => {
  if (await findActiveMemberByWorkosUser(c.var.userId)) {
    throw new HTTPException(409, { message: "You've already set up your atelier." })
  }
  const input = c.req.valid('json')
  const { teamId, memberId } = await createTeamWithOwner(
    { name: input.name, reply_to_email: input.replyToEmail, hourly_rate_pence: input.hourlyRatePence },
    { name: 'Owner', workosUserId: c.var.userId, timeZone: STUDIO_TIME_ZONE },
  )
  const [team, member] = await Promise.all([getTeam(teamId), getMember(teamId, memberId)])
  return c.json({ member: serialize.member(member!), team: serialize.team(team!) }, 201)
})

routes.patch('/team', requireOwner, validate('json', updateTeamSchema), async (c) => {
  const input = c.req.valid('json')
  const flag = (value: boolean | undefined) => (value === undefined ? undefined : value ? 1 : 0)
  const before = c.var.team
  const team = await updateTeam(before.id, {
    name: input.name,
    reply_to_email: input.replyToEmail,
    hourly_rate_pence: input.hourlyRatePence,
    auto_email_clients: flag(input.autoEmailClients),
    show_pay_estimate: flag(input.showPayEstimate),
    business_address: input.businessAddress,
    company_number: input.companyNumber,
    vat_number: input.vatNumber,
    bank_account_name: input.bankAccountName,
    bank_sort_code: input.bankSortCode,
    bank_account_number: input.bankAccountNumber,
    bank_iban: input.bankIban,
    bank_bic: input.bankBic,
    payment_terms: input.paymentTerms,
  })

  const [was, now] = [serialize.businessDetails(before), serialize.businessDetails(team!)]
  const changed = BANK_FIELDS.filter((field) => was[field] !== now[field])
  if (changed.length > 0) {
    await logActivity(before.id, { memberId: c.var.member.id, kind: 'bank_details_changed', detail: { fields: changed } })
    sendEmail(c.env, c.executionCtx, 'seamless-bank-details-changed', {
      team: team!,
      to: before.reply_to_email,
      model: {
        changedBy: c.var.member.name,
        accountEnding: (now.bankAccountNumber ?? now.bankIban)?.slice(-4) ?? null,
        settingsUrl: `${new URL(c.req.url).origin}/settings`,
      },
    })
  }
  return c.json({ team: serialize.team(team!) })
})

export default routes
