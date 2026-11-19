import { reviewSchema } from '@seamstress/shared/schemas'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireOwner } from '../auth'
import { listClients } from '../db/clients'
import { listOrders } from '../db/orders'
import {
  applyReview,
  listReviewEntryTargets,
  listReviewPhotoTargets,
  listWaitingEntries,
  listWaitingOnOrder,
  listWaitingPhotos,
  type ReviewDecision,
} from '../db/owner'
import type { AppEnv } from '../env'
import * as serialize from '../serializers/owner'
import { validate } from '../validate'

const routes = new Hono<AppEnv>()

routes.use('/review', requireOwner)

routes.get('/review', async (c) => {
  const teamId = c.var.team.id
  const [entries, photos, orders, clients] = await Promise.all([
    listWaitingEntries(teamId),
    listWaitingPhotos(teamId),
    listOrders(teamId),
    listClients(teamId),
  ])
  const clientNames = new Map(clients.map((client) => [client.id, client.name]))
  const latest = new Map<string, string>()
  for (const at of [
    ...entries.map((entry) => ({ orderId: entry.order_id, at: entry.ended_at ?? entry.created_at })),
    ...photos.map((photo) => ({ orderId: photo.order_id, at: photo.created_at })),
  ]) {
    if ((latest.get(at.orderId) ?? '') < at.at) latest.set(at.orderId, at.at)
  }

  const groups = orders
    .filter((order) => latest.has(order.id))
    .sort((a, b) => latest.get(b.id)!.localeCompare(latest.get(a.id)!))
    .map((order) => ({
      order: { ...serialize.order(order), clientName: clientNames.get(order.client_id) ?? null },
      entries: entries
        .filter((entry) => entry.order_id === order.id)
        .map((entry) => ({ ...serialize.entry(entry), ref: entry.ref, memberName: entry.member_name })),
      photos: photos
        .filter((photo) => photo.order_id === order.id)
        .map((photo) => ({ ...serialize.photo(photo), ref: photo.ref, memberName: photo.member_name })),
    }))
  return c.json({ orders: groups })
})

routes.post('/review', validate('json', reviewSchema), async (c) => {
  const { team, member } = c.var
  const input = c.req.valid('json')
  const entries = new Map<string, ReviewDecision['status']>(input.entries.map(({ id, status }) => [id, status]))
  const photos = new Map<string, ReviewDecision['status']>(input.photos.map(({ id, status }) => [id, status]))

  if (input.approveOrderId) {
    const waiting = await listWaitingOnOrder(team.id, input.approveOrderId)
    for (const id of waiting.entryIds) if (!entries.has(id)) entries.set(id, 'approved')
    for (const id of waiting.photoIds) if (!photos.has(id)) photos.set(id, 'approved')
  }

  const [entryTargets, photoTargets] = await Promise.all([
    listReviewEntryTargets(team.id, [...entries.keys()]),
    listReviewPhotoTargets(team.id, [...photos.keys()]),
  ])
  if (entryTargets.length < entries.size || photoTargets.length < photos.size) {
    throw new HTTPException(404, { message: "Some of those aren't in your atelier any more. Refresh and try again." })
  }
  if (entryTargets.some((target) => target.invoice_id !== null)) {
    throw new HTTPException(409, { message: "Some of those hours are already on a sent invoice, so they can't change." })
  }
  if (entryTargets.some((target) => target.minutes === null)) {
    throw new HTTPException(409, { message: "That timer is still running. Review it once it's stopped." })
  }

  const counts = new Map<string, { approved: number; heldBack: number }>()
  const tally = (orderId: string, status: ReviewDecision['status']) => {
    const count = counts.get(orderId) ?? { approved: 0, heldBack: 0 }
    if (status === 'approved') count.approved += 1
    else count.heldBack += 1
    counts.set(orderId, count)
  }
  for (const target of entryTargets) tally(target.order_id, entries.get(target.id)!)
  for (const target of photoTargets) tally(target.order_id, photos.get(target.id)!)

  const toDecisions = (decisions: Map<string, ReviewDecision['status']>) =>
    [...decisions].map(([id, status]) => ({ id, status }))
  await applyReview(
    team.id,
    member.id,
    { entries: toDecisions(entries), photos: toDecisions(photos) },
    [...counts].map(([orderId, detail]) => ({ orderId, detail })),
  )

  return c.json({ entries: entries.size, photos: photos.size })
})

export default routes
