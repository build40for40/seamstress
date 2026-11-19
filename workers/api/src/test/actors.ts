import { env, exports } from 'cloudflare:workers'
import { importJWK, SignJWT } from 'jose'
import { MEMBER_KEY_HEADER, workosIssuer } from '../auth'
import { createMember, getMember, type NewMember } from '../db/members'
import { createOrder, type NewOrder } from '../db/orders'
import type { MemberRow, OrderRow, TeamRow } from '../db/rows'
import { createTeamWithOwner, getTeam } from '../db/teams'

export const ORIGIN = 'https://seamstress.build40for40.com'

export const call = (path: string, init?: RequestInit) => exports.default.fetch(new Request(`${ORIGIN}${path}`, init))

export async function readJson<T = any>(response: Response) {
  return { status: response.status, body: (await response.json()) as T }
}

const privateKey = importJWK(env.TEST_WORKOS_PRIVATE_JWK, 'RS256')

export async function ownerToken(userId: string, { issuer = workosIssuer(env.WORKOS_CLIENT_ID), expiresIn = '5m' } = {}) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setSubject(userId)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(await privateKey)
}

export type Client = {
  headers: Record<string, string>
  fetch: (path: string, init?: RequestInit) => Promise<Response>
  get: <T = any>(path: string) => Promise<{ status: number; body: T }>
  send: <T = any>(method: string, path: string, json?: unknown) => Promise<{ status: number; body: T }>
}

export function client(headers: Record<string, string>): Client {
  const fetch = (path: string, init: RequestInit = {}) =>
    call(path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } })
  return {
    headers,
    fetch,
    get: (path) => fetch(path).then(readJson),
    send: (method, path, json) =>
      fetch(path, {
        method,
        headers: json === undefined ? {} : { 'Content-Type': 'application/json' },
        body: json === undefined ? undefined : JSON.stringify(json),
      }).then(readJson),
  }
}

export type Actor = Client & { member: MemberRow; team: TeamRow }

const uniqueId = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`

export async function signedInUser(userId = uniqueId('user_test')) {
  return { userId, ...client({ Authorization: `Bearer ${await ownerToken(userId)}` }) }
}

export async function memberWithKey(teamId: string, memberId: string, key: string): Promise<Actor> {
  const [member, team] = await Promise.all([getMember(teamId, memberId), getTeam(teamId)])
  return { member: member!, team: team!, ...client({ [MEMBER_KEY_HEADER]: key }) }
}

export type TestTeam = {
  team: TeamRow
  owner: Actor
  addSeamstress: (name?: string, options?: Partial<NewMember>) => Promise<Actor & { key: string }>
  addOrder: (order?: TestOrder) => Promise<OrderRow>
}

export type TestOrder = Partial<Omit<NewOrder, 'garments'>> & {
  garments?: { description: string; assignees?: { member: MemberRow }[] }[]
}

export async function createTestTeam({ name = 'Fake Atelier', hourlyRatePence = 6000 } = {}): Promise<TestTeam> {
  const owner = await signedInUser()
  const { teamId, memberId } = await createTeamWithOwner(
    { name, reply_to_email: 'hello@40for40.app', hourly_rate_pence: hourlyRatePence },
    { name: 'Olive Owner', workosUserId: owner.userId },
  )
  const [team, member] = await Promise.all([getTeam(teamId), getMember(teamId, memberId)])

  return {
    team: team!,
    owner: { ...owner, member: member!, team: team! },
    async addSeamstress(seamstressName = 'Sam Seamstress', options = {}) {
      const { id, key } = await createMember(teamId, {
        name: seamstressName,
        timeZone: 'Europe/London',
        ratePence: 1800,
        effectiveFrom: '2026-01-01',
        ...options,
      })
      return { ...(await memberWithKey(teamId, id, key)), key }
    },
    async addOrder(order = {}) {
      const created = await createOrder(
        teamId,
        {
          client: order.client ?? { name: 'Fake Client' },
          description: order.description ?? 'Fake order',
          quote_pence: order.quote_pence ?? 10000,
          due_date: order.due_date ?? '2026-12-01',
          express: order.express ?? false,
          garments: (order.garments ?? [{ description: 'Fake garment' }]).map((garment) => ({
            description: garment.description,
            assigneeIds: garment.assignees?.map((assignee) => assignee.member.id),
          })),
        },
        memberId,
      )
      if (!created) throw new Error('createOrder refused the test order')
      return created
    },
  }
}
