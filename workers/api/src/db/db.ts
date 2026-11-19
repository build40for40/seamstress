import { env } from 'cloudflare:workers'

export const db = () => env.DB

export const newId = () => crypto.randomUUID()

export const nowIso = () => new Date().toISOString()

export function randomToken(bytes = 24) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes))
  return btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

type Patch<T> = Partial<Record<keyof T, unknown>>

export function updateStatement<T>(table: string, teamId: string, id: string, patch: Patch<T>, columns: readonly (keyof T & string)[]) {
  const keys = columns.filter((column) => patch[column] !== undefined)
  if (keys.length === 0) return null
  const sets = keys.map((key) => `${key} = ?`).join(', ')
  return db()
    .prepare(`UPDATE ${table} SET ${sets} WHERE team_id = ? AND id = ?`)
    .bind(...keys.map((key) => patch[key]), teamId, id)
}
