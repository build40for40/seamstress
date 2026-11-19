import type { Context } from 'hono'

export const origin = (c: Context) => new URL(c.req.url).origin

export const trackingUrl = (c: Context, token: string) => `${origin(c)}/track/${token}`

export const workroomLink = (c: Context, key: string) => `${origin(c)}/workroom/#/k/${key}`

export const studioOrderUrl = (c: Context, orderId: string) => `${origin(c)}/orders/${orderId}`
