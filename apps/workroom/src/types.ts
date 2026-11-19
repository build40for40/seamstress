import type { DueFlag, EntryKind, GarmentEntryKind, GarmentStatus, OrderStatus, PhotoLabel, ReviewStatus, Role } from '@seamless/shared'

export interface Entry {
  id: string
  garmentId: string | null
  kind: EntryKind
  dateLocal: string
  minutes: number | null
  startedAt: string | null
  endedAt: string | null
  note: string | null
  reviewStatus: ReviewStatus | null
  invoiced: boolean
  locked: boolean
  garmentRef: string | null
}

export interface Timer extends Entry {
  needsCheck: boolean
}

export interface Me {
  id: string
  name: string
  role: Role
  timeZone: string
  team: { name: string; showPayEstimate: boolean }
  today: string
  timer: Timer | null
}

export interface MyGarment {
  id: string
  orderId: string
  ref: string
  position: number
  description: string
  status: GarmentStatus
  myMinutes: number
}

export interface OrderSummary {
  id: string
  number: string
  description: string
  dueDate: string | null
  express: boolean
  status: OrderStatus
}

export interface MyOrder extends OrderSummary {
  dueFlag: DueFlag
  lastWorkedAt: string | null
  garments: MyGarment[]
  otherGarments: number
}

export interface Photo {
  id: string
  garmentId: string
  url: string
  caption: string | null
  label: PhotoLabel | null
  reviewStatus: ReviewStatus | null
  takenOn: string
  mine: boolean
}

export interface GarmentDetail {
  order: OrderSummary
  garment: MyGarment
  photos: Photo[]
  entries: Entry[]
}

export interface MyTimesheet {
  month: string
  timeZone: string
  billableMinutes: number
  generalMinutes: number
  totalMinutes: number
  ratePence: number | null
  payPence: number | null
  byDay: { dateLocal: string; billableMinutes: number; generalMinutes: number; totalMinutes: number }[]
  byOrder: { orderId: string; number: string | null; minutes: number }[]
  sentAt: string | null
}

export type { GarmentEntryKind }
