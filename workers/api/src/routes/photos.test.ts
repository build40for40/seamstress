import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { listGarments } from '../db/garments'
import { call, createTestTeam, signedInUser } from '../test/actors'

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9])

async function photographed() {
  const atelier = await createTestTeam()
  const ada = await atelier.addSeamstress('Ada Example')
  const bea = await atelier.addSeamstress('Bea Example')
  const order = await atelier.addOrder({ garments: [{ description: 'Gown', assignees: [ada] }] })
  const otherOrder = await atelier.addOrder({ garments: [{ description: 'Coat', assignees: [bea] }] })
  const [gown] = await listGarments(atelier.team.id, [order.id])
  const response = await ada.fetch(`/api/me/garments/${gown!.id}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: JPEG,
  })
  const { photo } = (await response.json()) as { photo: { id: string; url: string } }
  return { ...atelier, ada, bea, order, otherOrder, photo }
}

const approve = (photoId: string) =>
  env.DB.prepare("UPDATE photos SET review_status = 'approved' WHERE id = ?").bind(photoId).run()

describe('GET /photos/:id', () => {
  it('serves the image to the owner and the assigned seamstress', async () => {
    const { owner, ada, photo } = await photographed()

    for (const viewer of [owner, ada]) {
      const response = await viewer.fetch(photo.url)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/jpeg')
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(JPEG)
    }
  })

  it("hides it from a seamstress who isn't on the garment and from another atelier", async () => {
    const { bea, photo } = await photographed()
    const other = await createTestTeam()
    const stranger = await signedInUser()

    expect((await bea.fetch(photo.url)).status).toBe(404)
    expect((await other.owner.fetch(photo.url)).status).toBe(404)
    expect((await stranger.fetch(photo.url)).status).toBe(401)
    expect((await call(photo.url)).status).toBe(401)
  })

  it("shows the client only approved photos on their own order's link", async () => {
    const { order, otherOrder, photo } = await photographed()
    const withToken = (token: string) => call(`${photo.url}?t=${token}`)

    expect((await withToken(order.tracking_token)).status).toBe(404)
    await approve(photo.id)
    expect((await withToken(order.tracking_token)).status).toBe(200)
    expect((await withToken(otherOrder.tracking_token)).status).toBe(404)
    expect((await withToken('not-a-token')).status).toBe(404)
  })
})
