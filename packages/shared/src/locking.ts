import { monthOf } from './time'
import type { TimeEntry } from './types'

export type LockReason = 'invoice' | 'timesheet'
export type LockableEntry = Pick<TimeEntry, 'invoiceId' | 'dateLocal'>

export const LOCK_MESSAGES: Record<LockReason, string> = {
  invoice: "That one's already on a sent invoice, so ask your atelier to change it.",
  timesheet: "That month's timesheet has been sent, so ask your atelier to reopen it.",
}

export function lockReason(entry: LockableEntry, sentMonths: readonly string[]): LockReason | null {
  if (entry.invoiceId !== null) return 'invoice'
  if (sentMonths.includes(monthOf(entry.dateLocal))) return 'timesheet'
  return null
}

export function isLocked(entry: LockableEntry, sentMonths: readonly string[]): boolean {
  return lockReason(entry, sentMonths) !== null
}
