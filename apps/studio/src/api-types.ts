import type {
  Activity,
  Client,
  DueFlag,
  Garment,
  Invoice,
  InvoiceDraft,
  Member,
  Order,
  PayRate,
  PhotoLabel,
  PriceItem,
  ReviewStatus,
  Team,
  TimeEntry,
} from '@seamstress/shared'

export type SessionCounts = { waitingReviews: number; sentTimesheets: number; readyToCollect: number }

export type Session = {
  member: Member | null
  team: Team | null
  counts: SessionCounts | null
}

export type Assignee = { memberId: string; name: string }

export type GarmentCard = Garment & { assignees: Assignee[]; minutes: number }

export type OrderCard = Order & {
  client: { id: string; name: string } | null
  garments: GarmentCard[]
  runningCost: { minutes: number; pence: number }
  allGarmentsDone: boolean
  flags: { due: DueFlag; overQuote: boolean; waitingReviews: number }
}

export type OwnerPhoto = {
  id: string
  garmentId: string
  memberId: string
  url: string
  caption: string | null
  label: PhotoLabel | null
  reviewStatus: ReviewStatus
  takenOn: string
  createdAt: string
}

export type OrderMember = { id: string; name: string; removed: boolean }

export type OrderDetail = {
  order: OrderCard
  client: Client | null
  trackingUrl: string
  members: OrderMember[]
  entries: TimeEntry[]
  photos: OwnerPhoto[]
  activity: Activity[]
  invoices: Invoice[]
}

export type TeamMember = Member & {
  hasLink: boolean
  payRatePence: number | null
  payRates: PayRate[]
}

export type ReviewEntry = TimeEntry & { ref: string; memberName: string }
export type ReviewPhoto = OwnerPhoto & { ref: string; memberName: string }

export type ReviewGroup = {
  order: Order & { clientName: string | null }
  entries: ReviewEntry[]
  photos: ReviewPhoto[]
}

export type InvoiceView = {
  invoice: Omit<Invoice, 'snapshot'>
  draft: InvoiceDraft
  order: Order
  client: Client | null
  atelier: { name: string; replyToEmail: string }
  trackingUrl: string
}

export type { Client, PriceItem }
