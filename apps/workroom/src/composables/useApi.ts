import { MEMBER_KEY_HEADER, clearMemberKey, memberKey } from './useMemberKey'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export const OFFLINE_MESSAGE = "Couldn't reach the workroom. Check your signal and try again."

export type ApiInit = Omit<RequestInit, 'body'> & { body?: BodyInit; json?: unknown }

let unauthorized: () => void = () => {}

export function onUnauthorized(handler: () => void) {
  unauthorized = handler
}

export function withMemberKey(init: HeadersInit = {}) {
  const headers = new Headers(init)
  const key = memberKey()
  if (key) headers.set(MEMBER_KEY_HEADER, key)
  return headers
}

export async function api<T>(path: string, { json, ...init }: ApiInit = {}): Promise<T> {
  const headers = withMemberKey(init.headers)
  if (json !== undefined) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers,
      body: json === undefined ? init.body : JSON.stringify(json),
    })
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE)
  }
  const isJson = response.headers.get('Content-Type')?.includes('application/json')
  const data = isJson ? await response.json() : await response.text()
  if (!response.ok) {
    const message = isJson && typeof data?.error === 'string' ? data.error : 'Something went wrong. Try again in a moment.'
    if (response.status === 401 && headers.has(MEMBER_KEY_HEADER)) {
      clearMemberKey()
      unauthorized()
    }
    throw new ApiError(response.status, message)
  }
  return data as T
}

export const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Try again in a moment.'

export function useApi() {
  return { api }
}
