import { describe, expect, it } from 'vitest'
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

  it('needs a valid sign-in and a sane body', async () => {
    expect((await call('/api/session')).status).toBe(401)
    const user = await signedInUser()
    const bad = await user.send('POST', '/api/teams', { ...atelier, replyToEmail: 'nope' })
    expect(bad).toEqual({ status: 400, body: { error: 'That email looks off' } })
  })
})
