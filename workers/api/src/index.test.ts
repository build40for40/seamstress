import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

const call = (path: string, init?: RequestInit) =>
  exports.default.fetch(`https://seamstress.build40for40.com${path}`, init)

describe('worker', () => {
  it('says it is up on /api/health', async () => {
    const response = await call('/api/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('answers unknown API paths with a JSON 404', async () => {
    const response = await call('/api/nope')
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found' })
  })

  it('renders a 404 page for an unknown tracking token', async () => {
    const response = await call('/track/not-a-token')
    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).toContain('text/html')
  })
})
