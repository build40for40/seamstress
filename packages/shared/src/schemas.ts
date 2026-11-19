import { z } from 'zod'
import { isTimeZone } from './time'
import {
  ORDER_STATUSES,
  entryKindSchema,
  garmentEntryKindSchema,
  garmentStatusSchema,
  orderStatusSchema,
  photoLabelSchema,
  type EntryKind,
} from './types'

const MAX_PENCE = 100_000_000
const MAX_ENTRY_MINUTES = 24 * 60

export const idSchema = z.string().min(1).max(100)
export const penceSchema = z.number().int().min(0).max(MAX_PENCE)
export const dateLocalSchema = z.iso.date()
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use a month like 2026-11')
export const timeZoneSchema = z.string().refine(isTimeZone, 'Pick a real time zone')
export const emailSchema = z.string().trim().pipe(z.email('That email looks off'))

const nameSchema = z.string().trim().min(1, 'Give it a name').max(120)
const textSchema = z.string().trim().max(2000)
const optionalText = textSchema.nullable().optional()

export function kindMatchesGarment(garmentId: string | null, kind: EntryKind): boolean {
  return (garmentId === null) === (kind === 'waiting')
}

const kindMatchesGarmentIssue = {
  message: 'Waiting goes on general time, and garment time is sewing, fitting or tidying',
  path: ['kind'],
}

export const createTeamSchema = z.object({
  name: nameSchema,
  replyToEmail: emailSchema,
  hourlyRatePence: penceSchema.positive(),
})

const clearable = <T extends z.ZodType<string>>(schema: T) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), schema.nullable()).optional()

const compact = z.string().transform((value) => value.replace(/[\s-]/g, '').toUpperCase())

export const sortCodeSchema = compact
  .pipe(z.string().regex(/^\d{6}$/, 'A sort code is 6 digits'))
  .transform((digits) => `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`)
export const accountNumberSchema = compact.pipe(z.string().regex(/^\d{8}$/, 'An account number is 8 digits'))
export const ibanSchema = compact.pipe(z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/, 'That IBAN looks off'))
export const bicSchema = compact.pipe(z.string().regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'That BIC looks off'))

export const businessDetailsSchema = z.object({
  businessAddress: clearable(z.string().trim().max(500)),
  companyNumber: clearable(z.string().trim().max(20)),
  vatNumber: clearable(z.string().trim().max(20)),
  bankAccountName: clearable(z.string().trim().max(120)),
  bankSortCode: clearable(sortCodeSchema),
  bankAccountNumber: clearable(accountNumberSchema),
  bankIban: clearable(ibanSchema),
  bankBic: clearable(bicSchema),
  paymentTerms: clearable(z.string().trim().max(300)),
})

export const updateTeamSchema = createTeamSchema.partial().extend({
  autoEmailClients: z.boolean().optional(),
  showPayEstimate: z.boolean().optional(),
  ...businessDetailsSchema.shape,
})

export const createPriceItemSchema = z.object({
  name: nameSchema,
  pricePence: penceSchema,
})

export const updatePriceItemSchema = createPriceItemSchema.partial()

export const createMemberSchema = z.object({
  name: nameSchema,
  timeZone: timeZoneSchema,
  payRatePence: penceSchema,
})

export const updateMemberSchema = z.object({
  name: nameSchema.optional(),
  timeZone: timeZoneSchema.optional(),
})

export const createPayRateSchema = z.object({
  ratePence: penceSchema,
  effectiveFrom: dateLocalSchema,
})

export const createClientSchema = z.object({
  name: nameSchema,
  phone: z.string().trim().min(3, 'Add a phone number').max(40),
  email: emailSchema.nullable().optional(),
  notes: optionalText,
})

export const updateClientSchema = createClientSchema.partial()

export const createGarmentSchema = z.object({
  description: textSchema.min(1, 'Say what needs doing'),
  assigneeIds: z.array(idSchema).max(20).default([]),
})

export const createOrderSchema = z.object({
  client: z.union([z.object({ id: idSchema }), createClientSchema]),
  description: textSchema.min(1, 'Say what the order is'),
  quotePence: penceSchema,
  dueDate: dateLocalSchema,
  express: z.boolean().default(false),
  garments: z.array(createGarmentSchema).min(1, 'Add at least one garment').max(26),
})

export const updateOrderSchema = z.object({
  clientId: idSchema.optional(),
  description: textSchema.min(1).optional(),
  quotePence: penceSchema.optional(),
  dueDate: dateLocalSchema.optional(),
  express: z.boolean().optional(),
  status: orderStatusSchema.optional(),
})

export const orderListQuerySchema = z.object({
  status: z.enum([...ORDER_STATUSES, 'all']).default('open'),
})

export const updateGarmentSchema = z.object({
  description: textSchema.min(1).optional(),
  status: garmentStatusSchema.optional(),
})

export const setAssigneesSchema = z.object({
  memberIds: z.array(idSchema).max(20),
})

export const toldClientSchema = z.object({
  channel: z.enum(['whatsapp', 'email']),
  moment: z.enum(['created', 'ready', 'invoiced']),
})

const reviewDecisionSchema = z.object({
  id: idSchema,
  status: z.enum(['approved', 'held_back']),
})

export const reviewSchema = z.object({
  entries: z.array(reviewDecisionSchema).default([]),
  photos: z.array(reviewDecisionSchema).default([]),
  approveOrderId: idSchema.optional(),
})

export const updateInvoiceSchema = z.object({
  finalPricePence: penceSchema.nullable().optional(),
  includedHeldBack: z.array(idSchema).optional(),
})

export const startTimerSchema = z
  .object({
    garmentId: idSchema.nullable(),
    kind: entryKindSchema.optional(),
  })
  .transform(({ garmentId, kind }) => ({
    garmentId,
    kind: kind ?? (garmentId === null ? 'waiting' : 'sewing'),
  }))
  .refine(({ garmentId, kind }) => kindMatchesGarment(garmentId, kind), kindMatchesGarmentIssue)

export const stopTimerSchema = z.object({
  endedAt: z.iso.datetime({ offset: true }).optional(),
})

export const updateTimerSchema = z.object({
  kind: garmentEntryKindSchema,
})

export const createEntrySchema = z
  .object({
    garmentId: idSchema.nullable(),
    kind: entryKindSchema,
    dateLocal: dateLocalSchema,
    minutes: z.number().int().min(1).max(MAX_ENTRY_MINUTES),
    note: optionalText,
  })
  .refine(({ garmentId, kind }) => kindMatchesGarment(garmentId, kind), kindMatchesGarmentIssue)

export const updateEntrySchema = z.object({
  kind: entryKindSchema.optional(),
  dateLocal: dateLocalSchema.optional(),
  minutes: z.number().int().min(1).max(MAX_ENTRY_MINUTES).optional(),
  note: optionalText,
})

export const updateGarmentStatusSchema = z.object({
  status: garmentStatusSchema,
})

export const photoUploadQuerySchema = z.object({
  caption: textSchema.max(500).optional(),
  label: photoLabelSchema.optional(),
})

export const monthQuerySchema = z.object({
  month: monthSchema,
})

export const timesheetExportQuerySchema = z.object({
  month: monthSchema,
  type: z.enum(['summary', 'detail']),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type CreatePriceItemInput = z.infer<typeof createPriceItemSchema>
export type UpdatePriceItemInput = z.infer<typeof updatePriceItemSchema>
export type CreateMemberInput = z.infer<typeof createMemberSchema>
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>
export type CreatePayRateInput = z.infer<typeof createPayRateSchema>
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type CreateGarmentInput = z.infer<typeof createGarmentSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>
export type OrderListQuery = z.infer<typeof orderListQuerySchema>
export type UpdateGarmentInput = z.infer<typeof updateGarmentSchema>
export type SetAssigneesInput = z.infer<typeof setAssigneesSchema>
export type ToldClientInput = z.infer<typeof toldClientSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>
export type StartTimerInput = z.infer<typeof startTimerSchema>
export type StopTimerInput = z.infer<typeof stopTimerSchema>
export type UpdateTimerInput = z.infer<typeof updateTimerSchema>
export type CreateEntryInput = z.infer<typeof createEntrySchema>
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>
export type UpdateGarmentStatusInput = z.infer<typeof updateGarmentStatusSchema>
export type PhotoUploadQuery = z.infer<typeof photoUploadQuerySchema>
export type MonthQuery = z.infer<typeof monthQuerySchema>
export type TimesheetExportQuery = z.infer<typeof timesheetExportQuerySchema>
