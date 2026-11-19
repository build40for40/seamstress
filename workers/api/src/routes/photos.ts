import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { MEMBER_KEY_HEADER, authenticate, workosClientId, workosIssuer, workosKeys } from '../auth'
import { getGarment, isAssigned } from '../db/garments'
import { findActiveMemberByKey, findActiveMemberByWorkosUser, type MemberWithTeam } from '../db/members'
import { findOrderByTrackingToken } from '../db/orders'
import { findPhoto } from '../db/photos'
import type { PhotoRow } from '../db/rows'
import type { AppEnv } from '../env'

const routes = new Hono<AppEnv>()

const notFound = () => new HTTPException(404, { message: "We couldn't find that photo." })

async function viewer(c: Context<AppEnv>) {
  const key = c.req.header(MEMBER_KEY_HEADER)
  if (key) return findActiveMemberByKey(key)
  const clientId = workosClientId(new URL(c.req.url).hostname, c.env.WORKOS_CLIENT_ID)
  const userId = await authenticate(c.req.raw, workosKeys(clientId), workosIssuer(clientId))
  return userId ? findActiveMemberByWorkosUser(userId) : null
}

async function trackingTokenAllows(photo: PhotoRow, token: string) {
  if (photo.review_status !== 'approved') return false
  const order = await findOrderByTrackingToken(token)
  if (!order || order.team_id !== photo.team_id) return false
  const garment = await getGarment(photo.team_id, photo.garment_id)
  return garment?.order_id === order.id
}

async function memberAllows({ member, team }: MemberWithTeam, photo: PhotoRow) {
  if (team.id !== photo.team_id) return false
  return member.role === 'owner' || isAssigned(team.id, photo.garment_id, member.id)
}

routes.get('/:id', async (c) => {
  const token = c.req.query('t')
  const found = token ? null : await viewer(c)
  if (!token && !found) throw new HTTPException(401, { message: 'Sign in or open your link first.' })
  const photo = await findPhoto(c.req.param('id'))
  if (!photo) throw notFound()
  const allowed = token ? await trackingTokenAllows(photo, token) : await memberAllows(found!, photo)
  if (!allowed) throw notFound()

  const object = await c.env.PHOTOS.get(photo.r2_key)
  if (!object) throw notFound()
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
      ETag: object.httpEtag,
    },
  })
})

export default routes
