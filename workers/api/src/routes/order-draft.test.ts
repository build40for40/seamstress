import { addDays, localDate } from '@seamless/shared/time'
import { STUDIO_TIME_ZONE } from '@seamless/shared/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '../db/clients'
import { createPriceItem } from '../db/price-items'
import { createTestTeam } from '../test/actors'

const realFetch = globalThis.fetch

type Call = { body: any; headers: Headers }
type Reply = (body: any) => Response | Promise<Response>

function stubProviders(anthropic: Reply, typesafe: Reply) {
  const calls = { anthropic: [] as Call[], typesafe: [] as Call[] }
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new Request(input).url
    const call = () => ({ body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) })
    if (url === 'https://api.anthropic.com/v1/messages') {
      calls.anthropic.push(call())
      return anthropic(calls.anthropic.at(-1)!.body)
    }
    if (url === 'https://api.typesafe.ai/v1/systemone') {
      calls.typesafe.push(call())
      return typesafe(calls.typesafe.at(-1)!.body)
    }
    return realFetch(input, init)
  }) as typeof fetch
  return calls
}

afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

const today = () => localDate(new Date(), STUDIO_TIME_ZONE)

const reading = (overrides: Record<string, unknown> = {}) => ({
  client: { name: 'Mrs Fake', phone: null, email: null },
  description: 'Wedding gown alterations and a bolero',
  garments: [
    { description: 'Wedding gown: take in the bodice, hem', people: ['Bea'] },
    { description: 'Bolero', people: [] },
  ],
  quote_pounds: 480,
  due_date: addDays(today(), 10),
  due_date_words: 'by the 12th',
  due_date_exact: false,
  unclear: [],
  ...overrides,
})

const llmSays =
  (input: unknown): Reply =>
  () =>
    Response.json({
      id: 'msg_fake',
      type: 'message',
      role: 'assistant',
      model: 'claude-haiku-5-5',
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'toolu_fake', name: 'record_order', input }],
    })

const jevSays =
  (answers: Record<string, number | [string, number]>): Reply =>
  (body) => {
    const out: Record<string, unknown> = {}
    for (const [id, question] of Object.entries<any>(body.questions)) {
      if (question.type === 'noul') {
        out[id] = { type: 'noul', noul: answers[id] ?? 0.05 }
        continue
      }
      const options = Object.keys(question.criteria)
      const [choice, probability] = (answers[id] as [string, number] | undefined) ?? [options[0]!, 0.9]
      const rest = (1 - probability) / Math.max(options.length - 1, 1)
      out[id] = {
        type: 'choice',
        choice,
        confidence: probability,
        probabilities: Object.fromEntries(options.map((option) => [option, option === choice ? probability : rest])),
      }
    }
    return Response.json({ model: 'jev-1.14.0', answers: out, usage: { input_tokens: 100, output_tokens: 10 } })
  }

const confident = {
  client_fits: 0.92,
  client_pick: ['Felicity Fake', 0.88] as [string, number],
  person_0_fits: 0.95,
  person_0_pick: ['Bea Example', 0.97] as [string, number],
  price_item_0: 0.9,
  price_item_1: 0.2,
  express: 0.05,
}

async function atelier() {
  const team = await createTestTeam()
  const bea = await team.addSeamstress('Bea Example')
  const felicity = await createClient(team.team.id, { name: 'Felicity Fake', phone: '01632 960 001' })
  const frank = await createClient(team.team.id, { name: 'Frank Fake', phone: '01632 960 002' })
  await createClient(team.team.id, { name: 'Penny Placeholder', phone: '01632 960 003' })
  const hem = await createPriceItem(team.team.id, { name: 'Hem', price_pence: 2500 })
  await createPriceItem(team.team.id, { name: 'Take in waist', price_pence: 4000 })
  return { ...team, bea, felicity, frank, hem }
}

const NOTE = 'Mrs Fake back again, wedding gown take in the bodice and hem, plus a bolero, Bea on the gown, needs it by the 12th, quoted 480'

describe('POST /api/orders/draft', () => {
  it('turns a note into a draft, with the judgments from Jev', async () => {
    const calls = stubProviders(llmSays(reading()), jevSays(confident))
    const { owner, bea, felicity, frank, hem } = await atelier()

    const { status, body } = await owner.send('POST', '/api/orders/draft', { note: NOTE })

    expect(status).toBe(200)
    expect(body).toEqual({
      client: {
        match: { id: felicity.id, name: 'Felicity Fake', phone: '01632 960 001' },
        candidates: [
          { id: felicity.id, name: 'Felicity Fake', phone: '01632 960 001' },
          { id: frank.id, name: 'Frank Fake', phone: '01632 960 002' },
        ],
        mentioned: { name: 'Mrs Fake', phone: null, email: null },
      },
      description: 'Wedding gown alterations and a bolero',
      dueDate: addDays(today(), 10),
      quotePence: 48000,
      express: false,
      garments: [
        { description: 'Wedding gown: take in the bodice, hem', assigneeIds: [bea.member.id] },
        { description: 'Bolero', assigneeIds: [] },
      ],
      priceItemIds: [hem.id],
      unsure: ['dueDate'],
    })

    const [llm] = calls.anthropic
    expect(llm!.headers.get('x-api-key')).toBe('fake-anthropic-key')
    expect(llm!.body).toMatchObject({ model: 'claude-haiku-5-5', tool_choice: { type: 'tool', name: 'record_order' } })
    expect(llm!.body.messages[0].content).toContain(today())
    expect(llm!.body.messages[0].content).toContain(NOTE)

    const [jev] = calls.typesafe
    expect(jev!.headers.get('Authorization')).toBe('Bearer fake-typesafe-key')
    expect(jev!.body.state).toEqual({
      note: NOTE,
      client_candidates: ['Felicity Fake', 'Frank Fake'],
      team_members: ['Olive Owner', 'Bea Example'],
    })
  })

  it('matches a phone number in code and never sends contact details to Jev', async () => {
    const note = 'Felicity on 01632 960001, fake@example.com, hem on some trousers'
    const calls = stubProviders(
      llmSays(
        reading({
          client: { name: 'Felicity', phone: '01632 960001', email: 'fake@example.com' },
          garments: [{ description: 'Trousers: hem', people: [] }],
        }),
      ),
      jevSays(confident),
    )
    const { owner, felicity } = await atelier()

    const { body } = await owner.send('POST', '/api/orders/draft', { note })

    expect(body.client.match.id).toBe(felicity.id)
    expect(body.client.mentioned).toEqual({ name: 'Felicity', phone: '01632 960001', email: 'fake@example.com' })
    const sent = JSON.stringify(calls.typesafe[0]!.body)
    expect(sent).not.toContain('01632')
    expect(sent).not.toContain('example.com')
    expect(calls.typesafe[0]!.body.questions).not.toHaveProperty('client_fits')
  })

  it('refuses a seamstress key', async () => {
    const calls = stubProviders(llmSays(reading()), jevSays(confident))
    const { addSeamstress } = await atelier()
    const ada = await addSeamstress('Ada Example')

    const { status } = await ada.send('POST', '/api/orders/draft', { note: NOTE })

    expect(status).toBe(401)
    expect(calls.anthropic).toHaveLength(0)
  })

  it("never offers another atelier's clients", async () => {
    const calls = stubProviders(llmSays(reading({ client: { name: 'Fiona Fake', phone: null, email: null } })), jevSays(confident))
    const { owner, felicity, frank } = await atelier()
    const other = await createTestTeam()
    await createClient(other.team.id, { name: 'Fiona Fake', phone: '01632 960 009' })

    const { body } = await owner.send('POST', '/api/orders/draft', { note: 'Fiona Fake, a hem' })

    expect(body.client.candidates.map((client: { id: string }) => client.id)).toEqual([felicity.id, frank.id])
    expect(calls.typesafe[0]!.body.state.client_candidates).not.toContain('Fiona Fake')
  })

  it('answers 502 when the note reading fails, so the studio can show the form', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const calls = stubProviders(() => Response.json({ error: { message: 'overloaded' } }, { status: 529 }), jevSays(confident))
    const { owner } = await atelier()

    const { status, body } = await owner.send('POST', '/api/orders/draft', { note: NOTE })

    expect(status).toBe(502)
    expect(body.error).toMatch(/fill in the form/)
    expect(calls.typesafe).toHaveLength(0)
    expect(error).toHaveBeenCalled()
  })

  it('answers 502 when the note reading comes back in the wrong shape', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stubProviders(llmSays({ garments: 'one dress' }), jevSays(confident))
    const { owner } = await atelier()

    const { status } = await owner.send('POST', '/api/orders/draft', { note: NOTE })

    expect(status).toBe(502)
  })

  it('still drafts when Jev fails, leaving its parts unset and unsure', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    stubProviders(llmSays(reading()), () => Response.json({ detail: 'down' }, { status: 500 }))
    const { owner } = await atelier()

    const { status, body } = await owner.send('POST', '/api/orders/draft', { note: NOTE })

    expect(status).toBe(200)
    expect(body.client.match).toBeNull()
    expect(body.client.candidates).toHaveLength(2)
    expect(body.garments.map((garment: { assigneeIds: string[] }) => garment.assigneeIds)).toEqual([[], []])
    expect(body.priceItemIds).toEqual([])
    expect(body.express).toBe(false)
    expect(body.quotePence).toBe(48000)
    expect(body.unsure).toEqual(['client', 'dueDate', 'quotePence', 'express', 'assignees'])
    expect(error).toHaveBeenCalled()
  })

  it('leaves in-between judgments unset and lists them as unsure', async () => {
    stubProviders(
      llmSays(reading({ due_date_words: '12 December', due_date_exact: true })),
      jevSays({ ...confident, client_fits: 0.5, person_0_fits: 0.55, price_item_0: 0.45, express: 0.6 }),
    )
    const { owner } = await atelier()

    const { body } = await owner.send('POST', '/api/orders/draft', { note: NOTE })

    expect(body.client.match).toBeNull()
    expect(body.garments[0].assigneeIds).toEqual([])
    expect(body.priceItemIds).toEqual([])
    expect(body.express).toBe(false)
    expect(body.unsure).toEqual(['client', 'quotePence', 'express', 'assignees'])
  })

  it.each(['2020-01-01', '2026-02-30', 'next Friday'])('drops a due date of %s and flags it', async (dueDate) => {
    stubProviders(llmSays(reading({ due_date: dueDate, due_date_exact: true })), jevSays(confident))
    const { owner } = await atelier()

    const { body } = await owner.send('POST', '/api/orders/draft', { note: NOTE })

    expect(body.dueDate).toBeNull()
    expect(body.unsure).toContain('dueDate')
  })
})
