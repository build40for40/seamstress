import { spawnSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parse } from 'csv-parse/sync'
import jpeg from 'jpeg-js'
import { invoiceDraft } from '@seamstress/shared/billing'
import { addDays, addMonths, daysBetween, localDate, monthOf } from '@seamstress/shared/time'
import { poundsToPence } from '@seamstress/shared/format'

const FIXTURE_DAY = '2026-11-19'
const TEAM_ID = 'seed-team'
const OWNER_ID = 'seed-owner'
const REMOTE_ORIGIN = 'https://seamstress.build40for40.com'

const args = process.argv.slice(2)
const remote = args.includes('--remote')
const persistTo = resolve(
  args.find((arg) => arg.startsWith('--persist-to='))?.split('=')[1] ?? process.env.PERSIST_TO ?? '.wrangler/state',
)
const ownerWorkosUserId = process.env.SEED_OWNER_WORKOS_USER_ID?.trim() || null
const origin = process.env.SEED_ORIGIN ?? (remote ? REMOTE_ORIGIN : `http://localhost:${process.env.API_PORT ?? 8787}`)

type Row = Record<string, any>
const fixture = (name: string): Row[] =>
  parse(readFileSync(join(import.meta.dirname, '../../../fixtures', `${name}.csv`), 'utf8'), {
    columns: true,
    skip_empty_lines: true,
  })

const sql = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? 'NULL' : typeof value === 'number' ? String(value) : `'${value.replaceAll("'", "''")}'`

const insert = (table: string, values: Record<string, string | number | null | undefined>) =>
  `INSERT INTO ${table} (${Object.keys(values).join(', ')}) VALUES (${Object.values(values).map(sql).join(', ')});`

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')
const token = () => randomBytes(24).toString('base64url')

function wrangler(commandArgs: string[], options: { quiet?: boolean } = {}) {
  const result = spawnSync('pnpm', ['wrangler', ...commandArgs], { encoding: 'utf8', stdio: options.quiet ? 'pipe' : 'inherit' })
  if (result.status !== 0) {
    if (options.quiet) process.stderr.write(`${result.stdout}${result.stderr}`)
    throw new Error(`wrangler ${commandArgs.slice(0, 3).join(' ')} failed`)
  }
}

const target = remote ? ['--remote'] : ['--local', '--persist-to', persistTo]

const today = localDate(new Date(), 'Europe/London')
const shift = daysBetween(FIXTURE_DAY, today)
const shiftDate = (date: string) => addDays(date, shift)
const at = (date: string, time: string) => `${shiftDate(date)}T${time}:00.000Z`
const minutesOf = (hours: string) => Math.round(Number(hours) * 60)

const atelier = fixture('atelier')[0]!
const priceList = fixture('price_list')
const clients = fixture('clients')
const seamstresses = fixture('seamstresses')
const orders = fixture('orders')
const garments = fixture('garments')
const assignments = fixture('garment_assignments')
const entries = fixture('time_entries')
const photos = fixture('photos')
const timesheets = fixture('timesheets')

const memberId = (fixtureId: string) => `seed-member-${fixtureId}`
const orderId = (number: string) => `seed-order-${number}`
const garmentId = (ref: string) => `seed-garment-${ref}`
const invoiceId = (fixtureId: string) => `seed-invoice-${fixtureId}`
const photoId = (fixtureId: string) => `seed-photo-${fixtureId}`
const photoKey = (id: string, date: string) => `teams/${TEAM_ID}/${new Date(at(date, '12:00')).getTime()}-${id}.jpg`

const keys = new Map(seamstresses.filter((s) => s.active === 'yes').map((s) => [s.seamstress_id, randomBytes(32).toString('base64url')]))
const trackingTokens = new Map(orders.map((order) => [order.order_number, token()]))
const ratePence = poundsToPence(Number(atelier.hourly_rate_gbp))
const createdAt = at(orders.map((order) => order.created_date).sort()[0]!, '08:00')

const garmentRows = garments.map((garment): Row => {
  const order = orders.find((o) => o.order_number === garment.order_number)!
  const siblings = garments.filter((g) => g.order_number === garment.order_number)
  return { ...garment, position: siblings.indexOf(garment), order }
})

const entryInvoice = (entry: Row) => (entry.invoice_id ? invoiceId(entry.invoice_id) : null)

const statements: string[] = []
const wipe = [
  'activity', 'photos', 'time_entries', 'timesheets', 'invoices', 'garment_assignments', 'garments',
  'orders', 'clients', 'price_items', 'pay_rates', 'members',
]
for (const table of wipe) statements.push(`DELETE FROM ${table} WHERE team_id = ${sql(TEAM_ID)};`)
statements.push(`DELETE FROM teams WHERE id = ${sql(TEAM_ID)};`)

const sentInvoices = fixture('invoices').filter((invoice) => invoice.status !== 'draft')
statements.push(
  insert('teams', {
    id: TEAM_ID,
    name: atelier.name,
    reply_to_email: atelier.reply_to_email,
    hourly_rate_pence: ratePence,
    next_order_number: Math.max(...orders.map((o) => Number(o.order_number.split('-')[1]))) + 1,
    next_invoice_number: sentInvoices.length + 1,
    created_at: createdAt,
  }),
  insert('members', {
    id: OWNER_ID, team_id: TEAM_ID, role: 'owner', name: 'Example Owner', time_zone: 'Europe/London',
    workos_user_id: ownerWorkosUserId, created_at: createdAt,
  }),
)

const payRateFrom = shiftDate('2026-01-01')
for (const person of seamstresses) {
  const removedAt = person.active === 'yes' ? null : at('2026-11-10', '09:00')
  statements.push(
    insert('members', {
      id: memberId(person.seamstress_id), team_id: TEAM_ID, role: 'seamstress', name: person.name,
      time_zone: person.time_zone, key_hash: keys.has(person.seamstress_id) ? sha256(keys.get(person.seamstress_id)!) : null,
      removed_at: removedAt, created_at: createdAt,
    }),
    insert('pay_rates', {
      id: `seed-payrate-${person.seamstress_id}`, team_id: TEAM_ID, member_id: memberId(person.seamstress_id),
      rate_pence: poundsToPence(Number(person.pay_rate_gbp)), effective_from: payRateFrom,
    }),
  )
}

priceList.forEach((item, index) =>
  statements.push(insert('price_items', { id: `seed-price-${index + 1}`, team_id: TEAM_ID, name: item.name, price_pence: poundsToPence(Number(item.price_gbp)) })),
)

for (const client of clients) {
  statements.push(insert('clients', { id: `seed-client-${client.client_id}`, team_id: TEAM_ID, name: client.name, created_at: createdAt }))
}

for (const order of orders) {
  statements.push(
    insert('orders', {
      id: orderId(order.order_number), team_id: TEAM_ID, number: order.order_number, client_id: `seed-client-${order.client_id}`,
      description: order.description, quote_pence: poundsToPence(Number(order.quote_gbp)), due_date: shiftDate(order.due_date),
      express: order.express === 'yes' ? 1 : 0, status: order.status, tracking_token: trackingTokens.get(order.order_number)!,
      created_at: at(order.created_date, '09:00'), updated_at: at(order.created_date, '09:00'),
    }),
    insert('activity', {
      id: `seed-activity-${order.order_number}`, team_id: TEAM_ID, order_id: orderId(order.order_number), member_id: OWNER_ID,
      kind: 'created', detail: '{}', created_at: at(order.created_date, '09:00'),
    }),
  )
}

for (const garment of garmentRows) {
  statements.push(
    insert('garments', {
      id: garmentId(garment.garment_ref), team_id: TEAM_ID, order_id: orderId(garment.order_number), ref: garment.garment_ref,
      position: garment.position, description: garment.description, status: garment.status,
      created_at: at(garment.order.created_date, '09:00'), updated_at: at(garment.order.created_date, '09:00'),
    }),
  )
}

for (const link of assignments) {
  const garment = garmentRows.find((g) => g.garment_ref === link.garment_ref)!
  statements.push(
    insert('garment_assignments', {
      id: `seed-assignment-${link.garment_ref}-${link.seamstress_id}`, team_id: TEAM_ID, garment_id: garmentId(link.garment_ref),
      member_id: memberId(link.seamstress_id), assigned_at: at(garment.order.created_date, '09:00'),
    }),
  )
}

const sentMonths = new Set<string>()
for (const entry of entries) {
  const sheet = timesheets.find((t) => t.timesheet_id === entry.timesheet_id)
  if (sheet?.status === 'sent') sentMonths.add(`${entry.seamstress_id}|${monthOf(shiftDate(entry.date_local))}`)
}

for (const invoice of fixture('invoices')) {
  const order = orders.find((o) => o.order_number === invoice.order_number)!
  const sent = invoice.status !== 'draft'
  const finalPricePence = invoice.final_price_gbp ? poundsToPence(Number(invoice.final_price_gbp)) : null
  let snapshot: string | null = null
  if (sent) {
    const draft = invoiceDraft({
      order: { quotePence: poundsToPence(Number(order.quote_gbp)) },
      garments: garmentRows
        .filter((g) => g.order_number === order.order_number)
        .map((g) => ({ id: garmentId(g.garment_ref), ref: g.garment_ref, description: g.description, position: g.position })),
      entries: entries
        .filter((e) => e.invoice_id === invoice.invoice_id)
        .map((e) => ({
          id: `seed-entry-${e.entry_id}`, garmentId: garmentId(e.garment_ref), kind: e.kind as 'sewing', minutes: minutesOf(e.hours),
          reviewStatus: e.review_status as 'approved', invoiceId: null, dateLocal: shiftDate(e.date_local), note: e.note || null,
        })),
      ratePence,
      finalPricePence,
    })
    snapshot = JSON.stringify(draft)
  }
  statements.push(
    insert('invoices', {
      id: invoiceId(invoice.invoice_id), team_id: TEAM_ID, order_id: orderId(invoice.order_number), number: sent ? invoice.invoice_id : null,
      status: invoice.status, final_price_pence: finalPricePence, snapshot,
      sent_at: sent ? at(invoice.sent_date, '10:00') : null, paid_at: invoice.status === 'paid' ? at(invoice.sent_date, '16:00') : null,
      created_at: at(order.created_date, '10:00'),
    }),
  )
}

for (const entry of entries) {
  const general = !entry.garment_ref
  statements.push(
    insert('time_entries', {
      id: `seed-entry-${entry.entry_id}`, team_id: TEAM_ID, member_id: memberId(entry.seamstress_id),
      garment_id: general ? null : garmentId(entry.garment_ref), kind: entry.kind, date_local: shiftDate(entry.date_local),
      minutes: minutesOf(entry.hours), note: entry.note, review_status: general ? null : entry.review_status,
      invoice_id: entryInvoice(entry), created_by: memberId(entry.seamstress_id),
      created_at: at(entry.date_local, '17:00'), updated_at: at(entry.date_local, '17:00'),
    }),
  )
}

const timesheetDay = (month: string) => `${addMonths(month, 1)}-01`
for (const key of sentMonths) {
  const [person, month] = key.split('|') as [string, string]
  statements.push(
    insert('timesheets', {
      id: `seed-timesheet-${person}-${month}`, team_id: TEAM_ID, member_id: memberId(person), month,
      sent_at: `${timesheetDay(month)}T09:00:00.000Z`,
    }),
  )
}

const jpegFor = (seed: string) => {
  const width = 320
  const height = 400
  const hash = createHash('sha256').update(seed).digest()
  const base = [hash[0]!, hash[1]!, hash[2]!].map((v) => 90 + (v % 140))
  const data = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const fade = 1 - (y / height) * 0.45
      const stripe = Math.floor((x + y) / 40) % 2 === 0 ? 1 : 0.92
      for (let c = 0; c < 3; c++) data[i + c] = Math.round(base[c]! * fade * stripe)
      data[i + 3] = 255
    }
  }
  return jpeg.encode({ data, width, height }, 80).data
}

const photoFiles = photos.map((photo) => {
  const id = photoId(photo.photo_id)
  const key = photoKey(id, photo.date_local)
  statements.push(
    insert('photos', {
      id, team_id: TEAM_ID, garment_id: garmentId(photo.garment_ref), member_id: memberId(photo.seamstress_id), r2_key: key,
      caption: photo.caption, label: null, review_status: photo.review_status, taken_on: shiftDate(photo.date_local),
      created_at: at(photo.date_local, '12:00'),
    }),
  )
  return { key, body: jpegFor(photo.file_name) }
})

const work = mkdtempSync(join(tmpdir(), 'seamstress-seed-'))
const sqlFile = join(work, 'seed.sql')
writeFileSync(sqlFile, `${statements.join('\n')}\n`)

if (!remote) mkdirSync(persistTo, { recursive: true })
console.log(`Seeding ${remote ? 'the remote database' : `the local database in ${persistTo}`}, dates shifted by ${shift} days so ${FIXTURE_DAY} is ${today}.`)
wrangler(['d1', 'migrations', 'apply', 'seamstress', ...target], { quiet: true })
wrangler(['d1', 'execute', 'seamstress', ...target, '--yes', '--file', sqlFile], { quiet: true })

photoFiles.forEach((file, index) => {
  const path = join(work, `photo-${index}.jpg`)
  writeFileSync(path, file.body)
  wrangler(['r2', 'object', 'put', `seamstress-photos/${file.key}`, ...target, '--content-type', 'image/jpeg', '--file', path], { quiet: true })
})

console.log(`Seeded ${orders.length} orders, ${garments.length} garments, ${entries.length} time entries and ${photoFiles.length} placeholder photos.\n`)
console.log('Owner')
if (ownerWorkosUserId) {
  console.log(`  The seeded owner is linked to WorkOS user ${ownerWorkosUserId}. Sign in as that user to see ${atelier.name}.`)
} else {
  console.log('  Nobody is linked to the seeded owner yet. Sign in once, find your WorkOS user id (the token sub), then run')
  console.log('  SEED_OWNER_WORKOS_USER_ID=<that id> pnpm seed')
  console.log(`  and signing in will open ${atelier.name} instead of "Set up your atelier".`)
}
console.log('\nSeamstress links (one-off, a new set is printed each run)')
for (const person of seamstresses.filter((s) => keys.has(s.seamstress_id))) {
  console.log(`  ${person.name.padEnd(14)} ${origin}/workroom/#/k/${keys.get(person.seamstress_id)}`)
}
console.log(`\nMember keys for the X-Member-Key header are the last part of each link.`)
