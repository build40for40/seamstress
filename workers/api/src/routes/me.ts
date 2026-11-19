import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireMember } from '../auth'
import { listPhotos } from '../db/photos'
import { listEntries, runningEntry } from '../db/time-entries'
import { getMemberGarment, listMemberOrders } from '../db/workroom'
import type { AppEnv } from '../env'
import {
  seamstressEntry,
  seamstressGarment,
  seamstressMe,
  seamstressOrder,
  seamstressOrderSummary,
  seamstressPhoto,
} from '../serializers/seamstress'

const routes = new Hono<AppEnv>()

routes.get('/me', requireMember, async (c) => {
  const { member, team } = c.var
  const running = await runningEntry(team.id, member.id)
  return c.json({ ...seamstressMe(member, team), timer: running ? seamstressEntry(running) : null })
})

routes.get('/me/orders', requireMember, async (c) => {
  const { member, team } = c.var
  const { orders, garments } = await listMemberOrders(team.id, member.id)
  return c.json({ orders: orders.map((order) => seamstressOrder(order, garments)) })
})

routes.get('/me/garments/:id', requireMember, async (c) => {
  const { member, team } = c.var
  const found = await getMemberGarment(team.id, member.id, c.req.param('id'))
  if (!found) throw new HTTPException(404, { message: "That garment isn't on your list." })
  const [photos, entries] = await Promise.all([
    listPhotos(team.id, { garmentIds: [found.garment.id] }),
    listEntries(team.id, { garmentIds: [found.garment.id], memberId: member.id }),
  ])
  return c.json({
    order: seamstressOrderSummary(found.order),
    garment: seamstressGarment(found.garment),
    photos: photos.map((photo) => seamstressPhoto(photo, member)),
    entries: entries.map(seamstressEntry),
  })
})

export default routes
