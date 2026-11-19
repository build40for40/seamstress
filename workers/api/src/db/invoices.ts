import { db, newId, nowIso } from './db'
import type { InvoiceRow } from './rows'

export const getInvoice = (teamId: string, invoiceId: string) =>
  db().prepare('SELECT * FROM invoices WHERE team_id = ? AND id = ?').bind(teamId, invoiceId).first<InvoiceRow>()

export const listInvoices = (teamId: string, orderIds?: string[]) => {
  const statement = orderIds
    ? db()
        .prepare('SELECT * FROM invoices WHERE team_id = ? AND order_id IN (SELECT value FROM json_each(?)) ORDER BY created_at')
        .bind(teamId, JSON.stringify(orderIds))
    : db().prepare('SELECT * FROM invoices WHERE team_id = ? ORDER BY created_at').bind(teamId)
  return statement.all<InvoiceRow>().then((result) => result.results)
}

export const getDraftInvoice = (teamId: string, orderId: string) =>
  db()
    .prepare("SELECT * FROM invoices WHERE team_id = ? AND order_id = ? AND status = 'draft'")
    .bind(teamId, orderId)
    .first<InvoiceRow>()

export async function createOrGetDraftInvoice(teamId: string, orderId: string) {
  await db()
    .prepare(
      `INSERT INTO invoices (id, team_id, order_id, created_at)
       SELECT ?, team_id, id, ? FROM orders WHERE team_id = ? AND id = ?
       ON CONFLICT DO NOTHING`,
    )
    .bind(newId(), nowIso(), teamId, orderId)
    .run()
  return getDraftInvoice(teamId, orderId)
}

export async function updateDraftInvoice(
  teamId: string,
  invoiceId: string,
  patch: { final_price_pence?: number | null; included_held_back?: string[] },
) {
  const sets: string[] = []
  const values: unknown[] = []
  if (patch.final_price_pence !== undefined) {
    sets.push('final_price_pence = ?')
    values.push(patch.final_price_pence)
  }
  if (patch.included_held_back !== undefined) {
    sets.push('included_held_back = ?')
    values.push(JSON.stringify(patch.included_held_back))
  }
  if (sets.length > 0) {
    await db()
      .prepare(`UPDATE invoices SET ${sets.join(', ')} WHERE team_id = ? AND id = ? AND status = 'draft'`)
      .bind(...values, teamId, invoiceId)
      .run()
  }
  return getInvoice(teamId, invoiceId)
}

export function sendInvoiceStatements(teamId: string, invoiceId: string, snapshot: unknown, entryIds: string[]) {
  const now = nowIso()
  return [
    db()
      .prepare(
        `UPDATE invoices SET status = 'sent', sent_at = ?, snapshot = ?,
           number = (SELECT 'INV-' || printf('%04d', next_invoice_number) FROM teams WHERE id = ?)
         WHERE team_id = ? AND id = ? AND status = 'draft'`,
      )
      .bind(now, JSON.stringify(snapshot), teamId, teamId, invoiceId),
    db().prepare('UPDATE teams SET next_invoice_number = next_invoice_number + 1 WHERE id = ?').bind(teamId),
    db()
      .prepare(
        `UPDATE time_entries SET invoice_id = ?, updated_at = ?
         WHERE team_id = ? AND invoice_id IS NULL AND id IN (SELECT value FROM json_each(?))`,
      )
      .bind(invoiceId, now, teamId, JSON.stringify(entryIds)),
  ]
}

export async function sendInvoice(teamId: string, invoiceId: string, snapshot: unknown, entryIds: string[]) {
  const draft = await getInvoice(teamId, invoiceId)
  if (draft?.status !== 'draft') return null
  await db().batch(sendInvoiceStatements(teamId, invoiceId, snapshot, entryIds))
  return getInvoice(teamId, invoiceId)
}

export async function markInvoicePaid(teamId: string, invoiceId: string) {
  await db()
    .prepare("UPDATE invoices SET status = 'paid', paid_at = ? WHERE team_id = ? AND id = ? AND status = 'sent'")
    .bind(nowIso(), teamId, invoiceId)
    .run()
  return getInvoice(teamId, invoiceId)
}
