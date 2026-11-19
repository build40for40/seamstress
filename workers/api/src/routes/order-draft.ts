import { draftOrderSchema } from '@seamless/shared/order-draft'
import { localDate } from '@seamless/shared/time'
import { STUDIO_TIME_ZONE } from '@seamless/shared/types'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireOwner } from '../auth'
import { listClients } from '../db/clients'
import { listMembers } from '../db/members'
import { listPriceItems } from '../db/price-items'
import type { AppEnv } from '../env'
import { draftOrder, DraftUnavailable } from '../order-draft/draft'
import { validate } from '../validate'

const routes = new Hono<AppEnv>()

routes.post('/orders/draft', requireOwner, validate('json', draftOrderSchema), async (c) => {
  const { note } = c.req.valid('json')
  const { team, member } = c.var
  const [clients, members, priceItems] = await Promise.all([listClients(team.id), listMembers(team.id), listPriceItems(team.id)])
  try {
    const draft = await draftOrder(
      {
        note,
        today: localDate(new Date(), STUDIO_TIME_ZONE),
        writerId: member.id,
        clients: clients.map((client) => ({ id: client.id, name: client.name, phone: client.phone })),
        members: members.map((teamMember) => ({ id: teamMember.id, name: teamMember.name })),
        priceItems: priceItems.map((item) => ({ id: item.id, name: item.name })),
      },
      { anthropic: c.env.ANTHROPIC_API_KEY, typesafe: c.env.TYPESAFE_API_KEY },
    )
    return c.json(draft)
  } catch (error) {
    if (error instanceof DraftUnavailable) throw new HTTPException(error.status, { message: error.message })
    throw error
  }
})

export default routes
