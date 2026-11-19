import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { findActiveMemberByKey, findActiveMemberByWorkosUser } from './db/members'
import type { AppEnv } from './env'

const PRODUCTION_HOST = 'seamstress.build40for40.com'

const CLIENT_IDS = {
  production: 'client_01M6E5ZDQ9XBYYE28XYN7H3XTJ',
  staging: 'client_01M6E5ZDCH31RFHPJTD8N5JQZY',
}

export const MEMBER_KEY_HEADER = 'X-Member-Key'

export function workosClientId(hostname: string, override?: string) {
  if (override) return override
  return hostname === PRODUCTION_HOST ? CLIENT_IDS.production : CLIENT_IDS.staging
}

const keySets = new Map<string, JWTVerifyGetKey>()

export function workosKeys(clientId: string) {
  let keys = keySets.get(clientId)
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${clientId}`))
    keySets.set(clientId, keys)
  }
  return keys
}

export const workosIssuer = (clientId: string) => `https://api.workos.com/user_management/${clientId}`

export async function authenticate(request: Request, keys: JWTVerifyGetKey, issuer: string) {
  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1]
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, keys, { issuer })
    return payload.sub ?? null
  } catch {
    return null
  }
}

function signedInUser(request: Request, override?: string) {
  const clientId = workosClientId(new URL(request.url).hostname, override)
  return authenticate(request, workosKeys(clientId), workosIssuer(clientId))
}

const notSignedIn = () => new HTTPException(401, { message: 'Sign in first.' })

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const userId = await signedInUser(c.req.raw, c.env.WORKOS_CLIENT_ID)
  if (!userId) throw notSignedIn()
  c.set('userId', userId)
  await next()
})

export const requireOwner = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('via') === 'token' && c.get('member')?.role === 'owner') return next()
  const userId = await signedInUser(c.req.raw, c.env.WORKOS_CLIENT_ID)
  if (!userId) throw notSignedIn()
  const found = await findActiveMemberByWorkosUser(userId)
  if (!found || found.member.role !== 'owner') {
    throw new HTTPException(403, { message: 'Set up your atelier first.' })
  }
  c.set('userId', userId)
  c.set('member', found.member)
  c.set('team', found.team)
  c.set('via', 'token')
  await next()
})

export const requireMember = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header(MEMBER_KEY_HEADER)
  if (key) {
    const found = await findActiveMemberByKey(key)
    if (!found) throw new HTTPException(401, { message: 'Ask your atelier for your link.' })
    c.set('member', found.member)
    c.set('team', found.team)
    c.set('via', 'key')
    return next()
  }
  const userId = await signedInUser(c.req.raw, c.env.WORKOS_CLIENT_ID)
  const found = userId ? await findActiveMemberByWorkosUser(userId) : null
  if (!userId || !found) throw new HTTPException(401, { message: 'Ask your atelier for your link.' })
  c.set('userId', userId)
  c.set('member', found.member)
  c.set('team', found.team)
  c.set('via', 'token')
  await next()
})
