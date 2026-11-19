import { orderDraftSchema, type OrderDraft, type PriceItem } from '@seamless/shared'
import { describe, expect, it } from 'vitest'
import { formStateFromDraft, formStateFromFailedDraft } from './new-order-draft'

const priceItems: PriceItem[] = [
  { id: 'price-hem', teamId: 'team-1', name: 'Hem', pricePence: 2500, archivedAt: null },
  { id: 'price-zip', teamId: 'team-1', name: 'Zip', pricePence: 1800, archivedAt: null },
]

const clara = { id: 'client-1', name: 'Clara Example', phone: '020 0000 0001' }
const clare = { id: 'client-2', name: 'Clare Sample', phone: '020 0000 0002' }

function draft(overrides: Partial<OrderDraft> = {}): OrderDraft {
  return orderDraftSchema.parse({
    client: { match: clara, candidates: [], mentioned: { name: 'Clara', phone: null, email: null } },
    description: 'Gown and bolero',
    dueDate: '2026-12-12',
    quotePence: 48000,
    express: false,
    garments: [
      { description: 'Take in the bodice, hem', assigneeIds: ['member-1'] },
      { description: 'Bolero', assigneeIds: [] },
    ],
    priceItemIds: [],
    unsure: [],
    ...overrides,
  })
}

describe('order draft to form state', () => {
  it('selects the matched client', () => {
    const state = formStateFromDraft(draft(), priceItems)
    expect(state.client.mode).toBe('existing')
    expect(state.client.clientId).toBe('client-1')
    expect(state.description).toBe('Gown and bolero')
    expect(state.dueDate).toBe('2026-12-12')
    expect(state.garments).toHaveLength(2)
    expect(state.garments[0]?.assigneeIds).toEqual(['member-1'])
  })

  it('asks which client when there are candidates and no match', () => {
    const state = formStateFromDraft(
      draft({
        client: { match: null, candidates: [clara, clare], mentioned: { name: 'Clar', phone: '020 0000 0003', email: null } },
      }),
      priceItems,
    )
    expect(state.client.mode).toBe('new')
    expect(state.client.clientId).toBeNull()
    expect(state.client.candidates).toEqual([clara, clare])
    expect(state.client.fields).toMatchObject({ name: 'Clar', phone: '020 0000 0003', email: '' })
    expect(state.unsure).toContain('client')
  })

  it('prefills a new client, leaving unmentioned fields empty', () => {
    const state = formStateFromDraft(
      draft({ client: { match: null, candidates: [], mentioned: { name: null, phone: null, email: null } } }),
      priceItems,
    )
    expect(state.client.mode).toBe('new')
    expect(state.client.candidates).toEqual([])
    expect(state.client.fields).toEqual({ name: '', phone: '', email: '', notes: '' })
  })

  it('keeps the quoted price and does not add the picked items to it', () => {
    const state = formStateFromDraft(draft({ quotePence: 48000, priceItemIds: ['price-hem', 'price-zip'] }), priceItems)
    expect(state.quotePence).toBe(48000)
    expect(state.pricePicks).toEqual([
      { itemId: 'price-hem', counted: false },
      { itemId: 'price-zip', counted: false },
    ])
    expect(state.quoteFromItems).toBe(false)
  })

  it('sums the picked items when no quote was given, and flags it', () => {
    const state = formStateFromDraft(draft({ quotePence: null, priceItemIds: ['price-hem', 'price-zip'] }), priceItems)
    expect(state.quotePence).toBe(4300)
    expect(state.pricePicks.every((pick) => pick.counted)).toBe(true)
    expect(state.quoteFromItems).toBe(true)
    expect(state.unsure).toContain('quotePence')
  })

  it('leaves the quote empty with no quote and no items', () => {
    expect(formStateFromDraft(draft({ quotePence: null }), priceItems).quotePence).toBeNull()
  })

  it('carries the unsure fields through', () => {
    const state = formStateFromDraft(draft({ unsure: ['dueDate', 'assignees', 'express'] }), priceItems)
    expect(state.unsure).toEqual(['dueDate', 'assignees', 'express'])
  })

  it('keeps the note as the description when the draft call fails', () => {
    const state = formStateFromFailedDraft('Mrs Fake back again, hem please')
    expect(state.description).toBe('Mrs Fake back again, hem please')
    expect(state.client.clientId).toBeNull()
    expect(state.garments).toHaveLength(1)
  })
})
