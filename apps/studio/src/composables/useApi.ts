import type { PhotoLabel } from '@seamless/shared'
import type { OwnerPhoto } from '@/api-types'
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

const OFFLINE = "We couldn't reach Seamless. Check your connection and try again."
const FALLBACK = 'Something went wrong. Try again in a moment.'

async function authorised(url: string, { json, ...init }: ApiInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = await getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (json !== undefined) headers.set('Content-Type', 'application/json')
  try {
    return await fetch(url, { ...init, headers, body: json === undefined ? init.body : JSON.stringify(json) })
  } catch {
    throw new ApiError(0, OFFLINE)
  }
}

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const response = await authorised(`/api${path}`, init)
  const isJson = response.headers.get('Content-Type')?.includes('application/json')
  const data = isJson ? await response.json() : await response.text()
  if (!response.ok) {
    const message = isJson && typeof data?.error === 'string' ? data.error : FALLBACK
    throw new ApiError(response.status, message)
  }
  return data as T
}

export async function fetchPhoto(url: string): Promise<Blob> {
  const response = await authorised(url)
  if (!response.ok) throw new ApiError(response.status, "That photo wouldn't load.")
  return response.blob()
}

export async function uploadGarmentPhoto(
  garmentId: string,
  photo: Blob,
  { label, caption }: { label?: PhotoLabel | null; caption?: string } = {},
): Promise<OwnerPhoto> {
  const query = new URLSearchParams()
  if (label) query.set('label', label)
  if (caption?.trim()) query.set('caption', caption.trim())
  const suffix = query.size ? `?${query}` : ''
  const { photo: saved } = await api<{ photo: OwnerPhoto }>(`/garments/${garmentId}/photos${suffix}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: photo,
  })
  return saved
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : error instanceof Error ? error.message : FALLBACK
}

export function useApi() {
  return { api }
}
