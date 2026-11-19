import { createClient } from '@workos-inc/authkit-js'

type AuthClient = Awaited<ReturnType<typeof createClient>>
export type AuthUser = NonNullable<ReturnType<AuthClient['getUser']>>

const PRODUCTION_HOST = 'seamless.build40for40.com'

const CLIENT_IDS = {
  production: 'client_01M6E5ZDQ9XBYYE28XYN7H3XTJ',
  staging: 'client_01M6E5ZDCH31RFHPJTD8N5JQZY',
}

export function workosClientId(hostname: string): string {
  return hostname === PRODUCTION_HOST ? CLIENT_IDS.production : CLIENT_IDS.staging
}

export function safeReturnTo(value: unknown, origin = window.location.origin): string {
  if (typeof value !== 'string') return '/'
  try {
    const url = new URL(value, origin)
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : '/'
  } catch {
    return '/'
  }
}

let client: Promise<AuthClient> | undefined

export function getAuth(): Promise<AuthClient> {
  client ??= createClient(workosClientId(window.location.hostname), {
    redirectUri: new URL(import.meta.env.BASE_URL, window.location.origin).href,
    // Without a custom auth domain the refresh cookie on api.workos.com is third-party and blocked, so keep the refresh token in localStorage.
    devMode: true,
    onRedirectCallback: ({ state }) => window.history.replaceState(null, '', safeReturnTo(state?.returnTo)),
  }).catch((error: unknown) => {
    client = undefined
    throw error
  })
  return client
}

export async function currentUser(): Promise<AuthUser | null> {
  try {
    return (await getAuth()).getUser()
  } catch {
    return null
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const auth = await getAuth()
    if (!auth.getUser()) return null
    return await auth.getAccessToken()
  } catch {
    return null
  }
}

export async function signIn(returnTo = '/') {
  await (await getAuth()).signIn({ state: { returnTo: safeReturnTo(returnTo) } })
}

export async function signOut() {
  ;(await getAuth()).signOut({ returnTo: window.location.origin })
}

export function useAuth() {
  return { getAccessToken, currentUser, signIn, signOut }
}
