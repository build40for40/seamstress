import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { workosClientId, workosIssuer } from './auth'
import { hashKey, issueMemberKey, removeMember } from './db/members'
import { call, client, createTestTeam, ownerToken, signedInUser } from './test/actors'

describe('workosClientId', () => {
  it('uses production on the live host, staging elsewhere, and an override when set', () => {
    expect(workosClientId('seamstress.build40for40.com')).toBe('client_01M6E5ZDQ9XBYYE28XYN7H3XTJ')
    expect(workosClientId('seamstress-pr-3.build40for40.workers.dev')).toBe('client_01M6E5ZDCH31RFHPJTD8N5JQZY')
    expect(workosClientId('seamstress.build40for40.com', 'client_override')).toBe('client_override')
  })
})

describe('requireOwner', () => {
  it('lets an owner in with a valid token', async () => {
    const { owner, team } = await createTestTeam()
    const { status, body } = await owner.get('/api/clients')
    expect(status).toBe(200)
    expect(body).toEqual({ clients: [] })
    expect(team.id).toBe(owner.member.team_id)
  })

  it('turns away missing, foreign and expired tokens', async () => {
    const { owner } = await createTestTeam()
    const userId = owner.member.workos_user_id!
    const foreign = await ownerToken(userId, { issuer: workosIssuer('client_other') })
    const expired = await ownerToken(userId, { expiresIn: '1 minute ago' })

    expect((await call('/api/clients')).status).toBe(401)
    expect((await client({ Authorization: `Bearer ${foreign}` }).get('/api/clients')).status).toBe(401)
    expect((await client({ Authorization: `Bearer ${expired}` }).get('/api/clients')).status).toBe(401)
  })

  it('sends a signed-in user with no atelier to set one up', async () => {
    const user = await signedInUser()
    const { status, body } = await user.get('/api/clients')
    expect(status).toBe(403)
    expect(body.error).toMatch(/set up your atelier/i)
  })

  it('refuses a seamstress key on owner routes', async () => {
    const { addSeamstress } = await createTestTeam()
    const ada = await addSeamstress('Ada Example')
    expect((await ada.get('/api/clients')).status).toBe(401)
  })
})

describe('requireMember', () => {
  it('accepts a seamstress key and an owner token', async () => {
    const { owner, addSeamstress } = await createTestTeam()
    const ada = await addSeamstress('Ada Example')

    const asAda = await ada.get('/api/me')
    expect(asAda.status).toBe(200)
    expect(asAda.body).toMatchObject({ id: ada.member.id, name: 'Ada Example', role: 'seamstress', timer: null })

    const asOwner = await owner.get('/api/me')
    expect(asOwner.status).toBe(200)
    expect(asOwner.body).toMatchObject({ id: owner.member.id, role: 'owner' })
  })

  it('stores only the hash of a key', async () => {
    const { addSeamstress } = await createTestTeam()
    const ada = await addSeamstress()
    const row = await env.DB.prepare('SELECT key_hash FROM members WHERE id = ?').bind(ada.member.id).first<{ key_hash: string }>()
    expect(row?.key_hash).toBe(await hashKey(ada.key))
    expect(row?.key_hash).not.toContain(ada.key)
  })

  it('turns away unknown, replaced and removed keys', async () => {
    const { team, addSeamstress } = await createTestTeam()
    const ada = await addSeamstress()
    const bea = await addSeamstress('Bea Example')

    expect((await client({ 'X-Member-Key': 'not-a-key' }).get('/api/me')).status).toBe(401)

    const newKey = await issueMemberKey(team.id, ada.member.id)
    expect((await ada.get('/api/me')).status).toBe(401)
    expect((await client({ 'X-Member-Key': newKey! }).get('/api/me')).status).toBe(200)

    await removeMember(team.id, bea.member.id)
    const removed = await bea.get('/api/me')
    expect(removed.status).toBe(401)
    expect(removed.body.error).toMatch(/ask your atelier/i)
  })
})
