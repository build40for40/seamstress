import { createPriceItemSchema, updatePriceItemSchema } from '@seamstress/shared/schemas'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireOwner } from '../auth'
import { archivePriceItem, createPriceItem, listPriceItems, updatePriceItem } from '../db/price-items'
import type { AppEnv } from '../env'
import * as serialize from '../serializers/owner'
import { validate } from '../validate'

const routes = new Hono<AppEnv>()

routes.use('/price-items', requireOwner)
routes.use('/price-items/*', requireOwner)

const notFound = () => new HTTPException(404, { message: "That price isn't on your list." })

routes.get('/price-items', async (c) => {
  const items = await listPriceItems(c.var.team.id)
  return c.json({ priceItems: items.map(serialize.priceItem) })
})

routes.post('/price-items', validate('json', createPriceItemSchema), async (c) => {
  const { name, pricePence } = c.req.valid('json')
  const item = await createPriceItem(c.var.team.id, { name, price_pence: pricePence })
  return c.json({ priceItem: serialize.priceItem(item) }, 201)
})

routes.patch('/price-items/:id', validate('json', updatePriceItemSchema), async (c) => {
  const { name, pricePence } = c.req.valid('json')
  const item = await updatePriceItem(c.var.team.id, c.req.param('id'), { name, price_pence: pricePence })
  if (!item || item.archived_at) throw notFound()
  return c.json({ priceItem: serialize.priceItem(item) })
})

routes.delete('/price-items/:id', async (c) => {
  if (!(await archivePriceItem(c.var.team.id, c.req.param('id')))) throw notFound()
  return c.body(null, 204)
})

export default routes
