import { z } from 'zod'

export const ROLES = ['owner', 'seamstress'] as const
export const GARMENT_STATUSES = ['todo', 'in_progress', 'fitting', 'done'] as const
export const ORDER_STATUSES = ['open', 'ready', 'collected', 'cancelled'] as const
export const ENTRY_KINDS = ['sewing', 'tidying', 'fitting', 'waiting'] as const
export const GARMENT_ENTRY_KINDS = ['sewing', 'tidying', 'fitting'] as const
export const REVIEW_STATUSES = ['waiting', 'approved', 'held_back'] as const
export const INVOICE_STATUSES = ['draft', 'sent', 'paid'] as const
export const PHOTO_LABELS = ['before', 'progress', 'after'] as const

export const roleSchema = z.enum(ROLES)
export const garmentStatusSchema = z.enum(GARMENT_STATUSES)
export const orderStatusSchema = z.enum(ORDER_STATUSES)
export const entryKindSchema = z.enum(ENTRY_KINDS)
export const garmentEntryKindSchema = z.enum(GARMENT_ENTRY_KINDS)
export const reviewStatusSchema = z.enum(REVIEW_STATUSES)
export const invoiceStatusSchema = z.enum(INVOICE_STATUSES)
export const photoLabelSchema = z.enum(PHOTO_LABELS)

export type Role = z.infer<typeof roleSchema>
export type GarmentStatus = z.infer<typeof garmentStatusSchema>
export type OrderStatus = z.infer<typeof orderStatusSchema>
export type EntryKind = z.infer<typeof entryKindSchema>
export type GarmentEntryKind = z.infer<typeof garmentEntryKindSchema>
export type ReviewStatus = z.infer<typeof reviewStatusSchema>
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>
export type PhotoLabel = z.infer<typeof photoLabelSchema>

export const STUDIO_TIME_ZONE = 'Europe/London'

export interface BusinessDetails {
  businessAddress: string | null
  companyNumber: string | null
  vatNumber: string | null
  bankAccountName: string | null
  bankSortCode: string | null
  bankAccountNumber: string | null
  bankIban: string | null
  bankBic: string | null
  paymentTerms: string | null
}

export const BANK_FIELDS = ['bankAccountName', 'bankSortCode', 'bankAccountNumber', 'bankIban', 'bankBic'] as const

export interface InvoiceAtelier extends BusinessDetails {
  name: string
  replyToEmail: string
}

export interface Team extends BusinessDetails {
  id: string
  name: string
  replyToEmail: string
  hourlyRatePence: number
  autoEmailClients: boolean
  showPayEstimate: boolean
  nextOrderNumber: number
  nextInvoiceNumber: number
  createdAt: string
}

export interface Member {
  id: string
  teamId: string
  role: Role
  name: string
  timeZone: string
  workosUserId: string | null
  removedAt: string | null
  createdAt: string
}

export interface PayRate {
  id: string
  teamId: string
  memberId: string
  ratePence: number
  effectiveFrom: string
}

export interface Client {
  id: string
  teamId: string
  name: string
  phone: string
  email: string | null
  notes: string | null
  createdAt: string
}

export interface PriceItem {
  id: string
  teamId: string
  name: string
  pricePence: number
  archivedAt: string | null
}

export interface Order {
  id: string
  teamId: string
  number: string
  clientId: string
  description: string
  quotePence: number
  dueDate: string
  express: boolean
  status: OrderStatus
  trackingToken: string
  createdAt: string
  updatedAt: string
}

export interface Garment {
  id: string
  teamId: string
  orderId: string
  ref: string
  position: number
  description: string
  status: GarmentStatus
  createdAt: string
  updatedAt: string
}

export interface GarmentAssignment {
  id: string
  teamId: string
  garmentId: string
  memberId: string
  assignedAt: string
  removedAt: string | null
}

export interface TimeEntry {
  id: string
  teamId: string
  memberId: string
  garmentId: string | null
  kind: EntryKind
  dateLocal: string
  minutes: number | null
  startedAt: string | null
  endedAt: string | null
  note: string | null
  reviewStatus: ReviewStatus | null
  invoiceId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Photo {
  id: string
  teamId: string
  garmentId: string
  memberId: string
  r2Key: string
  caption: string | null
  label: PhotoLabel | null
  reviewStatus: ReviewStatus
  takenOn: string
  createdAt: string
}

export interface Invoice {
  id: string
  teamId: string
  orderId: string
  number: string | null
  status: InvoiceStatus
  finalPricePence: number | null
  includedHeldBack: string[]
  snapshot: InvoiceSnapshot | null
  sentAt: string | null
  paidAt: string | null
  createdAt: string
}

export interface InvoiceLine {
  garmentId: string
  ref: string
  description: string
  minutes: number
  pence: number
}

export interface HeldBackLine {
  entryId: string
  garmentId: string
  dateLocal: string
  minutes: number
  note: string | null
  included: boolean
}

export interface InvoiceDraft {
  lines: InvoiceLine[]
  minutes: number
  ratePence: number
  hourlyTotalPence: number
  quotePence: number
  differencePence: number
  overQuote: boolean
  finalPricePence: number | null
  totalPence: number
  entryIds: string[]
  waiting: { count: number; minutes: number }
  heldBack: HeldBackLine[]
}

export type InvoiceSnapshot = InvoiceDraft & { atelier?: InvoiceAtelier }

export interface Timesheet {
  id: string
  teamId: string
  memberId: string
  month: string
  status: 'sent'
  sentAt: string
  reopenedAt: string | null
}

export interface Activity {
  id: string
  teamId: string
  orderId: string | null
  garmentId: string | null
  memberId: string | null
  kind: string
  detail: Record<string, unknown> | null
  createdAt: string
}
