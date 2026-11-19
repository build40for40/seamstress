import atelierCsv from '../../../../fixtures/atelier.csv?raw'
import garmentsCsv from '../../../../fixtures/garments.csv?raw'
import invoicesCsv from '../../../../fixtures/invoices.csv?raw'
import ordersCsv from '../../../../fixtures/orders.csv?raw'
import seamstressesCsv from '../../../../fixtures/seamstresses.csv?raw'
import timeEntriesCsv from '../../../../fixtures/time_entries.csv?raw'
import timesheetsCsv from '../../../../fixtures/timesheets.csv?raw'
import type { EntryKind, GarmentStatus, OrderStatus, ReviewStatus } from '../types'

type Row = Record<string, string>

export function parseCsv(text: string): Row[] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      record.push(field)
      field = ''
    } else if (char === '\n') {
      record.push(field)
      records.push(record)
      record = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field)
    records.push(record)
  }
  const [header, ...rows] = records
  return rows.map((values) => Object.fromEntries(header!.map((key, index) => [key, values[index] ?? ''])))
}

const gbpToPence = (gbp: string) => Math.round(Number(gbp) * 100)
const hoursToMinutes = (hours: string) => Math.round(Number(hours) * 60)
const orNull = (value: string | undefined) => (value === undefined || value === '' ? null : value)

const atelier = parseCsv(atelierCsv)[0]!
export const ratePence = gbpToPence(atelier.hourly_rate_gbp!)

export const members = parseCsv(seamstressesCsv).map((row) => ({
  id: row.seamstress_id!,
  name: row.name!,
  timeZone: row.time_zone!,
  payRatePence: gbpToPence(row.pay_rate_gbp!),
}))

export const payRatesFor = (memberId: string) => [
  { ratePence: members.find((member) => member.id === memberId)!.payRatePence, effectiveFrom: '2026-01-01' },
]

export const orders = parseCsv(ordersCsv).map((row) => ({
  id: row.order_number!,
  number: row.order_number!,
  clientId: row.client_id!,
  description: row.description!,
  quotePence: gbpToPence(row.quote_gbp!),
  status: row.status as OrderStatus,
  dueDate: row.due_date!,
  express: row.express === 'yes',
}))

export const garments = parseCsv(garmentsCsv).map((row) => ({
  id: row.garment_ref!,
  ref: row.garment_ref!,
  orderId: row.order_number!,
  position: row.garment_ref!.charCodeAt(row.garment_ref!.length - 1) - 65,
  description: row.description!,
  status: row.status as GarmentStatus,
}))

export const invoices = parseCsv(invoicesCsv).map((row) => ({
  id: row.invoice_id!,
  orderId: row.order_number!,
  status: row.status!,
  minutes: hoursToMinutes(row.hours!),
  hourlyTotalPence: gbpToPence(row.hourly_total_gbp!),
  quotePence: gbpToPence(row.quote_gbp!),
  finalPricePence: row.final_price_gbp ? gbpToPence(row.final_price_gbp) : null,
  sentAt: row.sent_date ? `${row.sent_date}T10:00:00Z` : null,
}))

const sentInvoiceIds = new Set(invoices.filter((invoice) => invoice.status !== 'draft').map((invoice) => invoice.id))

export const entries = parseCsv(timeEntriesCsv).map((row) => {
  const orderId = orNull(row.order_number)
  return {
    id: row.entry_id!,
    memberId: row.seamstress_id!,
    orderId,
    clientId: orderId ? orders.find((order) => order.id === orderId)!.clientId : null,
    garmentId: orNull(row.garment_ref),
    kind: row.kind as EntryKind,
    dateLocal: row.date_local!,
    minutes: hoursToMinutes(row.hours!),
    reviewStatus: orNull(row.review_status) as ReviewStatus | null,
    invoiceId: row.invoice_id && sentInvoiceIds.has(row.invoice_id) ? row.invoice_id : null,
    note: orNull(row.note),
  }
})

export const timesheets = parseCsv(timesheetsCsv).map((row) => ({
  memberId: row.seamstress_id!,
  month: row.month!,
  totalMinutes: hoursToMinutes(row.total_hours!),
  payPence: gbpToPence(row.pay_gbp!),
  status: row.status!,
}))

export const sentMonthsFor = (memberId: string) =>
  timesheets.filter((sheet) => sheet.memberId === memberId && sheet.status === 'sent').map((sheet) => sheet.month)

export const orderById = (id: string) => orders.find((order) => order.id === id)!
export const garmentsOf = (orderId: string) => garments.filter((garment) => garment.orderId === orderId)
export const entriesOf = (orderId: string) => entries.filter((entry) => entry.orderId === orderId)
export const entryById = (id: string) => entries.find((entry) => entry.id === id)!
