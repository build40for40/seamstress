import { env } from 'cloudflare:workers'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { listActivity } from './db/activity'
import { sendEmail, templateModel } from './email'
import { createTestTeam } from './test/actors'

const realFetch = globalThis.fetch

function stubPostmark(respond: () => Response | Promise<Response>) {
  const calls: { url: string; body: any; token: string | null }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new Request(input).url
    if (!url.startsWith('https://api.postmarkapp.com/')) return realFetch(input, init)
    calls.push({ url, body: JSON.parse(String(init?.body)), token: new Headers(init?.headers).get('X-Postmark-Server-Token') })
    return respond()
  }) as typeof fetch
  return calls
}

afterEach(() => {
  globalThis.fetch = realFetch
})

const activityOf = (teamId: string, orderId: string) => listActivity(teamId, orderId).then((rows) => rows.filter((row) => row.kind === 'email'))

async function send(respond: () => Response | Promise<Response>) {
  const calls = stubPostmark(respond)
  const { team, addOrder } = await createTestTeam({ name: 'Needle Test Atelier' })
  const order = await addOrder()
  const pending: Promise<unknown>[] = []
  sendEmail(env, { waitUntil: (promise) => void pending.push(promise) }, 'seamstress-order-ready', {
    team,
    to: 'hello@40for40.app',
    orderId: order.id,
    model: { client_name: 'Fake Client', order_number: order.number, trackingUrl: 'https://example.test/track/x' },
  })
  await Promise.all(pending)
  return { calls, team, order }
}

describe('sendEmail', () => {
  it('posts the template to Postmark and logs it on the order', async () => {
    const { calls, team, order } = await send(() => Response.json({ ErrorCode: 0 }))

    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe('https://api.postmarkapp.com/email/withTemplate')
    expect(calls[0]!.token).toBe('fake-postmark-token')
    expect(calls[0]!.body).toMatchObject({
      From: '"Needle Test Atelier via Seamless" <noreply@build40for40.com>',
      To: 'hello@40for40.app',
      ReplyTo: 'hello@40for40.app',
      TemplateAlias: 'seamstress-order-ready',
      MessageStream: 'outbound',
      TemplateModel: { atelierName: 'Needle Test Atelier', clientName: 'Fake Client', orderNumber: order.number },
    })
    const [logged] = await activityOf(team.id, order.id)
    expect(JSON.parse(logged!.detail)).toMatchObject({ alias: 'seamstress-order-ready', status: 'sent' })
  })

  it('logs a failure instead of throwing', async () => {
    const { team, order } = await send(() => Response.json({ Message: 'Bad token' }, { status: 401 }))
    const [logged] = await activityOf(team.id, order.id)
    expect(JSON.parse(logged!.detail)).toMatchObject({ status: 'failed', error: 'Postmark said 401: Bad token' })
  })

  it('logs a failure when the network is down', async () => {
    const { team, order } = await send(() => Promise.reject(new Error('offline')))
    const [logged] = await activityOf(team.id, order.id)
    expect(JSON.parse(logged!.detail)).toMatchObject({ status: 'failed', error: 'offline' })
  })
})

describe('an email failure never fails the request', () => {
  it('still creates the order and skips clients with no email or auto-email off', async () => {
    const calls = stubPostmark(() => Response.json({ Message: 'Nope' }, { status: 500 }))
    const { owner, team } = await createTestTeam()
    const body = (client: Record<string, unknown>) => ({
      client,
      description: 'Fake coat',
      quotePence: 5000,
      dueDate: '2026-12-01',
      garments: [{ description: 'Fake garment' }],
    })

    const noEmail = await owner.send('POST', '/api/orders', body({ name: 'No Email', phone: 'fake phone' }))
    expect(noEmail.status).toBe(201)
    expect(calls).toHaveLength(0)

    const withEmail = await owner.send('POST', '/api/orders', body({ name: 'Has Email', phone: 'fake phone', email: 'hello@40for40.app' }))
    expect(withEmail.status).toBe(201)
    await vi.waitFor(async () => {
      expect(await activityOf(team.id, withEmail.body.order.id)).toHaveLength(1)
    })
    expect(JSON.parse((await activityOf(team.id, withEmail.body.order.id))[0]!.detail)).toMatchObject({ status: 'failed' })

    await owner.send('PATCH', '/api/team', { autoEmailClients: false })
    const callsBefore = calls.length
    const off = await owner.send('POST', '/api/orders', body({ name: 'Also Email', phone: 'fake phone', email: 'hello@40for40.app' }))
    expect(off.status).toBe(201)
    expect(calls).toHaveLength(callsBefore)
  })
})

describe('templateModel', () => {
  it('adds formatted money, minutes, dates and months', () => {
    const model = templateModel({ name: 'A' } as never, {
      due_date: '2026-11-24',
      month: '2026-11',
      total_minutes: 85,
      lines: [{ minutes: 60, pence: 6000 }],
    }) as any
    expect(model.dueDateText).toBe('Tuesday 24 November')
    expect(model.monthText).toBe('November 2026')
    expect(model.totalMinutesText).toBe('1h 25m')
    expect(model.lines[0]).toMatchObject({ minutesText: '1h', penceText: '£60.00' })
  })
})
