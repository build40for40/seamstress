import { describe, expect, it } from 'vitest'
import { createTestTeam } from '../test/actors'
import { createClient } from './clients'
import { listAssignees, listGarments } from './garments'
import { createOrder, findOrderByTrackingToken, getOrder, listOrders, regenerateTrackingToken } from './orders'

describe('orders queries', () => {
  it('numbers orders and garments per atelier', async () => {
    const first = await createTestTeam()
    const second = await createTestTeam()
    const a = await first.addOrder({ garments: [{ description: 'One' }, { description: 'Two' }] })
    const b = await first.addOrder()
    const c = await second.addOrder()

    expect([a.number, b.number, c.number]).toEqual(['SE-1001', 'SE-1002', 'SE-1001'])
    expect((await listGarments(first.team.id, [a.id])).map((garment) => garment.ref)).toEqual(['SE-1001-A', 'SE-1001-B'])
  })

  it("never reads or links another atelier's rows", async () => {
    const first = await createTestTeam()
    const second = await createTestTeam()
    const theirClient = await createClient(second.team.id, { name: 'Their Client' })
    const theirSeamstress = await second.addSeamstress()
    const order = await first.addOrder()

    expect(await getOrder(second.team.id, order.id)).toBeNull()
    expect(await listOrders(second.team.id)).toEqual([])
    expect(await regenerateTrackingToken(second.team.id, order.id)).toBeNull()

    const borrowed = await createOrder(
      first.team.id,
      { client: { id: theirClient.id }, description: 'x', quote_pence: null, due_date: null, express: false, garments: [] },
      first.owner.member.id,
    )
    expect(borrowed).toBeNull()

    const poached = await first.addOrder({ garments: [{ description: 'Hem', assignees: [theirSeamstress] }] })
    const [garment] = await listGarments(first.team.id, [poached.id])
    expect(await listAssignees(first.team.id, [garment!.id])).toEqual([])
  })

  it('finds an order by its tracking token until it is regenerated', async () => {
    const { team, addOrder } = await createTestTeam()
    const order = await addOrder()
    expect((await findOrderByTrackingToken(order.tracking_token))?.id).toBe(order.id)

    const token = await regenerateTrackingToken(team.id, order.id)
    expect(await findOrderByTrackingToken(order.tracking_token)).toBeNull()
    expect((await findOrderByTrackingToken(token!))?.id).toBe(order.id)
  })
})
