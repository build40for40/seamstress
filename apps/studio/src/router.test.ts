import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from './api-types'

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }))
const server = vi.hoisted(() => ({ session: null as Session | null }))

vi.mock('./composables/useAuth', () => ({
  currentUser: async () => auth.user,
  getAccessToken: async () => (auth.user ? 'token' : null),
  signOut: async () => {},
}))

vi.mock('./composables/useApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./composables/useApi')>()),
  api: async (path: string) => {
    if (path === '/session') return server.session
    if (path.startsWith('/orders')) return { orders: [] }
    throw new Error(`unexpected ${path}`)
  },
}))

const { router } = await import('./router')
const { clearSession } = await import('./composables/useSession')

const team = { id: 'team_fake', name: 'Fake Atelier' } as Session['team']
const member = { id: 'member_fake', role: 'owner' } as Session['member']

describe('studio router', () => {
  beforeEach(async () => {
    clearSession()
    auth.user = null
    server.session = { member: null, team: null, counts: null }
    await router.push('/signin')
  })

  it('sends anyone signed out to sign in, remembering where they were going', async () => {
    await router.push('/review')
    expect(router.currentRoute.value.name).toBe('signin')
    expect(router.currentRoute.value.query.next).toBe('/review')
  })

  it('sends a signed-in owner with no atelier to set up', async () => {
    auth.user = { id: 'user_fake' }
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('setup')
  })

  it('lets an owner with an atelier in, and keeps her out of set up', async () => {
    auth.user = { id: 'user_fake' }
    server.session = { member, team, counts: { waitingReviews: 0, sentTimesheets: 0, readyToCollect: 0 } }
    await router.push('/setup')
    expect(router.currentRoute.value.name).toBe('home')
    await router.push('/review')
    expect(router.currentRoute.value.name).toBe('review')
  })
})
