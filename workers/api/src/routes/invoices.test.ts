import { describe, expect, it } from 'vitest'
import { listGarments } from '../db/garments'
import { createEntry, getEntry, type NewEntry } from '../db/time-entries'
import { createTestTeam } from '../test/actors'

async function workshop() {
  const atelier = await createTestTeam({ hourlyRatePence: 6000 })
  const ada = await atelier.addSeamstress('Ada Example')
  const order = await atelier.addOrder({
    quote_pence: 10000,
    garments: [
      { description: 'Gown hem', assignees: [ada] },
      { description: 'Veil', assignees: [ada] },
    ],
  })
  const [gown, veil] = await listGarments(atelier.team.id, [order.id])
  const log = (entry: Partial<NewEntry>) =>
    createEntry(atelier.team.id, {
      member_id: ada.member.id,
      garment_id: gown!.id,
      kind: 'sewing',
      date_local: '2026-11-18',
      minutes: 60,
      review_status: 'approved',
      created_by: ada.member.id,
      ...entry,
    }).then((created) => created!)
  const entries = {
    gown: await log({ minutes: 90 }),
    veil: await log({ garment_id: veil!.id, minutes: 60 }),
    waiting: await log({ minutes: 30, review_status: 'waiting' }),
    heldBack: await log({ minutes: 45, review_status: 'held_back', note: 'Unpicked my own mistake' }),
  }
  return { ...atelier, ada, order, gown: gown!, veil: veil!, log, entries }
}

describe('invoices', () => {
  it('drafts from approved hours, leaving out waiting ones and listing held-back ones unticked', async () => {
    const { owner, order, gown, veil, entries } = await workshop()

    const { status, body } = await owner.send('POST', `/api/orders/${order.id}/invoices`)
    expect(status).toBe(200)
    expect(body.invoice).toMatchObject({ status: 'draft', number: null, orderId: order.id })
    expect(body.draft).toMatchObject({
      lines: [
        { garmentId: gown.id, ref: 'SE-1001-A', minutes: 90, pence: 9000 },
        { garmentId: veil.id, ref: 'SE-1001-B', minutes: 60, pence: 6000 },
      ],
      minutes: 150,
      hourlyTotalPence: 15000,
      quotePence: 10000,
      differencePence: 5000,
      overQuote: true,
      totalPence: 15000,
      waiting: { count: 1, minutes: 30 },
      heldBack: [{ entryId: entries.heldBack.id, minutes: 45, included: false }],
    })

    const again = await owner.send('POST', `/api/orders/${order.id}/invoices`)
    expect(again.body.invoice.id).toBe(body.invoice.id)
  })

  it('bills ticked held-back hours and uses the final price', async () => {
    const { owner, order, entries } = await workshop()
    const { body: draft } = await owner.send('POST', `/api/orders/${order.id}/invoices`)

    const { status, body } = await owner.send('PATCH', `/api/invoices/${draft.invoice.id}`, {
      includedHeldBack: [entries.heldBack.id],
      finalPricePence: 18000,
    })
    expect(status).toBe(200)
    expect(body.draft).toMatchObject({
      minutes: 195,
      hourlyTotalPence: 19500,
      finalPricePence: 18000,
      totalPence: 18000,
      differencePence: 9500,
      heldBack: [{ entryId: entries.heldBack.id, included: true }],
    })
  })

  it('sends with a number and a snapshot, and locks the billed hours', async () => {
    const { team, owner, order, entries, log } = await workshop()
    const { body: draft } = await owner.send('POST', `/api/orders/${order.id}/invoices`)
    await owner.send('PATCH', `/api/invoices/${draft.invoice.id}`, { finalPricePence: 14000 })

    const sent = await owner.send('POST', `/api/invoices/${draft.invoice.id}/send`)
    expect(sent.status).toBe(200)
    expect(sent.body.invoice).toMatchObject({ status: 'sent', number: 'INV-0001', sentAt: expect.any(String) })
    expect(sent.body.draft).toMatchObject({ minutes: 150, hourlyTotalPence: 15000, totalPence: 14000 })

    expect((await getEntry(team.id, entries.gown.id))!.invoice_id).toBe(draft.invoice.id)
    expect((await getEntry(team.id, entries.veil.id))!.invoice_id).toBe(draft.invoice.id)
    expect((await getEntry(team.id, entries.waiting.id))!.invoice_id).toBeNull()
    expect((await getEntry(team.id, entries.heldBack.id))!.invoice_id).toBeNull()

    await owner.send('PATCH', '/api/team', { hourlyRatePence: 9000 })
    await log({ minutes: 600 })
    const later = await owner.get(`/api/invoices/${draft.invoice.id}`)
    expect(later.body.draft).toEqual(sent.body.draft)

    const next = await owner.send('POST', `/api/orders/${order.id}/invoices`)
    expect(next.body.invoice.id).not.toBe(draft.invoice.id)
    expect(next.body.draft).toMatchObject({ minutes: 600, ratePence: 9000, hourlyTotalPence: 90000 })
  })

  it('refuses to change a sent invoice or its hours with a plain 409', async () => {
    const { owner, order, entries } = await workshop()
    const { body: draft } = await owner.send('POST', `/api/orders/${order.id}/invoices`)
    await owner.send('POST', `/api/invoices/${draft.invoice.id}/send`)

    const edit = await owner.send('PATCH', `/api/invoices/${draft.invoice.id}`, { finalPricePence: 1 })
    expect(edit).toEqual({ status: 409, body: { error: "That invoice has been sent, so it can't change." } })

    const resend = await owner.send('POST', `/api/invoices/${draft.invoice.id}/send`)
    expect(resend).toEqual({ status: 409, body: { error: 'That invoice has already been sent.' } })

    const review = await owner.send('POST', '/api/review', { entries: [{ id: entries.gown.id, status: 'held_back' }] })
    expect(review).toEqual({
      status: 409,
      body: { error: "Some of those hours are already on a sent invoice, so they can't change." },
    })
  })

  it('refuses to send an empty invoice, and marks a sent one paid', async () => {
    const { owner, addOrder, order } = await workshop()
    const empty = await addOrder()
    const { body: emptyDraft } = await owner.send('POST', `/api/orders/${empty.id}/invoices`)
    expect((await owner.send('POST', `/api/invoices/${emptyDraft.invoice.id}/send`)).status).toBe(409)

    const { body: draft } = await owner.send('POST', `/api/orders/${order.id}/invoices`)
    expect((await owner.send('POST', `/api/invoices/${draft.invoice.id}/paid`)).status).toBe(409)
    await owner.send('POST', `/api/invoices/${draft.invoice.id}/send`)
    const paid = await owner.send('POST', `/api/invoices/${draft.invoice.id}/paid`)
    expect(paid.body.invoice).toMatchObject({ status: 'paid', paidAt: expect.any(String) })
  })

  it("keeps another atelier's invoices out of reach", async () => {
    const mine = await workshop()
    const theirs = await workshop()
    const { body: draft } = await mine.owner.send('POST', `/api/orders/${mine.order.id}/invoices`)

    expect((await theirs.owner.get(`/api/invoices/${draft.invoice.id}`)).status).toBe(404)
    expect((await theirs.owner.send('POST', `/api/invoices/${draft.invoice.id}/send`)).status).toBe(404)
    expect((await theirs.owner.send('POST', `/api/orders/${mine.order.id}/invoices`)).status).toBe(404)
  })
})
