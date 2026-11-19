import type {
  Activity,
  BusinessDetails,
  Client,
  Garment,
  Invoice,
  InvoiceAtelier,
  InvoiceSnapshot,
  Member,
  Order,
  PayRate,
  PriceItem,
  Team,
  TimeEntry,
} from '@seamstress/shared/types'
import type {
  ActivityRow,
  ClientRow,
  GarmentRow,
  InvoiceRow,
  MemberRow,
  OrderRow,
  PayRateRow,
  PhotoRow,
  PriceItemRow,
  TeamRow,
  TimeEntryRow,
} from '../db/rows'

export const businessDetails = (row: TeamRow): BusinessDetails => ({
  businessAddress: row.business_address,
  companyNumber: row.company_number,
  vatNumber: row.vat_number,
  bankAccountName: row.bank_account_name,
  bankSortCode: row.bank_sort_code,
  bankAccountNumber: row.bank_account_number,
  bankIban: row.bank_iban,
  bankBic: row.bank_bic,
  paymentTerms: row.payment_terms,
})

export const invoiceAtelier = (row: TeamRow): InvoiceAtelier => ({
  name: row.name,
  replyToEmail: row.reply_to_email,
  ...businessDetails(row),
})

export const team = (row: TeamRow): Team => ({
  ...businessDetails(row),
  id: row.id,
  name: row.name,
  replyToEmail: row.reply_to_email,
  hourlyRatePence: row.hourly_rate_pence,
  autoEmailClients: row.auto_email_clients === 1,
  showPayEstimate: row.show_pay_estimate === 1,
  nextOrderNumber: row.next_order_number,
  nextInvoiceNumber: row.next_invoice_number,
  createdAt: row.created_at,
})

export const member = (row: MemberRow): Member => ({
  id: row.id,
  teamId: row.team_id,
  role: row.role,
  name: row.name,
  timeZone: row.time_zone,
  workosUserId: row.workos_user_id,
  removedAt: row.removed_at,
  createdAt: row.created_at,
})

export const payRate = (row: PayRateRow): PayRate => ({
  id: row.id,
  teamId: row.team_id,
  memberId: row.member_id,
  ratePence: row.rate_pence,
  effectiveFrom: row.effective_from,
})

export const client = (row: ClientRow): Client => ({
  id: row.id,
  teamId: row.team_id,
  name: row.name,
  phone: row.phone ?? '',
  email: row.email,
  notes: row.notes,
  createdAt: row.created_at,
})

export const priceItem = (row: PriceItemRow): PriceItem => ({
  id: row.id,
  teamId: row.team_id,
  name: row.name,
  pricePence: row.price_pence,
  archivedAt: row.archived_at,
})

export const order = (row: OrderRow): Order => ({
  id: row.id,
  teamId: row.team_id,
  number: row.number,
  clientId: row.client_id,
  description: row.description,
  quotePence: row.quote_pence ?? 0,
  dueDate: row.due_date ?? '',
  express: row.express === 1,
  status: row.status,
  trackingToken: row.tracking_token,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const garment = (row: GarmentRow): Garment => ({
  id: row.id,
  teamId: row.team_id,
  orderId: row.order_id,
  ref: row.ref,
  position: row.position,
  description: row.description,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const entry = (row: TimeEntryRow): TimeEntry => ({
  id: row.id,
  teamId: row.team_id,
  memberId: row.member_id,
  garmentId: row.garment_id,
  kind: row.kind,
  dateLocal: row.date_local,
  minutes: row.minutes,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  note: row.note,
  reviewStatus: row.review_status,
  invoiceId: row.invoice_id,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const photo = (row: PhotoRow) => ({
  id: row.id,
  garmentId: row.garment_id,
  memberId: row.member_id,
  url: `/photos/${row.id}`,
  caption: row.caption,
  label: row.label,
  reviewStatus: row.review_status,
  takenOn: row.taken_on,
  createdAt: row.created_at,
})

export const invoice = (row: InvoiceRow): Invoice => ({
  id: row.id,
  teamId: row.team_id,
  orderId: row.order_id,
  number: row.number,
  status: row.status,
  finalPricePence: row.final_price_pence,
  includedHeldBack: JSON.parse(row.included_held_back) as string[],
  snapshot: row.snapshot ? (JSON.parse(row.snapshot) as InvoiceSnapshot) : null,
  sentAt: row.sent_at,
  paidAt: row.paid_at,
  createdAt: row.created_at,
})

export const activity = (row: ActivityRow): Activity => ({
  id: row.id,
  teamId: row.team_id,
  orderId: row.order_id,
  garmentId: row.garment_id,
  memberId: row.member_id,
  kind: row.kind,
  detail: JSON.parse(row.detail) as Record<string, unknown> | null,
  createdAt: row.created_at,
})
