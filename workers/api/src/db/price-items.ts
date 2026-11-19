import { db, newId, nowIso, updateStatement } from './db'
import type { PriceItemRow } from './rows'

export const listPriceItems = (teamId: string, { includeArchived = false } = {}) =>
  db()
    .prepare(
      `SELECT * FROM price_items WHERE team_id = ? ${includeArchived ? '' : 'AND archived_at IS NULL'} ORDER BY name COLLATE NOCASE`,
    )
    .bind(teamId)
    .all<PriceItemRow>()
    .then((result) => result.results)

export const getPriceItem = (teamId: string, id: string) =>
  db().prepare('SELECT * FROM price_items WHERE team_id = ? AND id = ?').bind(teamId, id).first<PriceItemRow>()

export async function createPriceItem(teamId: string, item: Pick<PriceItemRow, 'name' | 'price_pence'>) {
  const id = newId()
  await db()
    .prepare('INSERT INTO price_items (id, team_id, name, price_pence) VALUES (?, ?, ?, ?)')
    .bind(id, teamId, item.name, item.price_pence)
    .run()
  return (await getPriceItem(teamId, id))!
}

export async function updatePriceItem(teamId: string, id: string, patch: Partial<Pick<PriceItemRow, 'name' | 'price_pence'>>) {
  await updateStatement<PriceItemRow>('price_items', teamId, id, patch, ['name', 'price_pence'])?.run()
  return getPriceItem(teamId, id)
}

export async function archivePriceItem(teamId: string, id: string) {
  const result = await db()
    .prepare('UPDATE price_items SET archived_at = ? WHERE team_id = ? AND id = ? AND archived_at IS NULL')
    .bind(nowIso(), teamId, id)
    .run()
  return result.meta.changes > 0
}
