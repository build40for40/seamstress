import { createClientSchema, updateClientSchema } from '@seamless/shared/schemas'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireOwner } from '../auth'
import { createClient, listClients, updateClient } from '../db/clients'
import type { AppEnv } from '../env'
import * as serialize from '../serializers/owner'
import { validate } from '../validate'

const routes = new Hono<AppEnv>()

routes.use('/clients', requireOwner)
routes.use('/clients/*', requireOwner)

routes.get('/clients', async (c) => {
  const clients = await listClients(c.var.team.id)
  return c.json({ clients: clients.map(serialize.client) })
})

routes.post('/clients', validate('json', createClientSchema), async (c) => {
  const client = await createClient(c.var.team.id, c.req.valid('json'))
  return c.json({ client: serialize.client(client) }, 201)
})

routes.patch('/clients/:id', validate('json', updateClientSchema), async (c) => {
  const client = await updateClient(c.var.team.id, c.req.param('id'), c.req.valid('json'))
  if (!client) throw new HTTPException(404, { message: "We couldn't find that client." })
  return c.json({ client: serialize.client(client) })
})

export default routes
