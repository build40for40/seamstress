import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { OrderDraft, UnsureField } from '@seamstress/shared/order-draft'
import type { KnownClient } from '../src/order-draft/clients'
import { draftOrder } from '../src/order-draft/draft'
import type { Named } from '../src/order-draft/questions'

type Expected = Partial<{
  clientMatch: string | null
  candidates: string[]
  mentioned: OrderDraft['client']['mentioned']
  dueDate: string | null
  quotePence: number | null
  express: boolean
  garments: string[][]
  priceItemIds: string[]
  unsure: UnsureField[]
  sure: UnsureField[]
}>

type Fixture = {
  today: string
  team: { writerId: string; members: Named[]; clients: KnownClient[]; priceItems: Named[] }
  notes: { id: string; about: string; note: string; expected: Expected }[]
}

const args = process.argv.slice(2)
const showRequests = args.includes('--show-requests')
const only = args.find((arg) => arg.startsWith('--case='))?.split('=')[1]

if (args.includes('--help')) {
  console.log(`Runs each note in fixtures/order_notes.json through Claude and Jev and scores the drafts.

  --show-requests   print every request body sent to Anthropic and TypeSafe
  --case=<id>       run one note only

Keys come from ANTHROPIC_API_KEY and TYPESAFE_API_KEY, or from workers/api/.dev.vars.`)
  process.exit(0)
}

function devVars() {
  const path = join(import.meta.dirname, '..', '.dev.vars')
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
      .filter((match) => match !== null)
      .map((match) => [match[1]!, match[2]!.replace(/^["']|["']$/g, '')]),
  ) as Record<string, string>
}

const vars = devVars()
const anthropic = process.env.ANTHROPIC_API_KEY || vars.ANTHROPIC_API_KEY
const typesafe = process.env.TYPESAFE_API_KEY || vars.TYPESAFE_API_KEY
const missing = [!anthropic && 'ANTHROPIC_API_KEY', !typesafe && 'TYPESAFE_API_KEY'].filter(Boolean)
if (missing.length > 0) {
  console.error(
    `Missing ${missing.join(' and ')}. Set ${missing.length > 1 ? 'them' : 'it'} in your shell or in workers/api/.dev.vars, then run this again. The eval sends every note to Anthropic and TypeSafe, so it needs real keys.`,
  )
  process.exit(1)
}

const fixture: Fixture = JSON.parse(readFileSync(join(import.meta.dirname, '../../../fixtures/order_notes.json'), 'utf8'))

const printing: typeof fetch = async (input, init) => {
  console.log(`\n  → POST ${new Request(input).url}\n${JSON.stringify(JSON.parse(String(init?.body)), null, 2).replace(/^/gm, '    ')}\n`)
  return fetch(input, init)
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n')

const checks: Record<keyof Expected, (draft: OrderDraft, expected: Expected) => boolean> = {
  clientMatch: (draft, expected) => (draft.client.match?.id ?? null) === expected.clientMatch,
  candidates: (draft, expected) => expected.candidates!.every((id) => draft.client.candidates.some((client) => client.id === id)),
  mentioned: (draft, expected) =>
    (['name', 'phone', 'email'] as const).every(
      (field) => (draft.client.mentioned[field]?.toLowerCase() ?? null) === (expected.mentioned![field]?.toLowerCase() ?? null),
    ),
  dueDate: (draft, expected) => draft.dueDate === expected.dueDate,
  quotePence: (draft, expected) => draft.quotePence === expected.quotePence,
  express: (draft, expected) => draft.express === expected.express,
  garments: (draft, expected) =>
    draft.garments.length === expected.garments!.length &&
    draft.garments.every((garment, index) => sameSet(garment.assigneeIds, expected.garments![index]!)),
  priceItemIds: (draft, expected) => sameSet(draft.priceItemIds, expected.priceItemIds!),
  unsure: (draft, expected) => expected.unsure!.every((field) => draft.unsure.includes(field)),
  sure: (draft, expected) => expected.sure!.every((field) => !draft.unsure.includes(field)),
}

const tally = new Map<string, { hits: number; misses: string[] }>()
const notes = fixture.notes.filter((entry) => !only || entry.id === only)
if (notes.length === 0) {
  console.error(`No note has the id ${only}.`)
  process.exit(1)
}

for (const entry of notes) {
  console.log(`\n${entry.id}: ${entry.about}\n  "${entry.note}"`)
  let draft: OrderDraft
  try {
    draft = await draftOrder(
      { note: entry.note, today: fixture.today, ...fixture.team },
      { anthropic, typesafe, fetch: showRequests ? printing : fetch },
    )
  } catch (error) {
    console.log(`  ✗ no draft: ${error instanceof Error ? error.message : error}`)
    const row = tally.get('draft') ?? { hits: 0, misses: [] }
    row.misses.push(entry.id)
    tally.set('draft', row)
    continue
  }
  console.log(`  description: ${draft.description}`)
  draft.garments.forEach((garment) => console.log(`  garment: ${garment.description} [${garment.assigneeIds.join(', ')}]`))
  console.log(`  unsure: ${draft.unsure.join(', ') || 'nothing'}`)
  for (const field of Object.keys(entry.expected) as (keyof Expected)[]) {
    const hit = checks[field](draft, entry.expected)
    const row = tally.get(field) ?? { hits: 0, misses: [] }
    if (hit) row.hits++
    else row.misses.push(entry.id)
    tally.set(field, row)
    if (!hit) console.log(`  ✗ ${field}: expected ${JSON.stringify(entry.expected[field])}, got ${JSON.stringify(actual(draft, field))}`)
  }
}

function actual(draft: OrderDraft, field: keyof Expected) {
  switch (field) {
    case 'clientMatch':
      return draft.client.match?.id ?? null
    case 'candidates':
      return draft.client.candidates.map((client) => client.id)
    case 'mentioned':
      return draft.client.mentioned
    case 'garments':
      return draft.garments.map((garment) => garment.assigneeIds)
    case 'sure':
      return draft.unsure
    default:
      return draft[field]
  }
}

console.log('\nPer field')
for (const [field, { hits, misses }] of tally) {
  const total = hits + misses.length
  console.log(`  ${field.padEnd(14)} ${String(hits).padStart(2)}/${total}${misses.length ? `  missed: ${misses.join(', ')}` : ''}`)
}
