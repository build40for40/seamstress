import { invoiceDraft } from '@seamstress/shared/billing'
import { updateInvoiceSchema } from '@seamstress/shared/schemas'
import type { InvoiceDraft, InvoiceSnapshot } from '@seamstress/shared/types'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireOwner } from '../auth'
import { logActivity } from '../db/activity'
import { getClient } from '../db/clients'
import { listGarments } from '../db/garments'
import { createOrGetDraftInvoice, getInvoice, markInvoicePaid, sendInvoice, updateDraftInvoice } from '../db/invoices'
import { getOrder } from '../db/orders'
import type { InvoiceRow } from '../db/rows'
import { listEntries } from '../db/time-entries'
import { clientEmail, sendEmail } from '../email'
import type { AppEnv } from '../env'
import { trackingUrl } from '../links'
import * as serialize from '../serializers/owner'
import { validate } from '../validate'

const routes = new Hono<AppEnv>()

routes.use('/invoices/*', requireOwner)
routes.use('/orders/:id/invoices', requireOwner)

const invoiceNotFound = () => new HTTPException(404, { message: "We couldn't find that invoice." })
const alreadySent = () => new HTTPException(409, { message: "That invoice has been sent, so it can't change." })

async function loadInvoice(c: Context<AppEnv>) {
  const invoice = await getInvoice(c.var.team.id, c.req.param('id')!)
  if (!invoice) throw invoiceNotFound()
  return invoice
}

async function invoiceView(c: Context<AppEnv>, row: InvoiceRow) {
  const team = c.var.team
  const order = (await getOrder(team.id, row.order_id))!
  const [client, garments, entries] = await Promise.all([
    getClient(team.id, order.client_id),
    listGarments(team.id, [order.id]),
    row.status === 'draft' ? listEntries(team.id, { orderId: order.id }) : [],
  ])
  const { snapshot, ...invoice } = serialize.invoice(row)
  const draft: InvoiceDraft =
    snapshot ??
    invoiceDraft({
      order: { quotePence: order.quote_pence ?? 0 },
      garments: garments.map(serialize.garment),
      entries: entries.map(serialize.entry),
      ratePence: team.hourly_rate_pence,
      includedHeldBack: invoice.includedHeldBack,
      finalPricePence: invoice.finalPricePence,
    })
  return {
    invoice,
    draft,
    order: serialize.order(order),
    client: client ? serialize.client(client) : null,
    atelier: { name: team.name, replyToEmail: team.reply_to_email },
    trackingUrl: trackingUrl(c, order.tracking_token),
  }
}

routes.post('/orders/:id/invoices', async (c) => {
  const teamId = c.var.team.id
  if (!(await getOrder(teamId, c.req.param('id')))) throw new HTTPException(404, { message: "We couldn't find that order." })
  const invoice = await createOrGetDraftInvoice(teamId, c.req.param('id'))
  return c.json(await invoiceView(c, invoice!))
})

routes.get('/invoices/:id', async (c) => c.json(await invoiceView(c, await loadInvoice(c))))

routes.patch('/invoices/:id', validate('json', updateInvoiceSchema), async (c) => {
  const invoice = await loadInvoice(c)
  if (invoice.status !== 'draft') throw alreadySent()
  const { finalPricePence, includedHeldBack } = c.req.valid('json')
  const updated = await updateDraftInvoice(c.var.team.id, invoice.id, {
    final_price_pence: finalPricePence,
    included_held_back: includedHeldBack === undefined ? undefined : [...new Set(includedHeldBack)],
  })
  return c.json(await invoiceView(c, updated!))
})

routes.post('/invoices/:id/send', async (c) => {
  const { team, member } = c.var
  const invoice = await loadInvoice(c)
  if (invoice.status !== 'draft') throw new HTTPException(409, { message: 'That invoice has already been sent.' })
  const { draft } = await invoiceView(c, invoice)
  if (draft.entryIds.length === 0 && draft.finalPricePence === null) {
    throw new HTTPException(409, { message: "There's nothing to bill yet. Approve some hours or set a final price." })
  }

  const snapshot: InvoiceSnapshot = draft
  const sent = await sendInvoice(team.id, invoice.id, snapshot, draft.entryIds)
  if (!sent) throw new HTTPException(409, { message: 'That invoice has already been sent.' })
  await logActivity(team.id, {
    orderId: sent.order_id,
    memberId: member.id,
    kind: 'invoice_sent',
    detail: { invoiceId: sent.id, number: sent.number, totalPence: snapshot.totalPence },
  })

  const view = await invoiceView(c, sent)
  const to = clientEmail(team, await getClient(team.id, view.order.clientId), { automatic: false })
  if (to) {
    sendEmail(c.env, c.executionCtx, 'seamstress-invoice', {
      team,
      to,
      orderId: sent.order_id,
      model: {
        atelierName: team.name,
        clientName: view.client?.name,
        orderNumber: view.order.number,
        invoiceNumber: sent.number,
        lines: snapshot.lines,
        minutes: snapshot.minutes,
        hourlyTotalPence: snapshot.hourlyTotalPence,
        quotePence: snapshot.quotePence,
        totalPence: snapshot.totalPence,
        trackingUrl: view.trackingUrl,
      },
    })
  }
  return c.json(view)
})

routes.post('/invoices/:id/paid', async (c) => {
  const { team, member } = c.var
  const invoice = await loadInvoice(c)
  if (invoice.status === 'draft') throw new HTTPException(409, { message: 'Send it before you mark it paid.' })
  if (invoice.status === 'paid') throw new HTTPException(409, { message: "That one's already marked paid." })
  const paid = await markInvoicePaid(team.id, invoice.id)
  await logActivity(team.id, {
    orderId: paid!.order_id,
    memberId: member.id,
    kind: 'invoice_paid',
    detail: { invoiceId: paid!.id, number: paid!.number },
  })
  return c.json(await invoiceView(c, paid!))
})

export default routes
