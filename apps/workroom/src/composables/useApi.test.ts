import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, onUnauthorized } from './useApi'
import { memberKey, setMemberKey } from './useMemberKey'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('api', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends her key as X-Member-Key', async () => {
    setMemberKey('fake-key')
    const fetch = vi.fn(async () => json({ ok: true }))
    vi.stubGlobal('fetch', fetch)
    await api('/me')
    const headers = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Headers
    expect(headers.get('X-Member-Key')).toBe('fake-key')
  })

  it('forgets a dead key and says so', async () => {
    setMemberKey('dead-key')
    const gone = vi.fn()
    onUnauthorized(gone)
    vi.stubGlobal('fetch', async () => json({ error: 'Ask your atelier for your link.' }, 401))

    await expect(api('/me')).rejects.toEqual(new ApiError(401, 'Ask your atelier for your link.'))
    expect(memberKey()).toBeNull()
    expect(gone).toHaveBeenCalledOnce()
  })
})
