import { poundsToPence } from '@seamless/shared/format'
import { orderDraftSchema, UNSURE_FIELDS, type OrderDraft, type UnsureField } from '@seamless/shared/order-draft'
import { dateLocalSchema, emailSchema, penceSchema } from '@seamless/shared/schemas'
import { daysBetween } from '@seamless/shared/time'
import { findCandidates, withoutContactDetails, type KnownClient } from './clients'
import { askJev } from './jev'
import { readNote, type NoteReading, UNCLEAR_PARTS } from './llm'
import { draftQuestions, type Judgments, type Named, verdictOf, YES } from './questions'

const MAX_GARMENTS = 26
const MAX_TEXT = 2000
const MAX_NAME = 120
const MAX_PHONE = 40
const FAR_AHEAD_DAYS = 366
const WRITER = 'me'

const UNSURE_FOR: Record<(typeof UNCLEAR_PARTS)[number], UnsureField> = {
  client: 'client',
  description: 'description',
  garments: 'garments',
  people: 'assignees',
  quote: 'quotePence',
  due_date: 'dueDate',
}

export type DraftContext = {
  note: string
  today: string
  writerId: string
  clients: KnownClient[]
  members: Named[]
  priceItems: Named[]
}

export type DraftKeys = { anthropic?: string; typesafe?: string; fetch?: typeof fetch }

export class DraftUnavailable extends Error {
  constructor(
    readonly status: 502 | 503,
    message: string,
  ) {
    super(message)
  }
}

const clip = (value: string | null, max: number) => value?.trim().slice(0, max) || null

const personKey = (name: string) => name.trim().toLowerCase()

function mentionedClient(client: NoteReading['client'], unsure: Set<UnsureField>) {
  const email = clip(client.email, MAX_TEXT)
  const validEmail = email ? emailSchema.safeParse(email) : null
  if (validEmail && !validEmail.success) unsure.add('client')
  return {
    name: clip(client.name, MAX_NAME),
    phone: clip(client.phone, MAX_PHONE),
    email: validEmail?.success ? validEmail.data : null,
  }
}

function dueDate(reading: NoteReading, today: string, unsure: Set<UnsureField>) {
  const date = reading.due_date
  if (!date) {
    if (reading.due_date_words) unsure.add('dueDate')
    return null
  }
  if (!dateLocalSchema.safeParse(date).success || date < today) {
    unsure.add('dueDate')
    return null
  }
  if (!reading.due_date_exact || daysBetween(today, date) > FAR_AHEAD_DAYS) unsure.add('dueDate')
  return date
}

function quotePence(pounds: number | null, unsure: Set<UnsureField>) {
  if (pounds === null) return null
  const pence = penceSchema.safeParse(poundsToPence(pounds))
  if (pence.success) return pence.data
  unsure.add('quotePence')
  return null
}

async function judge(keys: DraftKeys, asked: ReturnType<typeof draftQuestions>): Promise<Judgments | null> {
  if (!keys.typesafe) {
    console.error('order draft: TYPESAFE_API_KEY is not set, so Jev was not asked')
    return null
  }
  try {
    return asked.read(await askJev(keys.typesafe, asked.request, keys.fetch))
  } catch (error) {
    console.error('order draft: asking Jev failed', error)
    return null
  }
}

export async function draftOrder(context: DraftContext, keys: DraftKeys): Promise<OrderDraft> {
  if (!keys.anthropic) {
    console.error('order draft: ANTHROPIC_API_KEY is not set')
    throw new DraftUnavailable(503, "Drafting from a note isn't switched on yet. Fill in the form instead.")
  }
  let reading: NoteReading
  try {
    reading = await readNote(keys.anthropic, context.note, context.today, keys.fetch)
  } catch (error) {
    console.error('order draft: reading the note failed', error)
    throw new DraftUnavailable(502, "We couldn't read that note just now. Try again, or fill in the form instead.")
  }

  const unsure = new Set<UnsureField>(reading.unclear.map((part) => UNSURE_FOR[part]))

  const mentioned = mentionedClient(reading.client, unsure)
  const { byPhone, candidates } = findCandidates(context.clients, mentioned)
  const phoneMatch = byPhone && candidates.length === 1 ? candidates[0]! : null

  const garments = reading.garments
    .map((garment) => ({ description: garment.description.trim().slice(0, MAX_TEXT), people: garment.people }))
    .filter((garment) => garment.description)
  if (garments.length > MAX_GARMENTS || garments.length === 0) unsure.add('garments')
  garments.splice(MAX_GARMENTS)

  const people = new Map<string, string>()
  for (const name of garments.flatMap((garment) => garment.people)) {
    const key = personKey(name)
    if (key && key !== WRITER && !people.has(key)) people.set(key, name.trim())
  }

  const asked = draftQuestions({
    note: withoutContactDetails(context.note, mentioned.phone, mentioned.email),
    candidates: phoneMatch ? [] : candidates,
    people: [...people.values()],
    members: context.members,
    priceItems: context.priceItems,
  })
  const judgments = await judge(keys, asked)

  let match = phoneMatch
  if (!match && candidates.length > 0) {
    const pick = judgments?.client
    const fits = pick ? verdictOf(pick.fits) : 'unsure'
    if (pick && fits === 'yes' && pick.probability > YES) match = candidates.find((client) => client.id === pick.id) ?? null
    else if (fits !== 'no') unsure.add('client')
  }

  const assigneeIds = (names: string[]) => {
    const ids = new Set<string>()
    for (const name of names) {
      const key = personKey(name)
      if (key === WRITER) {
        ids.add(context.writerId)
        continue
      }
      const pick = judgments?.people.get(people.get(key)!)
      if (pick && verdictOf(pick.fits) === 'yes' && pick.probability > YES) ids.add(pick.id)
      else unsure.add('assignees')
    }
    return [...ids]
  }

  const priceItemIds: string[] = []
  if (!judgments && context.priceItems.length > 0) unsure.add('quotePence')
  for (const [id, probability] of judgments?.priceItems ?? []) {
    const verdict = verdictOf(probability)
    if (verdict === 'yes') priceItemIds.push(id)
    if (verdict === 'unsure') unsure.add('quotePence')
  }

  const express = judgments ? verdictOf(judgments.express) : 'unsure'
  if (express === 'unsure') unsure.add('express')

  const draftGarments = garments.map((garment) => ({ description: garment.description, assigneeIds: assigneeIds(garment.people) }))
  const due = dueDate(reading, context.today, unsure)
  const quote = quotePence(reading.quote_pounds, unsure)
  const asDraftClient = (client: KnownClient) => ({ id: client.id, name: client.name, phone: client.phone ?? '' })

  return orderDraftSchema.parse({
    client: {
      match: match ? asDraftClient(match) : null,
      candidates: candidates.map(asDraftClient),
      mentioned,
    },
    description: clip(reading.description, MAX_TEXT),
    dueDate: due,
    quotePence: quote,
    express: express === 'yes',
    garments: draftGarments,
    priceItemIds,
    unsure: UNSURE_FIELDS.filter((field) => unsure.has(field)),
  })
}
