import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireOwner } from '../auth'
import { getClient } from '../db/clients'
import { listAssignees, listGarments } from '../db/garments'
import { getOrder } from '../db/orders'
import type { AppEnv } from '../env'

const routes = new Hono<AppEnv>()

routes.use('/orders/*', requireOwner)

routes.get('/orders/:id', async (c) => {
  const teamId = c.var.team.id
  const order = await getOrder(teamId, c.req.param('id'))
  if (!order) throw new HTTPException(404, { message: "We couldn't find that order." })
  const [client, garments] = await Promise.all([getClient(teamId, order.client_id), listGarments(teamId, [order.id])])
  const assignees = await listAssignees(teamId, garments.map((garment) => garment.id))
  return c.json({ order, client, garments, assignees })
})

export default routes
