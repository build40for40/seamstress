import { createMemberSchema, createPayRateSchema, updateMemberSchema } from '@seamless/shared/schemas'
import { localDate } from '@seamless/shared/time'
import { rateOn } from '@seamless/shared/timesheet'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireOwner } from '../auth'
import {
  addPayRate,
  createMember,
  getMember,
  issueMemberKey,
  listMembers,
  listPayRates,
  removeMember,
  updateMember,
} from '../db/members'
import type { MemberRow, PayRateRow } from '../db/rows'
import type { AppEnv } from '../env'
import { workroomLink } from '../links'
import * as serialize from '../serializers/owner'
import { validate } from '../validate'

const routes = new Hono<AppEnv>()

routes.use('/members', requireOwner)
routes.use('/members/*', requireOwner)

const notFound = () => new HTTPException(404, { message: "That person isn't on your team." })

function teamMember(member: MemberRow, payRates: PayRateRow[]) {
  const rates = payRates.filter((rate) => rate.member_id === member.id).map(serialize.payRate)
  return {
    ...serialize.member(member),
    hasLink: member.key_hash !== null,
    payRatePence: rateOn(rates, localDate(new Date(), member.time_zone)),
    payRates: rates,
  }
}

async function loadMember(teamId: string, memberId: string) {
  const member = await getMember(teamId, memberId)
  if (!member || member.removed_at) throw notFound()
  return teamMember(member, await listPayRates(teamId, [member.id]))
}

routes.get('/members', async (c) => {
  const teamId = c.var.team.id
  const [members, payRates] = await Promise.all([listMembers(teamId), listPayRates(teamId)])
  return c.json({ members: members.map((member) => teamMember(member, payRates)) })
})

routes.post('/members', validate('json', createMemberSchema), async (c) => {
  const { name, timeZone, payRatePence } = c.req.valid('json')
  const teamId = c.var.team.id
  const { id, key } = await createMember(teamId, {
    name,
    timeZone,
    ratePence: payRatePence,
    effectiveFrom: localDate(new Date(), timeZone),
  })
  return c.json({ member: await loadMember(teamId, id), link: workroomLink(c, key) }, 201)
})

routes.patch('/members/:id', validate('json', updateMemberSchema), async (c) => {
  const { name, timeZone } = c.req.valid('json')
  const teamId = c.var.team.id
  const memberId = c.req.param('id')
  await loadMember(teamId, memberId)
  await updateMember(teamId, memberId, { name, time_zone: timeZone })
  return c.json({ member: await loadMember(teamId, memberId) })
})

routes.post('/members/:id/link', async (c) => {
  const key = await issueMemberKey(c.var.team.id, c.req.param('id'))
  if (!key) throw notFound()
  return c.json({ link: workroomLink(c, key) })
})

routes.delete('/members/:id', async (c) => {
  if (c.req.param('id') === c.var.member.id) {
    throw new HTTPException(409, { message: "You can't remove yourself from your own atelier." })
  }
  if (!(await removeMember(c.var.team.id, c.req.param('id')))) throw notFound()
  return c.body(null, 204)
})

routes.post('/members/:id/pay-rates', validate('json', createPayRateSchema), async (c) => {
  const { ratePence, effectiveFrom } = c.req.valid('json')
  const teamId = c.var.team.id
  const memberId = c.req.param('id')
  await loadMember(teamId, memberId)
  await addPayRate(teamId, memberId, ratePence, effectiveFrom)
  return c.json({ member: await loadMember(teamId, memberId) }, 201)
})

export default routes
