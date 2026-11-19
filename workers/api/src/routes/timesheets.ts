import { monthQuerySchema, monthSchema, timesheetExportQuerySchema } from '@seamstress/shared/schemas'
import { monthRange } from '@seamstress/shared/time'
import { rateOn, timesheet, type TimesheetEntry } from '@seamstress/shared/timesheet'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireOwner } from '../auth'
import { listMembers, listPayRates } from '../db/members'
import { listEntriesWithOrder, type EntryWithOrderRow } from '../db/owner'
import { listTimesheets, reopenTimesheet } from '../db/timesheets'
import type { AppEnv } from '../env'
import * as serialize from '../serializers/owner'
import { validate } from '../validate'

const routes = new Hono<AppEnv>()

routes.use('/timesheets', requireOwner)
routes.use('/timesheets/*', requireOwner)

const timesheetEntry = (row: EntryWithOrderRow): TimesheetEntry => ({
  id: row.id,
  memberId: row.member_id,
  garmentId: row.garment_id,
  kind: row.kind,
  dateLocal: row.date_local,
  minutes: row.minutes,
  orderId: row.order_id,
})

async function monthTimesheets(teamId: string, month: string) {
  const { first, last } = monthRange(month)
  const [members, payRates, entries, sent] = await Promise.all([
    listMembers(teamId, { includeRemoved: true }),
    listPayRates(teamId),
    listEntriesWithOrder(teamId, { from: first, to: last }),
    listTimesheets(teamId, { month }),
  ])
  const orderNumbers = new Map(entries.map((entry) => [entry.order_id, entry.order_number]))
  const counted = entries.filter((entry) => entry.minutes !== null)

  const rows = members
    .filter((member) => member.removed_at === null || counted.some((entry) => entry.member_id === member.id))
    .map((member) => {
      const rates = payRates.filter((rate) => rate.member_id === member.id).map(serialize.payRate)
      const result = timesheet({ id: member.id, timeZone: member.time_zone }, month, entries.map(timesheetEntry), rates)
      const sentRow = sent.find((row) => row.member_id === member.id)
      return {
        member: { id: member.id, name: member.name, role: member.role, timeZone: member.time_zone, removed: member.removed_at !== null },
        sentAt: sentRow?.sent_at ?? null,
        ...result,
        byOrder: result.byOrder.map((order) => ({ ...order, number: orderNumbers.get(order.orderId) ?? null })),
      }
    })
  return { rows, members, payRates, entries: counted }
}

routes.get('/timesheets', validate('query', monthQuerySchema), async (c) => {
  const { month } = c.req.valid('query')
  const { rows } = await monthTimesheets(c.var.team.id, month)
  return c.json({ month, timesheets: rows })
})

const hours = (minutes: number) => (minutes / 60).toFixed(2)
const pounds = (pence: number | null) => (pence === null ? '' : (pence / 100).toFixed(2))

function csvCell(value: string | number | null) {
  let text = value === null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const csv = (rows: (string | number | null)[][]) => rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'

routes.get('/timesheets/export', validate('query', timesheetExportQuerySchema), async (c) => {
  const { month, type } = c.req.valid('query')
  const { rows, members, payRates, entries } = await monthTimesheets(c.var.team.id, month)

  const body =
    type === 'summary'
      ? csv([
          ['name', 'time_zone', 'month', 'billable_hours', 'general_hours', 'total_hours', 'pay_rate_gbp', 'pay_gbp', 'sent_at'],
          ...rows.map((row) => [
            row.member.name,
            row.timeZone,
            month,
            hours(row.billableMinutes),
            hours(row.generalMinutes),
            hours(row.totalMinutes),
            pounds(row.ratePence),
            pounds(row.payPence),
            row.sentAt,
          ]),
        ])
      : csv([
          ['name', 'time_zone', 'date', 'order', 'garment', 'kind', 'minutes', 'hours', 'pay_rate_gbp', 'note'],
          ...rows.flatMap((row) => {
            const member = members.find((candidate) => candidate.id === row.memberId)!
            const rates = payRates.filter((rate) => rate.member_id === member.id).map(serialize.payRate)
            return entries
              .filter((entry) => row.entryIds.includes(entry.id))
              .map((entry) => [
                member.name,
                member.time_zone,
                entry.date_local,
                entry.order_number,
                entry.garment_ref,
                entry.kind,
                entry.minutes,
                hours(entry.minutes!),
                pounds(rateOn(rates, entry.date_local)),
                entry.note,
              ])
          }),
        ])

  return c.body(body, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="seamless-timesheets-${month}-${type}.csv"`,
  })
})

routes.delete('/timesheets/:memberId/:month', async (c) => {
  const month = monthSchema.safeParse(c.req.param('month'))
  if (!month.success) throw new HTTPException(400, { message: 'Use a month like 2026-11' })
  const reopened = await reopenTimesheet(c.var.team.id, c.req.param('memberId'), month.data, c.var.member.id)
  if (!reopened) throw new HTTPException(404, { message: "That timesheet hasn't been sent." })
  return c.body(null, 204)
})

export default routes
