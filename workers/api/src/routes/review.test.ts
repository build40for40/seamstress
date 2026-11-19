import { describe, expect, it } from 'vitest'
import { listActivity } from '../db/activity'
import { listGarments } from '../db/garments'
import { createPhoto, getPhoto } from '../db/photos'
import { createEntry, getEntry, type NewEntry } from '../db/time-entries'
import { createTestTeam } from '../test/actors'

async function workshop() {
  const atelier = await createTestTeam()
  const ada = await atelier.addSeamstress('Ada Example')
  const order = await atelier.addOrder({
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
      created_by: ada.member.id,
      ...entry,
    }).then((created) => created!)
  const sewing = await log({ minutes: 90 })
  const veiling = await log({ garment_id: veil!.id, minutes: 30 })
  const waiting = await log({ garment_id: null, kind: 'waiting', minutes: 20 })
  const photo = (await createPhoto(atelier.team.id, { garment_id: gown!.id, member_id: ada.member.id, taken_on: '2026-11-18' }))!
  return { ...atelier, ada, order, log, sewing, veiling, waiting, photo }
}

describe('GET /api/review', () => {
  it('groups waiting hours and photos by order, leaving out general time and running timers', async () => {
    const { owner, order, log, sewing, veiling, photo } = await workshop()
    await log({ minutes: null, started_at: new Date().toISOString() })

    const { status, body } = await owner.get('/api/review')
    expect(status).toBe(200)
    expect(body.orders).toHaveLength(1)
    expect(body.orders[0].order).toMatchObject({ id: order.id, number: 'SE-1001', clientName: 'Fake Client' })
    expect(body.orders[0].entries.map((entry: { id: string }) => entry.id).sort()).toEqual([sewing.id, veiling.id].sort())
    expect(body.orders[0].entries[0]).toMatchObject({ memberName: 'Ada Example', ref: expect.stringMatching(/^SE-1001-[AB]$/) })
    expect(body.orders[0].photos).toEqual([expect.objectContaining({ id: photo.id, url: `/photos/${photo.id}` })])
  })

  it('is for owners only', async () => {
    const { ada } = await workshop()
    expect((await ada.get('/api/review')).status).toBe(401)
  })
})

describe('POST /api/review', () => {
  it('approves and holds back each item, and logs it on the order', async () => {
    const { team, owner, order, sewing, veiling, photo } = await workshop()

    const { status } = await owner.send('POST', '/api/review', {
      entries: [
        { id: sewing.id, status: 'approved' },
        { id: veiling.id, status: 'held_back' },
      ],
      photos: [{ id: photo.id, status: 'approved' }],
    })
    expect(status).toBe(200)
    expect((await getEntry(team.id, sewing.id))!.review_status).toBe('approved')
    expect((await getEntry(team.id, veiling.id))!.review_status).toBe('held_back')
    expect((await getPhoto(team.id, photo.id))!.review_status).toBe('approved')
    expect((await owner.get('/api/review')).body.orders).toEqual([])

    const reviewed = (await listActivity(team.id, order.id)).filter((row) => row.kind === 'reviewed')
    expect(reviewed.map((row) => JSON.parse(row.detail))).toEqual([{ approved: 2, heldBack: 1 }])
  })

  it('approves everything waiting on an order at once', async () => {
    const { team, owner, order, sewing, veiling, waiting, photo } = await workshop()

    expect((await owner.send('POST', '/api/review', { approveOrderId: order.id })).status).toBe(200)
    for (const entry of [sewing, veiling]) expect((await getEntry(team.id, entry.id))!.review_status).toBe('approved')
    expect((await getEntry(team.id, waiting.id))!.review_status).toBeNull()
    expect((await getPhoto(team.id, photo.id))!.review_status).toBe('approved')
  })

  it("refuses another atelier's items and changes nothing", async () => {
    const mine = await workshop()
    const theirs = await workshop()

    const { status } = await mine.owner.send('POST', '/api/review', {
      entries: [
        { id: mine.sewing.id, status: 'approved' },
        { id: theirs.sewing.id, status: 'approved' },
      ],
    })
    expect(status).toBe(404)
    expect((await getEntry(theirs.team.id, theirs.sewing.id))!.review_status).toBe('waiting')
    expect((await getEntry(mine.team.id, mine.sewing.id))!.review_status).toBe('waiting')
  })
})
