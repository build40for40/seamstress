import { describe, expect, it } from 'vitest'
import { listGarments } from '../db/garments'
import { createPhoto } from '../db/photos'
import { createEntry } from '../db/time-entries'
import { createTestTeam } from '../test/actors'

async function workshop() {
  const atelier = await createTestTeam({ name: 'Needle Test Atelier' })
  const ada = await atelier.addSeamstress('Ada Example')
  const bea = await atelier.addSeamstress('Bea Example')
  const shared = await atelier.addOrder({
    client: { name: 'Clara Client', phone: null, email: null, notes: 'Hates pins' },
    description: 'Wedding party alterations',
    garments: [
      { description: 'Bride gown hem', assignees: [ada] },
      { description: 'Bridesmaid dress', assignees: [bea] },
      { description: 'Veil', assignees: [] },
    ],
  })
  const beaOnly = await atelier.addOrder({ description: 'Coat relining', garments: [{ description: 'Coat', assignees: [bea] }] })
  const [gown, dress] = await listGarments(atelier.team.id, [shared.id])
  await createEntry(atelier.team.id, {
    member_id: ada.member.id,
    garment_id: gown!.id,
    kind: 'sewing',
    date_local: '2026-11-18',
    minutes: 90,
    created_by: ada.member.id,
  })
  await createEntry(atelier.team.id, {
    member_id: bea.member.id,
    garment_id: gown!.id,
    kind: 'sewing',
    date_local: '2026-11-18',
    minutes: 45,
    note: 'Bea was here',
    created_by: bea.member.id,
  })
  return { ...atelier, ada, bea, shared, beaOnly, gown: gown!, dress: dress! }
}

describe('GET /api/me/orders', () => {
  it('shows only her orders, her garments and a count of the others', async () => {
    const { ada, shared, gown } = await workshop()
    const { status, body } = await ada.get('/api/me/orders')

    expect(status).toBe(200)
    expect(body.orders).toHaveLength(1)
    expect(body.orders[0]).toEqual({
      id: shared.id,
      number: shared.number,
      description: 'Wedding party alterations',
      dueDate: shared.due_date,
      express: false,
      status: 'open',
      lastWorkedAt: expect.any(String),
      otherGarments: 2,
      garments: [
        {
          id: gown.id,
          orderId: shared.id,
          ref: `${shared.number}-A`,
          position: 0,
          description: 'Bride gown hem',
          status: 'todo',
          myMinutes: 90,
        },
      ],
    })
  })

  it('never leaks the client, other people or their hours in the raw response', async () => {
    const { ada, bea, shared } = await workshop()
    const raw = await (await ada.fetch('/api/me/orders')).text()

    for (const secret of ['Clara Client', 'Hates pins', bea.member.id, 'Bea Example', 'Bridesmaid dress', 'Veil', shared.tracking_token, shared.client_id]) {
      expect(raw).not.toContain(secret)
    }
    expect(raw).not.toMatch(/quote|client|team_id|tracking/i)
  })
})

describe('GET /api/me/garments/:id', () => {
  it('shows the brief, the photos and only her entries', async () => {
    const { team, ada, bea, gown } = await workshop()
    await createPhoto(team.id, { garment_id: gown.id, member_id: bea.member.id, taken_on: '2026-11-18', caption: 'Pinned hem' })

    const { status, body } = await ada.get(`/api/me/garments/${gown.id}`)
    expect(status).toBe(200)
    expect(body.garment.description).toBe('Bride gown hem')
    expect(body.entries).toHaveLength(1)
    expect(body.entries[0]).toMatchObject({ minutes: 90, kind: 'sewing' })
    expect(body.photos).toEqual([expect.objectContaining({ caption: 'Pinned hem', mine: false })])

    const raw = JSON.stringify(body)
    expect(raw).not.toContain(bea.member.id)
    expect(raw).not.toContain('Bea was here')
  })

  it("answers 404 for a garment that isn't hers or is in another atelier", async () => {
    const { ada, dress } = await workshop()
    const other = await workshop()

    expect((await ada.get(`/api/me/garments/${dress.id}`)).status).toBe(404)
    expect((await ada.get(`/api/me/garments/${other.gown.id}`)).status).toBe(404)
  })
})
