import type { Garment, HeldBackLine, InvoiceDraft, InvoiceLine, TimeEntry } from './types'

export type BillingEntry = Pick<TimeEntry, 'id' | 'garmentId' | 'kind' | 'minutes' | 'reviewStatus' | 'invoiceId'>
export type DraftEntry = BillingEntry & Pick<TimeEntry, 'dateLocal' | 'note'>
export type UnbilledEntry = BillingEntry & { orderId: string | null; clientId: string | null }
export type Viewer = 'owner' | 'client'

export interface Cost {
  minutes: number
  pence: number
}

export interface UnbilledOrder extends Cost {
  orderId: string
}

export interface UnbilledClient extends Cost {
  clientId: string
  orders: UnbilledOrder[]
}

export interface Unbilled extends Cost {
  clients: UnbilledClient[]
}

export function isGarmentWork(entry: Pick<TimeEntry, 'garmentId' | 'kind'>): boolean {
  return entry.garmentId !== null && entry.kind !== 'waiting'
}

export function isBillable(entry: BillingEntry, includedHeldBack: readonly string[] = []): boolean {
  if (!isGarmentWork(entry)) return false
  if (entry.reviewStatus === 'approved') return true
  return entry.reviewStatus === 'held_back' && includedHeldBack.includes(entry.id)
}

export function hourlyTotal(minutes: number, ratePence: number): number {
  return Math.round((minutes * ratePence) / 60)
}

function minutesOf(entry: Pick<TimeEntry, 'minutes'>): number {
  return entry.minutes ?? 0
}

export function runningCost(entries: readonly BillingEntry[], ratePence: number, viewer: Viewer): Cost {
  const counted = viewer === 'owner' ? ['waiting', 'approved'] : ['approved']
  const minutes = entries
    .filter((entry) => isGarmentWork(entry) && entry.reviewStatus !== null && counted.includes(entry.reviewStatus))
    .reduce((sum, entry) => sum + minutesOf(entry), 0)
  return { minutes, pence: hourlyTotal(minutes, ratePence) }
}

export function isOverQuote(cost: Cost, quotePence: number): boolean {
  return cost.pence > quotePence
}

export function unbilled(entries: readonly UnbilledEntry[], ratePence: number): Unbilled {
  const minutesByOrder = new Map<string, { clientId: string; minutes: number }>()
  for (const entry of entries) {
    if (!isGarmentWork(entry) || entry.invoiceId !== null || entry.reviewStatus === 'held_back') continue
    if (entry.minutes === null || entry.orderId === null || entry.clientId === null) continue
    const order = minutesByOrder.get(entry.orderId) ?? { clientId: entry.clientId, minutes: 0 }
    order.minutes += entry.minutes
    minutesByOrder.set(entry.orderId, order)
  }

  const clients = new Map<string, UnbilledClient>()
  for (const [orderId, { clientId, minutes }] of minutesByOrder) {
    const client = clients.get(clientId) ?? { clientId, minutes: 0, pence: 0, orders: [] }
    const pence = hourlyTotal(minutes, ratePence)
    client.orders.push({ orderId, minutes, pence })
    client.minutes += minutes
    client.pence += pence
    clients.set(clientId, client)
  }

  const list = [...clients.values()].sort((a, b) => b.pence - a.pence)
  for (const client of list) client.orders.sort((a, b) => b.pence - a.pence)
  return {
    minutes: list.reduce((sum, client) => sum + client.minutes, 0),
    pence: list.reduce((sum, client) => sum + client.pence, 0),
    clients: list,
  }
}

export function splitPence(minutesPerLine: readonly number[], ratePence: number): number[] {
  const total = hourlyTotal(
    minutesPerLine.reduce((sum, minutes) => sum + minutes, 0),
    ratePence,
  )
  const shares = minutesPerLine.map((minutes, index) => ({
    index,
    base: Math.floor((minutes * ratePence) / 60),
    remainder: (minutes * ratePence) % 60,
  }))
  let extra = total - shares.reduce((sum, share) => sum + share.base, 0)
  const pence = shares.map((share) => share.base)
  for (const share of [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (extra <= 0) break
    pence[share.index]! += 1
    extra -= 1
  }
  return pence
}

export interface InvoiceDraftInput {
  order: { quotePence: number }
  garments: readonly Pick<Garment, 'id' | 'ref' | 'description' | 'position'>[]
  entries: readonly DraftEntry[]
  ratePence: number
  includedHeldBack?: readonly string[]
  finalPricePence?: number | null
}

export function invoiceDraft({
  order,
  garments,
  entries,
  ratePence,
  includedHeldBack = [],
  finalPricePence = null,
}: InvoiceDraftInput): InvoiceDraft {
  const sortedGarments = [...garments].sort((a, b) => a.position - b.position)
  const garmentIds = new Set(sortedGarments.map((garment) => garment.id))
  const open = entries.filter(
    (entry) =>
      isGarmentWork(entry) && garmentIds.has(entry.garmentId!) && entry.invoiceId === null && entry.minutes !== null,
  )

  const billed = open.filter((entry) => isBillable(entry, includedHeldBack))
  const waitingEntries = open.filter((entry) => entry.reviewStatus === 'waiting')
  const heldBack: HeldBackLine[] = open
    .filter((entry) => entry.reviewStatus === 'held_back')
    .sort((a, b) => a.dateLocal.localeCompare(b.dateLocal))
    .map((entry) => ({
      entryId: entry.id,
      garmentId: entry.garmentId!,
      dateLocal: entry.dateLocal,
      minutes: minutesOf(entry),
      note: entry.note,
      included: includedHeldBack.includes(entry.id),
    }))

  const minutesPerLine = sortedGarments.map((garment) =>
    billed.filter((entry) => entry.garmentId === garment.id).reduce((sum, entry) => sum + minutesOf(entry), 0),
  )
  const pencePerLine = splitPence(minutesPerLine, ratePence)
  const lines: InvoiceLine[] = sortedGarments.map((garment, index) => ({
    garmentId: garment.id,
    ref: garment.ref,
    description: garment.description,
    minutes: minutesPerLine[index]!,
    pence: pencePerLine[index]!,
  }))

  const minutes = minutesPerLine.reduce((sum, lineMinutes) => sum + lineMinutes, 0)
  const hourlyTotalPence = pencePerLine.reduce((sum, pence) => sum + pence, 0)
  return {
    lines,
    minutes,
    ratePence,
    hourlyTotalPence,
    quotePence: order.quotePence,
    differencePence: hourlyTotalPence - order.quotePence,
    overQuote: hourlyTotalPence > order.quotePence,
    finalPricePence,
    totalPence: finalPricePence ?? hourlyTotalPence,
    entryIds: billed.map((entry) => entry.id),
    waiting: {
      count: waitingEntries.length,
      minutes: waitingEntries.reduce((sum, entry) => sum + minutesOf(entry), 0),
    },
    heldBack,
  }
}
