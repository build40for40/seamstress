import { Hono } from 'hono'
import { requireOwner } from '../auth'
import { listClients } from '../db/clients'
import type { AppEnv } from '../env'

const routes = new Hono<AppEnv>()

routes.use('/clients', requireOwner)
routes.use('/clients/*', requireOwner)

routes.get('/clients', async (c) => c.json({ clients: await listClients(c.var.team.id) }))

export default routes
