export type Role = 'owner' | 'seamstress'
export type OrderStatus = 'open' | 'ready' | 'collected' | 'cancelled'
export type GarmentStatus = 'todo' | 'in_progress' | 'fitting' | 'done'
export type EntryKind = 'sewing' | 'tidying' | 'fitting' | 'waiting'
export type ReviewStatus = 'waiting' | 'approved' | 'held_back'
export type PhotoLabel = 'before' | 'progress' | 'after'
export type InvoiceStatus = 'draft' | 'sent' | 'paid'
export type Flag = 0 | 1

export type TeamRow = {
  id: string
  name: string
  reply_to_email: string
  hourly_rate_pence: number
  auto_email_clients: Flag
  show_pay_estimate: Flag
  next_order_number: number
  next_invoice_number: number
  created_at: string
}

export type MemberRow = {
  id: string
  team_id: string
  role: Role
  name: string
  time_zone: string
  workos_user_id: string | null
  key_hash: string | null
  removed_at: string | null
  created_at: string
}

export type PayRateRow = {
  id: string
  team_id: string
  member_id: string
  rate_pence: number
  effective_from: string
}

export type ClientRow = {
  id: string
  team_id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
}

export type PriceItemRow = {
  id: string
  team_id: string
  name: string
  price_pence: number
  archived_at: string | null
}

export type OrderRow = {
  id: string
  team_id: string
  number: string
  client_id: string
  description: string
  quote_pence: number | null
  due_date: string | null
  express: Flag
  status: OrderStatus
  tracking_token: string
  created_at: string
  updated_at: string
}

export type GarmentRow = {
  id: string
  team_id: string
  order_id: string
  ref: string
  position: number
  description: string
  status: GarmentStatus
  created_at: string
  updated_at: string
}

export type AssignmentRow = {
  id: string
  team_id: string
  garment_id: string
  member_id: string
  assigned_at: string
  removed_at: string | null
}

export type TimeEntryRow = {
  id: string
  team_id: string
  member_id: string
  garment_id: string | null
  kind: EntryKind
  date_local: string
  minutes: number | null
  started_at: string | null
  ended_at: string | null
  note: string | null
  review_status: ReviewStatus | null
  invoice_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type PhotoRow = {
  id: string
  team_id: string
  garment_id: string
  member_id: string
  r2_key: string
  caption: string | null
  label: PhotoLabel | null
  review_status: ReviewStatus
  taken_on: string
  created_at: string
}

export type InvoiceRow = {
  id: string
  team_id: string
  order_id: string
  number: string | null
  status: InvoiceStatus
  final_price_pence: number | null
  included_held_back: string
  snapshot: string | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
}

export type TimesheetRow = {
  id: string
  team_id: string
  member_id: string
  month: string
  status: 'sent'
  sent_at: string
  reopened_at: string | null
}

export type ActivityRow = {
  id: string
  team_id: string
  order_id: string | null
  garment_id: string | null
  member_id: string | null
  kind: string
  detail: string
  created_at: string
}
