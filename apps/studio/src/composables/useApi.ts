import { getAccessToken } from './useAuth'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export type ApiInit = Omit<RequestInit, 'body'> & { body?: BodyInit; json?: unknown }

export async function api<T>(path: string, { json, ...init }: ApiInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = await getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (json !== undefined) headers.set('Content-Type', 'application/json')

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
    body: json === undefined ? init.body : JSON.stringify(json),
  })
  const isJson = response.headers.get('Content-Type')?.includes('application/json')
  const data = isJson ? await response.json() : await response.text()
  if (!response.ok) {
    const message = isJson && typeof data?.error === 'string' ? data.error : 'Something went wrong. Try again in a moment.'
    throw new ApiError(response.status, message)
  }
  return data as T
}

export function useApi() {
  return { api }
}
