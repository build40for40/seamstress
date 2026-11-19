import { describe, expect, it } from 'vitest'
import { createTestTeam } from '../test/actors'

describe('GET /api/orders/:id', () => {
  it("shows an owner her own order and hides another atelier's", async () => {
    const first = await createTestTeam({ name: 'First Atelier' })
    const second = await createTestTeam({ name: 'Second Atelier' })
    const order = await first.addOrder({ client: { name: 'Clara Client' } })

    const mine = await first.owner.get(`/api/orders/${order.id}`)
    expect(mine.status).toBe(200)
    expect(mine.body.order.number).toBe('SE-1001')
    expect(mine.body.client.name).toBe('Clara Client')

    const theirs = await second.owner.get(`/api/orders/${order.id}`)
    expect(theirs.status).toBe(404)
    expect(JSON.stringify(theirs.body)).not.toContain('Clara Client')
  })

  it('is for owners only', async () => {
    const { addSeamstress, addOrder } = await createTestTeam()
    const ada = await addSeamstress()
    const order = await addOrder({ garments: [{ description: 'Hem', assignees: [ada] }] })
    expect((await ada.get(`/api/orders/${order.id}`)).status).toBe(401)
  })
})

describe('POST /api/orders', () => {
  it('takes in an order with a new client, numbered garments and assignees', async () => {
    const { owner, addSeamstress } = await createTestTeam()
    const ada = await addSeamstress('Ada Example')

    const { status, body } = await owner.send('POST', '/api/orders', {
      client: { name: 'New Client', phone: '000 0000 0000' },
      description: 'Wedding alterations',
      quotePence: 12000,
      dueDate: '2026-12-01',
      express: true,
      garments: [{ description: 'Gown hem', assigneeIds: [ada.member.id] }, { description: 'Veil' }],
    })
    expect(status).toBe(201)
    expect(body.order).toMatchObject({ number: 'SE-1001', express: true, quotePence: 12000, client: { name: 'New Client' } })
    expect(body.order.garments).toMatchObject([
      { ref: 'SE-1001-A', assignees: [{ memberId: ada.member.id, name: 'Ada Example' }] },
      { ref: 'SE-1001-B', assignees: [] },
    ])
    expect(body.trackingUrl).toBe(`https://seamstress.build40for40.com/track/${body.order.trackingToken}`)
    expect(body.activity.map((row: { kind: string }) => row.kind)).toContain('created')
  })

  it("refuses another atelier's client", async () => {
    const first = await createTestTeam()
    const second = await createTestTeam()
    const theirs = await second.addOrder()

    const { status } = await first.owner.send('POST', '/api/orders', {
      client: { id: theirs.client_id },
      description: 'x',
      quotePence: 100,
      dueDate: '2026-12-01',
      garments: [{ description: 'Hem' }],
    })
    expect(status).toBe(404)
  })
})

describe('order and garment stages', () => {
  it('only goes ready once every garment is done, and lists flags', async () => {
    const { owner, addOrder } = await createTestTeam()
    const order = await addOrder({ due_date: '2020-01-01', garments: [{ description: 'Hem' }, { description: 'Zip' }] })
    const { body } = await owner.get(`/api/orders/${order.id}`)
    expect(body.order.flags).toEqual({ due: 'overdue', overQuote: false, waitingReviews: 0 })

    const early = await owner.send('PATCH', `/api/orders/${order.id}`, { status: 'ready' })
    expect(early).toEqual({ status: 409, body: { error: "It can't be ready until every garment is done." } })

    for (const garment of body.order.garments) {
      expect((await owner.send('PATCH', `/api/garments/${garment.id}`, { status: 'done' })).status).toBe(200)
    }
    const ready = await owner.send('PATCH', `/api/orders/${order.id}`, { status: 'ready' })
    expect(ready.status).toBe(200)
    expect(ready.body.order).toMatchObject({ status: 'ready', allGarmentsDone: true, flags: { due: null } })

    const open = await owner.get('/api/orders')
    expect(open.body.orders).toEqual([])
    const all = await owner.get('/api/orders?status=all')
    expect(all.body.orders.map((row: { id: string }) => row.id)).toEqual([order.id])
  })

  it('reassigns a garment, keeping only members of the atelier', async () => {
    const first = await createTestTeam()
    const second = await createTestTeam()
    const ada = await first.addSeamstress('Ada Example')
    const outsider = await second.addSeamstress('Outsider Example')
    const order = await first.addOrder()
    const { body } = await first.owner.get(`/api/orders/${order.id}`)
    const garmentId = body.order.garments[0].id

    const { status, body: after } = await first.owner.send('PUT', `/api/garments/${garmentId}/assignees`, {
      memberIds: [ada.member.id, outsider.member.id],
    })
    expect(status).toBe(200)
    expect(after.order.garments[0].assignees).toEqual([{ memberId: ada.member.id, name: 'Ada Example' }])
    expect((await second.owner.send('PUT', `/api/garments/${garmentId}/assignees`, { memberIds: [] })).status).toBe(404)
  })
})
