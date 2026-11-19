import { describe, expect, it } from 'vitest'
import { createClient } from '../db/clients'
import { createTestTeam } from '../test/actors'

describe('GET /api/clients', () => {
  it("lists only the atelier's own clients", async () => {
    const first = await createTestTeam()
    const second = await createTestTeam()
    await createClient(first.team.id, { name: 'First Client' })
    await createClient(second.team.id, { name: 'Second Client' })

    const { body } = await first.owner.get('/api/clients')
    expect(body.clients.map((client: { name: string }) => client.name)).toEqual(['First Client'])
  })
})
