import type { Activity, EntryKind, GarmentStatus, InvoiceStatus, OrderStatus, PhotoLabel, ReviewStatus } from '@seamless/shared'
import { formatPence } from './format'

export const GARMENT_STAGE_LABELS: Record<GarmentStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  fitting: 'Fitting',
  done: 'Done',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  open: 'Open',
  ready: 'Ready to collect',
  collected: 'Collected',
  cancelled: 'Cancelled',
}

export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  sewing: 'Sewing',
  tidying: 'Tidying',
  fitting: 'Fitting',
  waiting: 'Waiting',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  waiting: 'Waiting for you',
  approved: 'Approved',
  held_back: 'Held back',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
}

export const PHOTO_LABEL_LABELS: Record<PhotoLabel, string> = {
  before: 'Before',
  progress: 'Progress',
  after: 'After',
}

const EMAIL_LABELS: Record<string, string> = {
  'seamstress-order-received': 'order received',
  'seamstress-order-ready': 'ready to collect',
  'seamstress-invoice': 'invoice',
  'seamstress-garments-done': 'all garments done',
  'seamstress-timesheet-sent': 'timesheet sent',
}

const MOMENT_LABELS: Record<string, string> = {
  created: 'order taken in',
  ready: 'ready to collect',
  invoiced: 'invoice',
}

export type ActivityLookups = {
  memberName: (id: string) => string | undefined
  garmentRef: (id: string) => string | undefined
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

export function describeActivity(activity: Activity, lookups: ActivityLookups): string {
  const detail = activity.detail ?? {}
  const ref = text(detail.ref) || (activity.garmentId ? (lookups.garmentRef(activity.garmentId) ?? 'A garment') : 'A garment')

  switch (activity.kind) {
    case 'created':
      return 'Order taken in'
    case 'garment_added':
      return `Added ${ref}`
    case 'status': {
      const to = ORDER_STATUS_LABELS[detail.to as OrderStatus] ?? text(detail.to)
      return `Order moved to ${to.toLowerCase()}`
    }
    case 'stage': {
      const to = GARMENT_STAGE_LABELS[detail.to as GarmentStatus] ?? text(detail.to)
      return `${ref} moved to ${to.toLowerCase()}`
    }
    case 'assigned': {
      const ids = Array.isArray(detail.memberIds) ? (detail.memberIds as string[]) : []
      const names = ids.map((id) => lookups.memberName(id) ?? 'someone')
      return names.length ? `${ref} given to ${names.join(' and ')}` : `${ref} has nobody on it now`
    }
    case 'reviewed': {
      const parts = [
        Number(detail.approved) ? `${detail.approved} approved` : '',
        Number(detail.heldBack) ? `${detail.heldBack} held back` : '',
      ].filter(Boolean)
      return parts.length ? `Reviewed: ${parts.join(', ')}` : 'Reviewed'
    }
    case 'told_client': {
      const channel = detail.channel === 'whatsapp' ? 'WhatsApp' : 'email'
      const moment = MOMENT_LABELS[text(detail.moment)] ?? 'an update'
      return `Told the client on ${channel}: ${moment}`
    }
    case 'email': {
      const what = EMAIL_LABELS[text(detail.alias)] ?? 'an update'
      const status = text(detail.status)
      if (status === 'sent') return `Emailed ${text(detail.to)}: ${what}`
      if (status === 'failed') return `Email to ${text(detail.to)} failed: ${what}`
      return `Email not sent to ${text(detail.to)}: ${what}`
    }
    case 'invoice_sent': {
      const total = typeof detail.totalPence === 'number' ? ` for ${formatPence(detail.totalPence)}` : ''
      return `Sent invoice ${text(detail.number)}${total}`
    }
    case 'invoice_paid':
      return `Invoice ${text(detail.number)} paid`
    default:
      return activity.kind.replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase())
  }
}
