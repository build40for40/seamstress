import { formatMinutes, formatPence, runningCost, type GarmentStatus, type InvoiceSnapshot } from '@seamstress/shared'
import { Hono, type Context } from 'hono'
import { raw } from 'hono/html'
import type { Child } from 'hono/jsx'
import { listGarments } from '../db/garments'
import { listInvoices } from '../db/invoices'
import { findOrderByTrackingToken } from '../db/orders'
import { listPhotos } from '../db/photos'
import type { GarmentRow, InvoiceRow, OrderRow, OrderStatus, PhotoRow, TeamRow } from '../db/rows'
import { getTeam } from '../db/teams'
import { listEntries } from '../db/time-entries'
import type { AppEnv } from '../env'

const routes = new Hono<AppEnv>()

const STAGES: { status: GarmentStatus; label: string }[] = [
  { status: 'todo', label: 'Waiting its turn' },
  { status: 'in_progress', label: 'On the table' },
  { status: 'fitting', label: 'Fitting' },
  { status: 'done', label: 'Finished' },
]

const ORDER_STATUS: Record<OrderStatus, string> = {
  open: 'In the workroom',
  ready: 'Ready for collection',
  collected: 'Collected',
  cancelled: 'Cancelled',
}

const STYLES = `
*{box-sizing:border-box}
body{margin:0;background:#FBF6F4 repeating-linear-gradient(90deg,rgba(43,27,51,.04) 0 1px,transparent 1px 14px);color:#2B1B33;font:16px/1.45 Inter,system-ui,sans-serif}
.tape{height:18px;background-color:#2B1B33;background-image:repeating-linear-gradient(90deg,#FBF6F4 0 1.5px,transparent 1.5px 40px),repeating-linear-gradient(90deg,#CBB9C9 0 1px,transparent 1px 8px);background-size:100% 10px,100% 5px;background-repeat:no-repeat;background-position:0 0,0 0}
main{max-width:480px;margin:0 auto;padding:20px 16px 48px;display:flex;flex-direction:column;gap:16px}
h1,h2.serif{font-family:'Playfair Display',Georgia,serif;font-weight:600;margin:0;line-height:1.15}
h1{font-size:28px}
h2{font-size:13px;font-weight:600;color:#6A5870;margin:0}
.brand{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:22px;color:#7A2E4D}
.label{align-self:flex-start;font-size:13px;font-weight:600;letter-spacing:.06em;color:#6B2443;background:#F3E1E7;border:1px dashed #B58A9B;border-radius:4px;padding:3px 9px}
.card{background:#fff;border:1px solid #E8DCD9;border-radius:6px;padding:16px;display:flex;flex-direction:column;gap:12px}
.row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.row+.row{border-top:1.5px dashed #D9C3C9;padding-top:12px}
.muted{color:#6A5870;font-size:14px}
.aside{font-family:'Playfair Display',Georgia,serif;font-style:italic;color:#7A2E4D;margin:0}
.steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;list-style:none;margin:0;padding:0}
.steps li{font-size:12px;color:#6A5870;border-top:4px solid #E8DCD9;padding-top:6px}
.steps li.past{border-color:#B58A9B}
.steps li.now{border-color:#7A2E4D;color:#2B1B33;font-weight:600}
.warn{background:#F3E1E7;border:1px dashed #B58A9B;border-radius:6px;padding:12px;font-size:15px}
.photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.photos figure{margin:0;display:flex;flex-direction:column;gap:4px}
.photos img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;background:#E9DDDA}
.photos figcaption{font-size:12px;color:#54435A}
.button{display:block;text-align:center;background:#7A2E4D;color:#fff;font-weight:600;text-decoration:none;border-radius:4px;padding:14px;min-height:44px}
.total{font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:600}
`

const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap'

const LOCAL_TIME_SCRIPT = `
document.querySelectorAll('time[datetime]').forEach(function (el) {
  var d = new Date(el.getAttribute('datetime'));
  if (isNaN(d)) return;
  var opts = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  var uk = d.toLocaleString('en-GB', Object.assign({ timeZone: 'Europe/London' }, opts));
  var mine = d.toLocaleString('en-GB', opts);
  el.textContent = uk + ' UK time';
  if (mine !== uk) el.textContent += ' (' + mine + ' for you)';
});
`

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const longDay = (dateLocal: string) => dayFormat.format(new Date(`${dateLocal}T12:00:00Z`))

const ukInstant = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  }).format(new Date(iso)) + ' UK time'

function Page({ title, children }: { title: string; children: Child }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <meta name="referrer" content="no-referrer" />
        <title>{title}</title>
        <link rel="stylesheet" href={FONTS} />
        <style>{raw(STYLES)}</style>
      </head>
      <body>
        <div class="tape" aria-hidden="true" />
        <main>{children}</main>
        <script>{raw(LOCAL_TIME_SCRIPT)}</script>
      </body>
    </html>
  )
}

function Timeline({ garment }: { garment: GarmentRow }) {
  const current = STAGES.findIndex((stage) => stage.status === garment.status)
  return (
    <ol class="steps">
      {STAGES.map((stage, index) => (
        <li class={index < current ? 'past' : index === current ? 'now' : ''} aria-current={index === current ? 'step' : undefined}>
          {stage.label}
        </li>
      ))}
    </ol>
  )
}

function InvoiceCard({ invoice }: { invoice: InvoiceRow }) {
  const snapshot = JSON.parse(invoice.snapshot ?? 'null') as InvoiceSnapshot | null
  if (!snapshot) return null
  return (
    <section class="card">
      <div class="row">
        <h2>Invoice {invoice.number}</h2>
        <span class="muted">{invoice.status === 'paid' ? 'Paid, thank you' : 'Sent'}</span>
      </div>
      {snapshot.lines.map((line) => (
        <div class="row">
          <span>
            {line.ref} {line.description}
            <br />
            <span class="muted">{formatMinutes(line.minutes)}</span>
          </span>
          <span>{formatPence(line.pence)}</span>
        </div>
      ))}
      <div class="row">
        <span>Total</span>
        <span class="total">{formatPence(snapshot.totalPence)}</span>
      </div>
      {invoice.sent_at && (
        <span class="muted">
          Sent <time datetime={invoice.sent_at}>{ukInstant(invoice.sent_at)}</time>
        </span>
      )}
    </section>
  )
}

function PhotoGrid({ photos, garments, token }: { photos: PhotoRow[]; garments: GarmentRow[]; token: string }) {
  if (photos.length === 0) return null
  const refs = new Map(garments.map((garment) => [garment.id, garment.ref]))
  return (
    <section class="card">
      <h2>Photos</h2>
      <div class="photos">
        {photos.map((photo) => (
          <figure>
            <img src={`/photos/${photo.id}?t=${encodeURIComponent(token)}`} alt={photo.caption ?? `${refs.get(photo.garment_id)} photo`} loading="lazy" />
            <figcaption>
              {refs.get(photo.garment_id)}, {longDay(photo.taken_on)}
              {photo.caption ? `. ${photo.caption}` : ''}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

function Tracking({ team, order, garments, photos, cost, invoice, token }: {
  team: TeamRow
  order: OrderRow
  garments: GarmentRow[]
  photos: PhotoRow[]
  cost: { minutes: number; pence: number }
  invoice: InvoiceRow | null
  token: string
}) {
  const quote = order.quote_pence
  const over = quote !== null && quote > 0 && cost.pence > quote
  const mailto = `mailto:${team.reply_to_email}?subject=${encodeURIComponent(`About ${order.number}`)}`
  return (
    <Page title={`${order.number} at ${team.name}`}>
      <span class="brand">{team.name}</span>
      <span class="label">{order.number}</span>
      <h1>{order.description}</h1>
      <p class="aside">{order.status === 'ready' ? 'All done and waiting for you.' : order.status === 'open' ? 'Needle in hand, as we speak.' : ORDER_STATUS[order.status]}</p>
      <section class="card">
        <div class="row">
          <h2>Status</h2>
          <strong>{ORDER_STATUS[order.status]}</strong>
        </div>
        {order.due_date && (
          <div class="row">
            <h2>Due</h2>
            <strong>{longDay(order.due_date)}</strong>
          </div>
        )}
        {quote !== null && quote > 0 && (
          <div class="row">
            <h2>Quote</h2>
            <strong>{formatPence(quote)}</strong>
          </div>
        )}
        {cost.minutes > 0 && (
          <div class="row">
            <h2>Work so far</h2>
            <strong>
              {formatMinutes(cost.minutes)}, {formatPence(cost.pence)}
            </strong>
          </div>
        )}
        {over && <div class="warn">The work so far has gone past the quote. We'll talk to you before anything else is added.</div>}
      </section>
      {garments.map((garment) => (
        <section class="card">
          <div class="row">
            <span class="label">{garment.ref}</span>
            <span class="muted">{STAGES.find((stage) => stage.status === garment.status)?.label}</span>
          </div>
          <strong>{garment.description}</strong>
          <Timeline garment={garment} />
        </section>
      ))}
      <PhotoGrid photos={photos} garments={garments} token={token} />
      {invoice && <InvoiceCard invoice={invoice} />}
      <a class="button" href={mailto}>
        Ask about this
      </a>
    </Page>
  )
}

const notFound = (c: Context) =>
  c.html(
    <Page title="Seamless">
      <span class="brand">Seamless</span>
      <h1>Hmm, no order here</h1>
      <p>We couldn't find that order. Ask your atelier for a fresh link.</p>
    </Page>,
    404,
  )

routes.get('/:token', async (c) => {
  c.header('Cache-Control', 'private, no-store')
  const token = c.req.param('token')
  const order = await findOrderByTrackingToken(token)
  if (!order) return notFound(c)
  const team = await getTeam(order.team_id)
  if (!team) return notFound(c)

  const [garments, entries, approvedPhotos, invoices] = await Promise.all([
    listGarments(team.id, [order.id]),
    listEntries(team.id, { orderId: order.id }),
    listPhotos(team.id, { orderId: order.id, reviewStatus: 'approved' }),
    listInvoices(team.id, [order.id]),
  ])
  const cost = runningCost(
    entries.map((entry) => ({
      id: entry.id,
      garmentId: entry.garment_id,
      kind: entry.kind,
      minutes: entry.minutes,
      reviewStatus: entry.review_status,
      invoiceId: entry.invoice_id,
    })),
    team.hourly_rate_pence,
    'client',
  )
  const invoice = invoices.find((row) => row.status !== 'draft') ?? null
  return c.html(<Tracking team={team} order={order} garments={garments} photos={approvedPhotos} cost={cost} invoice={invoice} token={token} />)
})

export default routes
