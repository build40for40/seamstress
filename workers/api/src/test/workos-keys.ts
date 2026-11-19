import { env } from 'cloudflare:workers'

const jwksUrl = `https://api.workos.com/sso/jwks/${env.WORKOS_CLIENT_ID}`
const realFetch = globalThis.fetch

globalThis.fetch = (input, init) => {
  const url = input instanceof Request ? input.url : String(input)
  return url === jwksUrl ? Promise.resolve(Response.json(env.TEST_WORKOS_JWKS)) : realFetch(input, init)
}
