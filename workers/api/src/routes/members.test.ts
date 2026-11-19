import { describe, expect, it } from 'vitest'
import { client, createTestTeam } from '../test/actors'

const keyOf = (link: string) => link.split('#/k/')[1]!

describe('team members', () => {
  it('adds a seamstress with a working link, and a new link ends the old one', async () => {
    const { owner } = await createTestTeam()

    const created = await owner.send('POST', '/api/members', { name: 'Ada Example', timeZone: 'Europe/Paris', payRatePence: 1900 })
    expect(created.status).toBe(201)
    expect(created.body.member).toMatchObject({ name: 'Ada Example', role: 'seamstress', payRatePence: 1900, hasLink: true })
    expect(created.body.link).toMatch(/^https:\/\/seamless\.build40for40\.com\/workroom\/#\/k\/\S+$/)
    expect(JSON.stringify(created.body.member)).not.toContain('key')

    const first = client({ 'X-Member-Key': keyOf(created.body.link) })
    expect((await first.get('/api/me')).status).toBe(200)

    const renewed = await owner.send('POST', `/api/members/${created.body.member.id}/link`)
    expect((await first.get('/api/me')).status).toBe(401)
    expect((await client({ 'X-Member-Key': keyOf(renewed.body.link) }).get('/api/me')).status).toBe(200)
  })

  it('keeps pay rate history and removes a member, but never the owner herself', async () => {
    const { owner, addSeamstress } = await createTestTeam()
    const ada = await addSeamstress('Ada Example')

    const raised = await owner.send('POST', `/api/members/${ada.member.id}/pay-rates`, { ratePence: 2200, effectiveFrom: '2026-11-01' })
    expect(raised.body.member.payRates.map((rate: { ratePence: number }) => rate.ratePence)).toEqual([1800, 2200])

    expect((await owner.send('DELETE', `/api/members/${owner.member.id}`)).status).toBe(409)
    expect((await owner.fetch(`/api/members/${ada.member.id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await ada.get('/api/me')).status).toBe(401)
    const { body } = await owner.get('/api/members')
    expect(body.members.map((member: { name: string }) => member.name)).toEqual(['Olive Owner'])
  })
})
