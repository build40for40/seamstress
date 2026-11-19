import { isOverQuote, runningCost } from '@seamstress/shared/billing'
import { allGarmentsDone, canMoveOrder, dueFlag } from '@seamstress/shared/orders'
import {
  createGarmentSchema,
  createOrderSchema,
  orderListQuerySchema,
  setAssigneesSchema,
  toldClientSchema,
  updateGarmentSchema,
  updateOrderSchema,
} from '@seamstress/shared/schemas'
import { localDate } from '@seamstress/shared/time'
import { STUDIO_TIME_ZONE } from '@seamstress/shared/types'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireOwner } from '../auth'
import { listActivity, logActivity } from '../db/activity'
import { getClient, listClients } from '../db/clients'
import { addGarment, getGarment, listAssignees, listGarments, setAssignees, updateGarment } from '../db/garments'
import { listInvoices } from '../db/invoices'
import { listMembers } from '../db/members'
import { createOrder, getOrder, listOrders, regenerateTrackingToken, updateOrder } from '../db/orders'
import { listPhotos } from '../db/photos'
import type { ClientRow, OrderRow } from '../db/rows'
import { listEntries } from '../db/time-entries'
import { clientEmail, sendEmail } from '../email'
import type { AppEnv } from '../env'
import * as serialize from '../serializers/owner'
import { validate } from '../validate'

const routes = new Hono<AppEnv>()

routes.use('/orders', requireOwner)
routes.use('/orders/*', requireOwner)
routes.use('/garments/*', requireOwner)

const orderNotFound = () => new HTTPException(404, { message: "We couldn't find that order." })
const garmentNotFound = () => new HTTPException(404, { message: "We couldn't find that garment." })

export const trackingUrl = (c: Context, token: string) => `${new URL(c.req.url).origin}/track/${token}`

async function orderCards(teamId: string, ratePence: number, orders: OrderRow[]) {
  const orderIds = orders.map((order) => order.id)
  const [garments, clients] = await Promise.all([listGarments(teamId, orderIds), listClients(teamId)])
  const garmentIds = garments.map((garment) => garment.id)
  const [assignees, entries] = await Promise.all([
    listAssignees(teamId, garmentIds),
    listEntries(teamId, { garmentIds }),
  ])
  const today = localDate(new Date(), STUDIO_TIME_ZONE)
  const clientById = new Map(clients.map((client) => [client.id, client]))

  return orders.map((row) => {
    const order = serialize.order(row)
    const client = clientById.get(row.client_id)
    const orderGarments = garments.filter((garment) => garment.order_id === row.id).map(serialize.garment)
    const orderGarmentIds = new Set(orderGarments.map((garment) => garment.id))
    const orderEntries = entries.filter((entry) => entry.garment_id && orderGarmentIds.has(entry.garment_id)).map(serialize.entry)
    const cost = runningCost(orderEntries, ratePence, 'owner')
    return {
      ...order,
      client: client ? { id: client.id, name: client.name } : null,
      garments: orderGarments.map((garment) => ({
        ...garment,
        assignees: assignees
          .filter((assignee) => assignee.garment_id === garment.id)
          .map((assignee) => ({ memberId: assignee.member_id, name: assignee.name })),
        minutes: orderEntries
          .filter((entry) => entry.garmentId === garment.id)
          .reduce((sum, entry) => sum + (entry.minutes ?? 0), 0),
      })),
      runningCost: cost,
      allGarmentsDone: allGarmentsDone(orderGarments),
      flags: {
        due: order.dueDate ? dueFlag({ ...order, garments: orderGarments }, today) : null,
        overQuote: isOverQuote(cost, order.quotePence),
        waitingReviews: orderEntries.filter((entry) => entry.reviewStatus === 'waiting' && entry.minutes !== null).length,
      },
    }
  })
}

async function orderDetail(c: Context<AppEnv>, orderId: string) {
  const team = c.var.team
  const row = await getOrder(team.id, orderId)
  if (!row) throw orderNotFound()
  const [[card], client, entries, photos, activity, invoices, members] = await Promise.all([
    orderCards(team.id, team.hourly_rate_pence, [row]),
    getClient(team.id, row.client_id),
    listEntries(team.id, { orderId }),
    listPhotos(team.id, { orderId }),
    listActivity(team.id, orderId),
    listInvoices(team.id, [orderId]),
    listMembers(team.id, { includeRemoved: true }),
  ])
  return {
    order: card!,
    client: client ? serialize.client(client) : null,
    trackingUrl: trackingUrl(c, row.tracking_token),
    members: members.map((member) => ({ id: member.id, name: member.name, removed: member.removed_at !== null })),
    entries: entries.map(serialize.entry),
    photos: photos.map(serialize.photo),
    activity: activity.map(serialize.activity),
    invoices: invoices.map(serialize.invoice),
  }
}

function emailClient(c: Context<AppEnv>, alias: 'seamstress-order-received' | 'seamstress-order-ready', order: OrderRow, client: ClientRow | null) {
  const to = clientEmail(c.var.team, client)
  if (!to) return
  sendEmail(c.env, c.executionCtx, alias, {
    team: c.var.team,
    to,
    orderId: order.id,
    model: {
      atelierName: c.var.team.name,
      clientName: client!.name,
      orderNumber: order.number,
      dueDate: order.due_date,
      trackingUrl: trackingUrl(c, order.tracking_token),
    },
  })
}

routes.get('/orders', validate('query', orderListQuerySchema), async (c) => {
  const { status } = c.req.valid('query')
  const team = c.var.team
  const orders = await listOrders(team.id, status === 'all' ? {} : { status })
  return c.json({ orders: await orderCards(team.id, team.hourly_rate_pence, orders) })
})

routes.post('/orders', validate('json', createOrderSchema), async (c) => {
  const input = c.req.valid('json')
  const { team, member } = c.var
  const order = await createOrder(
    team.id,
    {
      client: input.client,
      description: input.description,
      quote_pence: input.quotePence,
      due_date: input.dueDate,
      express: input.express,
      garments: input.garments,
    },
    member.id,
  )
  if (!order) throw new HTTPException(404, { message: "We couldn't find that client." })
  emailClient(c, 'seamstress-order-received', order, await getClient(team.id, order.client_id))
  return c.json(await orderDetail(c, order.id), 201)
})

routes.get('/orders/:id', async (c) => c.json(await orderDetail(c, c.req.param('id'))))

routes.patch('/orders/:id', validate('json', updateOrderSchema), async (c) => {
  const input = c.req.valid('json')
  const { team, member } = c.var
  const order = await getOrder(team.id, c.req.param('id'))
  if (!order) throw orderNotFound()

  if (input.clientId && !(await getClient(team.id, input.clientId))) {
    throw new HTTPException(404, { message: "We couldn't find that client." })
  }
  const moving = input.status !== undefined && input.status !== order.status
  if (moving) {
    const garments = await listGarments(team.id, [order.id])
    if (!canMoveOrder(order, input.status!, garments)) {
      throw new HTTPException(409, {
        message:
          input.status === 'ready'
            ? "It can't be ready until every garment is done."
            : `An order that's ${order.status} can't go to ${input.status}.`,
      })
    }
  }

  const updated = await updateOrder(team.id, order.id, {
    client_id: input.clientId,
    description: input.description,
    quote_pence: input.quotePence,
    due_date: input.dueDate,
    express: input.express === undefined ? undefined : input.express ? 1 : 0,
    status: input.status,
  })
  if (moving) {
    await logActivity(team.id, {
      orderId: order.id,
      memberId: member.id,
      kind: 'status',
      detail: { from: order.status, to: input.status },
    })
    if (input.status === 'ready') {
      emailClient(c, 'seamstress-order-ready', updated!, await getClient(team.id, updated!.client_id))
    }
  }
  return c.json(await orderDetail(c, order.id))
})

routes.post('/orders/:id/garments', validate('json', createGarmentSchema), async (c) => {
  const { team, member } = c.var
  const order = await getOrder(team.id, c.req.param('id'))
  if (!order) throw orderNotFound()
  const garment = await addGarment(team.id, order.id, c.req.valid('json'))
  await logActivity(team.id, { orderId: order.id, garmentId: garment!.id, memberId: member.id, kind: 'garment_added' })
  return c.json(await orderDetail(c, order.id), 201)
})

routes.post('/orders/:id/tracking-token', async (c) => {
  const token = await regenerateTrackingToken(c.var.team.id, c.req.param('id'))
  if (!token) throw orderNotFound()
  return c.json({ trackingToken: token, trackingUrl: trackingUrl(c, token) })
})

routes.post('/orders/:id/told', validate('json', toldClientSchema), async (c) => {
  const { team, member } = c.var
  const order = await getOrder(team.id, c.req.param('id'))
  if (!order) throw orderNotFound()
  await logActivity(team.id, { orderId: order.id, memberId: member.id, kind: 'told_client', detail: c.req.valid('json') })
  return c.body(null, 204)
})

routes.patch('/garments/:id', validate('json', updateGarmentSchema), async (c) => {
  const input = c.req.valid('json')
  const { team, member } = c.var
  const garment = await getGarment(team.id, c.req.param('id'))
  if (!garment) throw garmentNotFound()
  await updateGarment(team.id, garment.id, input)

  if (input.status && input.status !== garment.status) {
    await logActivity(team.id, {
      orderId: garment.order_id,
      garmentId: garment.id,
      memberId: member.id,
      kind: 'stage',
      detail: { ref: garment.ref, from: garment.status, to: input.status },
    })
    if (input.status === 'done' && allGarmentsDone(await listGarments(team.id, [garment.order_id]))) {
      const order = (await getOrder(team.id, garment.order_id))!
      sendEmail(c.env, c.executionCtx, 'seamstress-garments-done', {
        team,
        to: team.reply_to_email,
        orderId: order.id,
        model: { atelierName: team.name, orderNumber: order.number, orderUrl: `${new URL(c.req.url).origin}/orders/${order.id}` },
      })
    }
  }
  return c.json(await orderDetail(c, garment.order_id))
})

routes.put('/garments/:id/assignees', validate('json', setAssigneesSchema), async (c) => {
  const { team, member } = c.var
  const garment = await getGarment(team.id, c.req.param('id'))
  if (!garment) throw garmentNotFound()
  const assignees = await setAssignees(team.id, garment.id, c.req.valid('json').memberIds)
  await logActivity(team.id, {
    orderId: garment.order_id,
    garmentId: garment.id,
    memberId: member.id,
    kind: 'assigned',
    detail: { ref: garment.ref, memberIds: assignees!.map((assignee) => assignee.member_id) },
  })
  return c.json(await orderDetail(c, garment.order_id))
})

export default routes
