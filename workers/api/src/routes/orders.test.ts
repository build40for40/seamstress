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
