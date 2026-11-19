import { db, newId, nowIso, updateStatement } from './db'
import type { ClientRow } from './rows'

export type NewClient = Pick<ClientRow, 'name'> & Partial<Pick<ClientRow, 'phone' | 'email' | 'notes'>>

export const listClients = (teamId: string) =>
  db()
    .prepare('SELECT * FROM clients WHERE team_id = ? ORDER BY name COLLATE NOCASE')
    .bind(teamId)
    .all<ClientRow>()
    .then((result) => result.results)

export const getClient = (teamId: string, clientId: string) =>
  db().prepare('SELECT * FROM clients WHERE team_id = ? AND id = ?').bind(teamId, clientId).first<ClientRow>()

export const insertClient = (teamId: string, id: string, client: NewClient) =>
  db()
    .prepare('INSERT INTO clients (id, team_id, name, phone, email, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, teamId, client.name, client.phone ?? null, client.email ?? null, client.notes ?? null, nowIso())

export async function createClient(teamId: string, client: NewClient) {
  const id = newId()
  await insertClient(teamId, id, client).run()
  return (await getClient(teamId, id))!
}

export async function updateClient(teamId: string, clientId: string, patch: Partial<NewClient>) {
  await updateStatement<ClientRow>('clients', teamId, clientId, patch, ['name', 'phone', 'email', 'notes'])?.run()
  return getClient(teamId, clientId)
}
