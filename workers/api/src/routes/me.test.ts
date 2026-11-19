import { LOCK_MESSAGES, localDate } from '@seamstress/shared'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { getGarment, listGarments } from '../db/garments'
import { createPhoto } from '../db/photos'
import { createEntry, getEntry, listEntries } from '../db/time-entries'
import { reopenTimesheet } from '../db/timesheets'
import { createTestTeam } from '../test/actors'

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

const backdateTimer = (entryId: string, startedAt: string) =>
  env.DB.prepare('UPDATE time_entries SET started_at = ? WHERE id = ?').bind(startedAt, entryId).run()

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9])

async function workshop() {
  const atelier = await createTestTeam({ name: 'Needle Test Atelier' })
  const ada = await atelier.addSeamstress('Ada Example')
  const bea = await atelier.addSeamstress('Bea Example')
  const shared = await atelier.addOrder({
    client: { name: 'Clara Client', phone: null, email: null, notes: 'Hates pins' },
    description: 'Wedding party alterations',
    due_date: '2099-12-01',
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
      dueFlag: null,
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

describe('the timer', () => {
  it('starts on a garment, moves a todo garment along and shows on /api/me', async () => {
    const { ada, gown, shared } = await workshop()

    const started = await ada.send('POST', '/api/me/timer', { garmentId: gown.id })
    expect(started.status).toBe(201)
    expect(started.body).toMatchObject({ stopped: null, discarded: false })
    expect(started.body.timer).toMatchObject({
      garmentId: gown.id,
      garmentRef: `${shared.number}-A`,
      kind: 'sewing',
      minutes: null,
      endedAt: null,
      reviewStatus: 'waiting',
      needsCheck: false,
    })
    expect((await getGarment(gown.team_id, gown.id))!.status).toBe('in_progress')

    const me = await ada.get('/api/me')
    expect(me.body.timer.id).toBe(started.body.timer.id)
  })

  it('stamps the date in her own time zone when it starts', async () => {
    const atelier = await createTestTeam()
    const kiri = await atelier.addSeamstress('Kiri Example', { timeZone: 'Pacific/Kiritimati' })

    const { body } = await kiri.send('POST', '/api/me/timer', { garmentId: null })
    expect(body.timer).toMatchObject({ kind: 'waiting', garmentId: null, reviewStatus: null })
    expect(body.timer.dateLocal).toBe(localDate(new Date(), 'Pacific/Kiritimati'))
  })

  it('runs one at a time: starting another stops and saves the first', async () => {
    const { ada, gown } = await workshop()
    const first = await ada.send('POST', '/api/me/timer', { garmentId: gown.id })
    await backdateTimer(first.body.timer.id, minutesAgo(30))

    const second = await ada.send('POST', '/api/me/timer', { garmentId: null })
    expect(second.status).toBe(201)
    expect(second.body.stopped).toMatchObject({ id: first.body.timer.id, minutes: 30, garmentRef: gown.ref })
    expect(second.body.timer).toMatchObject({ garmentId: null, kind: 'waiting' })

    const running = (await listEntries(gown.team_id, { memberId: ada.member.id })).filter((entry) => entry.started_at && !entry.ended_at)
    expect(running.map((entry) => entry.id)).toEqual([second.body.timer.id])
  })

  it('throws away a timer stopped within a minute and says so', async () => {
    const { ada, gown } = await workshop()
    const started = await ada.send('POST', '/api/me/timer', { garmentId: gown.id })

    const stopped = await ada.send('POST', '/api/me/timer/stop', {})
    expect(stopped.status).toBe(200)
    expect(stopped.body).toEqual({ entry: null, discarded: true, message: "Under a minute, so we didn't keep it." })
    expect(await getEntry(gown.team_id, started.body.timer.id)).toBeNull()
    expect((await ada.get('/api/me')).body.timer).toBeNull()
  })

  it('stops at a time she picks, and refuses times outside the run', async () => {
    const { ada, gown } = await workshop()
    const started = await ada.send('POST', '/api/me/timer', { garmentId: gown.id })
    const startedAt = new Date(Date.now() - 10 * 60 * 60_000)
    startedAt.setUTCMilliseconds(0)
    await backdateTimer(started.body.timer.id, startedAt.toISOString())

    expect((await ada.get('/api/me')).body.timer.needsCheck).toBe(true)
    expect((await ada.send('POST', '/api/me/timer/stop', { endedAt: new Date(Date.now() + 60_000).toISOString() })).status).toBe(400)
    expect((await ada.send('POST', '/api/me/timer/stop', { endedAt: new Date(startedAt.getTime() - 60_000).toISOString() })).status).toBe(400)

    const endedAt = new Date(startedAt.getTime() + 85 * 60_000).toISOString()
    const stopped = await ada.send('POST', '/api/me/timer/stop', { endedAt })
    expect(stopped.status).toBe(200)
    expect(stopped.body.entry).toMatchObject({ minutes: 85, endedAt, garmentRef: gown.ref })
    expect((await ada.send('POST', '/api/me/timer/stop', {})).status).toBe(404)
  })

  it('switches the running kind, and refuses a garment that is not hers', async () => {
    const { ada, gown, dress } = await workshop()
    expect((await ada.send('POST', '/api/me/timer', { garmentId: dress.id })).status).toBe(404)

    await ada.send('POST', '/api/me/timer', { garmentId: gown.id })
    const switched = await ada.send('PATCH', '/api/me/timer', { kind: 'fitting' })
    expect(switched.status).toBe(200)
    expect(switched.body.timer.kind).toBe('fitting')
  })
})

describe('her entries and locking', () => {
  it('adds typed time, and an edit sends approved time back for review', async () => {
    const { ada, gown } = await workshop()
    const created = await ada.send('POST', '/api/me/entries', {
      garmentId: gown.id,
      kind: 'tidying',
      dateLocal: '2026-11-02',
      minutes: 45,
    })
    expect(created.status).toBe(201)
    expect(created.body.entry).toMatchObject({ minutes: 45, reviewStatus: 'waiting', locked: false, garmentRef: gown.ref })

    await env.DB.prepare("UPDATE time_entries SET review_status = 'approved' WHERE id = ?").bind(created.body.entry.id).run()
    const edited = await ada.send('PATCH', `/api/me/entries/${created.body.entry.id}`, { minutes: 60 })
    expect(edited.status).toBe(200)
    expect(edited.body.entry).toMatchObject({ minutes: 60, reviewStatus: 'waiting' })

    expect((await ada.send('PATCH', `/api/me/entries/${created.body.entry.id}`, { kind: 'waiting' })).status).toBe(400)
  })

  it("can't touch someone else's entry", async () => {
    const { team, ada, bea } = await workshop()
    const [beas] = await listEntries(team.id, { memberId: bea.member.id })

    expect((await ada.send('PATCH', `/api/me/entries/${beas!.id}`, { minutes: 1 })).status).toBe(404)
    expect((await ada.send('DELETE', `/api/me/entries/${beas!.id}`)).status).toBe(404)
  })

  it('refuses changes to an entry on a sent invoice', async () => {
    const { team, ada, shared } = await workshop()
    const [entry] = await listEntries(team.id, { memberId: ada.member.id })
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO invoices (id, team_id, order_id, number, status, created_at) VALUES ('inv_test', ?, ?, 'INV-0001', 'sent', ?)",
      ).bind(team.id, shared.id, new Date().toISOString()),
      env.DB.prepare("UPDATE time_entries SET invoice_id = 'inv_test' WHERE id = ?").bind(entry!.id),
    ])

    const edit = await ada.send('PATCH', `/api/me/entries/${entry!.id}`, { minutes: 5 })
    expect(edit).toEqual({ status: 409, body: { error: LOCK_MESSAGES.invoice } })
    expect((await ada.send('DELETE', `/api/me/entries/${entry!.id}`)).status).toBe(409)
    expect((await getEntry(team.id, entry!.id))!.minutes).toBe(90)
  })

  it('locks a month once she sends its timesheet, until it is reopened', async () => {
    const { team, owner, ada, gown } = await workshop()
    const october = await createEntry(team.id, {
      member_id: ada.member.id,
      garment_id: gown.id,
      kind: 'sewing',
      date_local: '2026-10-30',
      minutes: 30,
      created_by: ada.member.id,
    })
    const [november] = await listEntries(team.id, { memberId: ada.member.id, from: '2026-11-01' })

    const sent = await ada.send('POST', '/api/me/timesheet/2026-10/send')
    expect(sent.status).toBe(200)
    expect(sent.body.timesheet).toMatchObject({ month: '2026-10', totalMinutes: 30, sentAt: expect.any(String) })

    const locked = { status: 409, body: { error: LOCK_MESSAGES.timesheet } }
    expect(await ada.send('PATCH', `/api/me/entries/${october!.id}`, { minutes: 40 })).toEqual(locked)
    expect(await ada.send('DELETE', `/api/me/entries/${october!.id}`)).toEqual(locked)
    expect(await ada.send('PATCH', `/api/me/entries/${november!.id}`, { dateLocal: '2026-10-29' })).toEqual(locked)
    expect(
      await ada.send('POST', '/api/me/entries', { garmentId: null, kind: 'waiting', dateLocal: '2026-10-12', minutes: 20 }),
    ).toEqual(locked)
    expect((await ada.get(`/api/me/garments/${gown.id}`)).body.entries).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: october!.id, locked: true })]),
    )

    await reopenTimesheet(team.id, ada.member.id, '2026-10', owner.member.id)
    expect((await ada.send('PATCH', `/api/me/entries/${october!.id}`, { minutes: 40 })).status).toBe(200)
  })
})

describe('her garments, photos and timesheet', () => {
  it('moves a garment through its stages and drops a finished order from her list', async () => {
    const { ada, gown } = await workshop()
    const move = (status: string) => ada.send('PATCH', `/api/me/garments/${gown.id}/status`, { status })

    expect((await move('fitting')).body.garment.status).toBe('fitting')
    expect((await move('in_progress')).body.garment.status).toBe('in_progress')
    expect((await move('done')).body.garment.status).toBe('done')
    expect((await move('in_progress')).status).toBe(409)
    expect((await ada.get('/api/me/orders')).body.orders).toEqual([])
  })

  it('stores an uploaded JPEG in R2 under the team, waiting for review', async () => {
    const { team, ada, gown, dress } = await workshop()
    const upload = (garmentId: string, body: BodyInit, type = 'image/jpeg') =>
      ada.fetch(`/api/me/garments/${garmentId}/photos?caption=Hem%20pinned&label=progress`, {
        method: 'POST',
        headers: { 'Content-Type': type },
        body,
      })

    const response = await upload(gown.id, JPEG)
    expect(response.status).toBe(201)
    const { photo } = (await response.json()) as any
    expect(photo).toMatchObject({ caption: 'Hem pinned', label: 'progress', reviewStatus: 'waiting', mine: true, url: `/photos/${photo.id}` })

    const row = await env.DB.prepare('SELECT r2_key FROM photos WHERE id = ?').bind(photo.id).first<{ r2_key: string }>()
    expect(row!.r2_key).toMatch(new RegExp(`^teams/${team.id}/\\d+-${photo.id}\\.jpg$`))
    expect(new Uint8Array(await (await env.PHOTOS.get(row!.r2_key))!.arrayBuffer())).toEqual(JPEG)

    expect((await upload(gown.id, 'not a photo', 'text/plain')).status).toBe(415)
    expect((await upload(gown.id, new Uint8Array([1, 2, 3]))).status).toBe(400)
    expect((await upload(dress.id, JPEG)).status).toBe(404)
  })

  it('adds up her month with general time on its own line, and hides pay when the atelier says so', async () => {
    const { team, ada, gown } = await workshop()
    await ada.send('POST', '/api/me/entries', { garmentId: null, kind: 'waiting', dateLocal: '2026-11-18', minutes: 30 })

    const { body } = await ada.get('/api/me/timesheet?month=2026-11')
    expect(body.timesheet).toMatchObject({
      month: '2026-11',
      billableMinutes: 90,
      generalMinutes: 30,
      totalMinutes: 120,
      ratePence: 1800,
      payPence: 3600,
      sentAt: null,
      byOrder: [{ orderId: gown.order_id, number: gown.ref.slice(0, -2), minutes: 90 }],
    })

    await env.DB.prepare('UPDATE teams SET show_pay_estimate = 0 WHERE id = ?').bind(team.id).run()
    const hidden = await ada.get('/api/me/timesheet?month=2026-11')
    expect(hidden.body.timesheet).toMatchObject({ payPence: null, ratePence: null, totalMinutes: 120 })
  })

  it("won't send a timesheet while a timer is running in that month", async () => {
    const { ada, gown } = await workshop()
    await ada.send('POST', '/api/me/timer', { garmentId: gown.id })
    const month = localDate(new Date(), 'Europe/London').slice(0, 7)

    expect((await ada.send('POST', `/api/me/timesheet/${month}/send`)).status).toBe(409)
    expect((await ada.send('POST', '/api/me/timesheet/2999-01/send')).status).toBe(400)
  })

  it('approves time and photos the owner logs herself', async () => {
    const atelier = await createTestTeam()
    const order = await atelier.addOrder({ garments: [{ description: 'Cuffs', assignees: [atelier.owner] }] })
    const [cuffs] = await listGarments(atelier.team.id, [order.id])

    const { body } = await atelier.owner.send('POST', '/api/me/timer', { garmentId: cuffs!.id })
    expect(body.timer.reviewStatus).toBe('approved')
  })
})
