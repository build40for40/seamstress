import type { OrderDraft, PriceItem, UnsureField } from '@seamstress/shared'

export type DraftClient = { id: string; name: string; phone: string }

export type PricePick = { itemId: string; counted: boolean }

export type OrderFormState = {
  client: {
    mode: 'existing' | 'new'
    clientId: string | null
    candidates: DraftClient[]
    fields: { name: string; phone: string; email: string; notes: string }
  }
  description: string
  dueDate: string
  express: boolean
  quotePence: number | null
  pricePicks: PricePick[]
  quoteFromItems: boolean
  garments: { description: string; assigneeIds: string[] }[]
  unsure: UnsureField[]
}

export function blankFormState(): OrderFormState {
  return {
    client: { mode: 'existing', clientId: null, candidates: [], fields: { name: '', phone: '', email: '', notes: '' } },
    description: '',
    dueDate: '',
    express: false,
    quotePence: null,
    pricePicks: [],
    quoteFromItems: false,
    garments: [{ description: '', assigneeIds: [] }],
    unsure: [],
  }
}

export function formStateFromFailedDraft(note: string): OrderFormState {
  return { ...blankFormState(), description: note }
}

export function formStateFromDraft(draft: OrderDraft, priceItems: PriceItem[]): OrderFormState {
  const state = blankFormState()
  const unsure = new Set<UnsureField>(draft.unsure)
  const { match, candidates, mentioned } = draft.client

  if (match) {
    state.client.mode = 'existing'
    state.client.clientId = match.id
  } else {
    state.client.mode = 'new'
    state.client.candidates = candidates
    state.client.fields.name = mentioned.name ?? ''
    state.client.fields.phone = mentioned.phone ?? ''
    state.client.fields.email = mentioned.email ?? ''
    if (candidates.length > 0) unsure.add('client')
  }

  state.description = draft.description ?? ''
  state.dueDate = draft.dueDate ?? ''
  state.express = draft.express

  const known = new Set(priceItems.map((item) => item.id))
  const picked = priceItems.filter((item) => draft.priceItemIds.includes(item.id) && known.has(item.id))
  const quoteGiven = draft.quotePence !== null
  state.pricePicks = picked.map((item) => ({ itemId: item.id, counted: !quoteGiven }))

  if (quoteGiven) {
    state.quotePence = draft.quotePence
  } else if (picked.length > 0) {
    state.quotePence = picked.reduce((sum, item) => sum + item.pricePence, 0)
    state.quoteFromItems = true
    unsure.add('quotePence')
  }

  if (draft.garments.length > 0) {
    state.garments = draft.garments.map((garment) => ({
      description: garment.description,
      assigneeIds: [...garment.assigneeIds],
    }))
  }

  state.unsure = [...unsure]
  return state
}
