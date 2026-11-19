import { localDate } from '@seamstress/shared/time'
import { describe, expect, it } from 'vitest'
import { listGarments } from '../db/garments'
import { createEntry } from '../db/time-entries'
import { createTestTeam } from '../test/actors'

describe('GET /api/dashboard', () => {
  it('values unbilled work, over-quote orders and the billable share this month', async () => {
    const { team, owner, addSeamstress, addOrder } = await createTestTeam({ hourlyRatePence: 6000 })
    const ada = await addSeamstress()
    const order = await addOrder({ quote_pence: 5000, garments: [{ description: 'Hem', assignees: [ada] }] })
    const [hem] = await listGarments(team.id, [order.id])
    const today = localDate(new Date(), 'Europe/London')
    const entry = { member_id: ada.member.id, date_local: today, created_by: ada.member.id }
    await createEntry(team.id, { ...entry, garment_id: hem!.id, kind: 'sewing', minutes: 90, review_status: 'approved' })
    await createEntry(team.id, { ...entry, garment_id: null, kind: 'waiting', minutes: 30 })

    const { status, body } = await owner.get('/api/dashboard')
    expect(status).toBe(200)
    expect(body.unbilled).toMatchObject({ minutes: 90, pence: 9000 })
    expect(body.unbilled.clients[0].orders).toEqual([{ orderId: order.id, minutes: 90, pence: 9000 }])
    expect(body.orders[order.id]).toEqual({ number: 'SE-1001', clientId: order.client_id })
    expect(body.overQuote).toEqual({ count: 1, orderIds: [order.id] })
    expect(body.billableShare).toEqual({ billableMinutes: 90, paidMinutes: 120, share: 0.75 })
  })
})
