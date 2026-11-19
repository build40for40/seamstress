import { dashboard } from '@seamless/shared/dashboard'
import { localDate, monthOf } from '@seamless/shared/time'
import { STUDIO_TIME_ZONE } from '@seamless/shared/types'
import { Hono } from 'hono'
import { requireOwner } from '../auth'
import { listClients } from '../db/clients'
import { listInvoices } from '../db/invoices'
import { listOrders } from '../db/orders'
import { listEntriesWithOrder } from '../db/owner'
import type { AppEnv } from '../env'
import * as serialize from '../serializers/owner'

const routes = new Hono<AppEnv>()

routes.get('/dashboard', requireOwner, async (c) => {
  const team = c.var.team
  const month = monthOf(localDate(new Date(), STUDIO_TIME_ZONE))
  const [entries, invoices, orders, clients] = await Promise.all([
    listEntriesWithOrder(team.id),
    listInvoices(team.id),
    listOrders(team.id),
    listClients(team.id),
  ])

  const result = dashboard(
    entries.map((entry) => ({ ...serialize.entry(entry), orderId: entry.order_id, clientId: entry.client_id })),
    invoices
      .map(serialize.invoice)
      .filter((invoice) => invoice.snapshot !== null)
      .map((invoice) => ({ sentAt: invoice.sentAt, totalPence: invoice.snapshot!.totalPence, minutes: invoice.snapshot!.minutes })),
    orders.map(serialize.order),
    team.hourly_rate_pence,
    month,
  )

  return c.json({
    ...result,
    orders: Object.fromEntries(orders.map((order) => [order.id, { number: order.number, clientId: order.client_id }])),
    clients: Object.fromEntries(clients.map((client) => [client.id, { name: client.name }])),
  })
})

export default routes
