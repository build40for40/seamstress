import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024

const tooBig = () => new HTTPException(413, { message: "That photo's too big. Try a smaller one." })

export async function readJpeg(c: Context): Promise<ArrayBuffer> {
  const type = c.req.header('Content-Type') ?? ''
  if (!type.startsWith('image/jpeg')) throw new HTTPException(415, { message: 'Send the photo as a JPEG.' })
  if (Number(c.req.header('Content-Length') ?? 0) > MAX_PHOTO_BYTES) throw tooBig()

  const body = await c.req.arrayBuffer()
  if (body.byteLength > MAX_PHOTO_BYTES) throw tooBig()
  const bytes = new Uint8Array(body, 0, Math.min(3, body.byteLength))
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new HTTPException(400, { message: "That doesn't look like a photo. Try again?" })
  }
  return body
}
