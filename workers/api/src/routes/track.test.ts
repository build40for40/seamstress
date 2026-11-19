import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { listGarments } from '../db/garments'
import { call, createTestTeam } from '../test/actors'

async function tracked() {
  const atelier = await createTestTeam({ name: 'Needle Test Atelier', hourlyRatePence: 6000 })
  const ada = await atelier.addSeamstress('Ada Example')
  const order = await atelier.addOrder({
    description: 'Velvet evening coat',
    quote_pence: 10000,
    garments: [{ description: 'Coat with new cuffs', assignees: [ada] }],
  })
  const [garment] = await listGarments(atelier.team.id, [order.id])
  const entry = (status: string, minutes: number, note: string) =>
    env.DB.prepare(
      `INSERT INTO time_entries (id, team_id, member_id, garment_id, kind, date_local, minutes, note, review_status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'sewing', '2026-11-10', ?, ?, ?, ?, '2026-11-10T10:00:00Z', '2026-11-10T10:00:00Z')`,
    )
      .bind(crypto.randomUUID(), atelier.team.id, ada.member.id, garment!.id, minutes, note, status, ada.member.id)
      .run()
  const photo = (status: string, caption: string) =>
    env.DB.prepare(
      `INSERT INTO photos (id, team_id, garment_id, member_id, r2_key, caption, label, review_status, taken_on, created_at)
       VALUES (?, ?, ?, ?, 'teams/x/k.jpg', ?, 'progress', ?, '2026-11-10', '2026-11-10T10:00:00Z')`,
    )
      .bind(crypto.randomUUID(), atelier.team.id, garment!.id, ada.member.id, caption, status)
      .run()
  return { ...atelier, order, garment: garment!, entry, photo }
}

const page = async (token: string) => {
  const response = await call(`/track/${token}`)
  return { status: response.status, html: await response.text() }
}

describe('GET /track/:token', () => {
  it('shows the atelier, the order, the stage and a link to ask', async () => {
    const { order } = await tracked()
    const { status, html } = await page(order.tracking_token)

    expect(status).toBe(200)
    expect(html).toContain('Needle Test Atelier')
    expect(html).toContain(order.number)
    expect(html).toContain('Velvet evening coat')
    expect(html).toContain('Waiting its turn')
    expect(html).toContain('mailto:hello@40for40.app')
  })

  it("says it's booked in until work starts, then that it's under way", async () => {
    const { order, entry } = await tracked()
    const before = (await page(order.tracking_token)).html
    expect(before).toContain('Booked in and waiting its turn.')
    expect(before).not.toContain('Needle in hand')

    await entry('approved', 30, 'x')
    const after = (await page(order.tracking_token)).html
    expect(after).toContain('Needle in hand, as we speak.')
    expect(after).toContain('In the workroom')
  })

  it('never shows waiting or held-back work or photos', async () => {
    const { order, entry, photo } = await tracked()
    await entry('approved', 60, 'approved note')
    await entry('waiting', 37, 'waiting note')
    await entry('held_back', 41, 'held back note')
    await photo('approved', 'Approved cuff')
    await photo('waiting', 'Waiting sleeve')
    await photo('held_back', 'Held back sleeve')
    const { html } = await page(order.tracking_token)

    expect(html).toContain('1h, £60.00')
    expect(html).not.toContain('37m')
    expect(html).not.toContain('41m')
    expect(html).not.toContain('note')
    expect(html).toContain('Approved cuff')
    expect(html).not.toContain('Waiting sleeve')
    expect(html).not.toContain('Held back sleeve')
  })

  it('warns when the approved work has gone past the quote', async () => {
    const { order, entry } = await tracked()
    await entry('approved', 60, 'x')
    expect((await page(order.tracking_token)).html).not.toContain('gone past the quote')
    await entry('approved', 120, 'y')
    expect((await page(order.tracking_token)).html).toContain('gone past the quote')
  })

  it('shows the invoice total once it is sent, from the snapshot', async () => {
    const { order, team } = await tracked()
    const snapshot = { lines: [{ ref: 'SE-1-A', description: 'Coat', minutes: 120, pence: 12000 }], totalPence: 12345 }
    await env.DB.prepare(
      `INSERT INTO invoices (id, team_id, order_id, number, status, snapshot, sent_at, created_at)
       VALUES (?, ?, ?, 'INV-0001', 'sent', ?, '2026-11-12T09:00:00Z', '2026-11-12T09:00:00Z')`,
    )
      .bind(crypto.randomUUID(), team.id, order.id, JSON.stringify(snapshot))
      .run()
    const { html } = await page(order.tracking_token)

    expect(html).toContain('INV-0001')
    expect(html).toContain('£123.45')
  })

  it('answers 404 for an unknown link', async () => {
    const { status, html } = await page('nope')
    expect(status).toBe(404)
    expect(html).toContain('Ask your atelier for a fresh link')
  })
})
