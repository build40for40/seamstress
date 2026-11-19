import { z } from 'zod'
import { dateLocalSchema, idSchema, penceSchema } from './schemas'

export const ORDER_NOTE_MAX = 2000

export const draftOrderSchema = z.object({
  note: z.string().trim().min(1, 'Tell us a bit about the order').max(ORDER_NOTE_MAX),
})

const draftClientSchema = z.object({ id: idSchema, name: z.string(), phone: z.string() })

export const UNSURE_FIELDS = ['client', 'description', 'dueDate', 'quotePence', 'express', 'garments', 'assignees'] as const

export const orderDraftSchema = z.object({
  client: z.object({
    match: draftClientSchema.nullable(),
    candidates: z.array(draftClientSchema),
    mentioned: z.object({
      name: z.string().nullable(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
    }),
  }),
  description: z.string().nullable(),
  dueDate: dateLocalSchema.nullable(),
  quotePence: penceSchema.nullable(),
  express: z.boolean(),
  garments: z.array(z.object({ description: z.string(), assigneeIds: z.array(idSchema) })),
  priceItemIds: z.array(idSchema),
  unsure: z.array(z.enum(UNSURE_FIELDS)),
})

export type DraftOrderInput = z.infer<typeof draftOrderSchema>
export type OrderDraft = z.infer<typeof orderDraftSchema>
export type UnsureField = (typeof UNSURE_FIELDS)[number]
