import { env } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'
import { call, signedInUser } from '../test/actors'

const atelier = { name: 'Fake Stitch Studio', replyToEmail: 'hello@40for40.app', hourlyRatePence: 5500 }

describe('setting up an atelier', () => {
  it('takes a signed-in user with no team through setup and makes her the owner', async () => {
    const user = await signedInUser()
    expect((await user.get('/api/session')).body).toEqual({ member: null, team: null, counts: null })
    expect((await user.get('/api/orders')).status).toBe(403)

    const created = await user.send('POST', '/api/teams', atelier)
    expect(created.status).toBe(201)
    expect(created.body.team).toMatchObject({ ...atelier, autoEmailClients: true, showPayEstimate: true })
    expect(created.body.member).toMatchObject({ role: 'owner', workosUserId: user.userId })

    const session = await user.get('/api/session')
    expect(session.body.team.name).toBe('Fake Stitch Studio')
    expect(session.body.counts).toEqual({ waitingReviews: 0, sentTimesheets: 0, readyToCollect: 0 })
    expect((await user.get('/api/orders')).body).toEqual({ orders: [] })

    expect((await user.send('POST', '/api/teams', atelier)).status).toBe(409)
  })

  it('updates the atelier settings', async () => {
    const user = await signedInUser()
    await user.send('POST', '/api/teams', atelier)

    const { status, body } = await user.send('PATCH', '/api/team', { autoEmailClients: false, hourlyRatePence: 6500 })
    expect(status).toBe(200)
    expect(body.team).toMatchObject({ autoEmailClients: false, showPayEstimate: true, hourlyRatePence: 6500 })
  })

  it('saves tidied bank details, logs the change and tells the old reply-to address', async () => {
    const user = await signedInUser()
    const { body: created } = await user.send('POST', '/api/teams', atelier)
    const sent: { To: string; TemplateAlias: string; TemplateModel: Record<string, unknown> }[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!new Request(input).url.startsWith('https://api.postmarkapp.com/')) return realFetch(input, init)
      sent.push(JSON.parse(String(init?.body)))
      return Response.json({})
    }) as typeof fetch
    try {
      const { status, body } = await user.send('PATCH', '/api/team', {
        replyToEmail: 'new@example.com',
        businessAddress: '1 Fake Street\nLondon',
        bankSortCode: '000000',
        bankAccountNumber: '0000 1234',
      })
      expect(status).toBe(200)
      expect(body.team).toMatchObject({ businessAddress: '1 Fake Street\nLondon', bankSortCode: '00-00-00', bankAccountNumber: '00001234' })
      expect((await user.send('PATCH', '/api/team', { bankSortCode: '12' })).body).toEqual({ error: 'A sort code is 6 digits' })
      await user.send('PATCH', '/api/team', { businessAddress: '2 Fake Street' })
      await vi.waitFor(() => expect(sent).toHaveLength(1))
    } finally {
      globalThis.fetch = realFetch
    }

    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      To: atelier.replyToEmail,
      TemplateAlias: 'seamless-bank-details-changed',
      TemplateModel: { accountEnding: '1234' },
    })
    const logged = await env.DB.prepare("SELECT detail FROM activity WHERE team_id = ? AND kind = 'bank_details_changed'")
      .bind(created.team.id)
      .all<{ detail: string }>()
    expect(logged.results.map((row) => JSON.parse(row.detail))).toEqual([{ fields: ['bankSortCode', 'bankAccountNumber'] }])
  })

  it('needs a valid sign-in and a sane body', async () => {
    expect((await call('/api/session')).status).toBe(401)
    const user = await signedInUser()
    const bad = await user.send('POST', '/api/teams', { ...atelier, replyToEmail: 'nope' })
    expect(bad).toEqual({ status: 400, body: { error: 'That email looks off' } })
  })
})
