import {
  LOCK_MESSAGES,
  allGarmentsDone,
  createEntrySchema,
  elapsedMinutes,
  kindMatchesGarment,
  localDate,
  lockReason,
  monthOf,
  monthRange,
  monthSchema,
  monthQuerySchema,
  photoUploadQuerySchema,
  startTimerSchema,
  stopTimerSchema,
  takesTime,
  timerNeedsCheck,
  timesheet,
  tooShortToKeep,
  updateEntrySchema,
  updateGarmentStatusSchema,
  updateTimerSchema,
  workroomOrder,
  type GarmentStatus,
} from '@seamless/shared'
import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireMember } from '../auth'
import { activityStatement, logActivity } from '../db/activity'
import { db, newId, nowIso } from '../db/db'
import { listPayRates } from '../db/members'
import { createPhoto, deletePhoto, listPhotos } from '../db/photos'
import type { MemberRow, TeamRow, TimeEntryRow } from '../db/rows'
import { deleteEntry, insertEntry, listEntries, updateEntry, type EntryPatch } from '../db/time-entries'
import { getTimesheet, sendTimesheet, sentMonths } from '../db/timesheets'
import {
  discardTimerStatement,
  finishTimerStatement,
  getMemberEntry,
  getMemberGarment,
  listMemberEntriesBetween,
  listMemberOrders,
  listOrderGarmentStatuses,
  runningTimer,
  startGarmentStatement,
  type EntryWithRef,
} from '../db/workroom'
import { sendEmail } from '../email'
import type { AppEnv } from '../env'
import {
  seamstressGarment,
  seamstressMe,
  seamstressOrder,
  seamstressOrderSummary,
  seamstressPhoto,
  seamstressSavedEntry,
  seamstressTimer,
  seamstressTimesheet,
} from '../serializers/seamstress'
import { validate } from '../validate'

const MAX_PHOTO_BYTES = 8 * 1024 * 1024

const GARMENT_MOVES: Record<GarmentStatus, readonly GarmentStatus[]> = {
  todo: ['in_progress', 'fitting', 'done'],
  in_progress: ['fitting', 'done'],
  fitting: ['in_progress', 'done'],
  done: [],
}

const routes = new Hono<AppEnv>()

routes.use('/me', requireMember)
routes.use('/me/*', requireMember)

const today = (member: MemberRow) => localDate(new Date(), member.time_zone)

const reviewStatusFor = (member: MemberRow) => (member.role === 'owner' ? 'approved' : 'waiting')

const isRunning = (entry: TimeEntryRow) => entry.started_at !== null && entry.ended_at === null

const notHers = () => new HTTPException(404, { message: "That garment isn't on your list." })
const noEntry = () => new HTTPException(404, { message: "We couldn't find that entry." })
const tooBig = () => new HTTPException(413, { message: "That photo's too big. Try a smaller one." })
const locked = (reason: keyof typeof LOCK_MESSAGES) => new HTTPException(409, { message: LOCK_MESSAGES[reason] })
const closedOrder = () => new HTTPException(409, { message: "That order's closed, so ask your atelier if there's more to do." })

async function workableGarment(team: TeamRow, member: MemberRow, garmentId: string) {
  const found = await getMemberGarment(team.id, member.id, garmentId)
  if (!found) throw notHers()
  if (!takesTime(found.order)) throw closedOrder()
  return found
}

function refuseLocked(entry: TimeEntryRow, months: readonly string[]) {
  const reason = lockReason({ invoiceId: entry.invoice_id, dateLocal: entry.date_local }, months)
  if (reason) throw locked(reason)
}

function refuseFuture(member: MemberRow, dateLocal: string) {
  if (dateLocal > today(member)) throw new HTTPException(400, { message: "That date hasn't happened yet." })
}

function serializeTimer(member: MemberRow, timer: EntryWithRef | null) {
  return timer ? seamstressTimer(timer, timerNeedsCheck(timer.started_at!, new Date(), member.time_zone)) : null
}

function stopStatement(teamId: string, timer: TimeEntryRow, endedAt: string) {
  return tooShortToKeep(timer.started_at!, endedAt)
    ? { kept: false, statement: discardTimerStatement(teamId, timer.id) }
    : { kept: true, statement: finishTimerStatement(teamId, timer.id, endedAt, elapsedMinutes(timer.started_at!, endedAt)) }
}

function tellAtelierIfAllDone(c: Context<AppEnv>, team: TeamRow, orderId: string, number: string) {
  return listOrderGarmentStatuses(team.id, orderId).then((garments) => {
    if (!allGarmentsDone(garments)) return
    sendEmail(c.env, c.executionCtx, 'seamless-garments-done', {
      team,
      to: team.reply_to_email,
      orderId,
      model: { order_number: number },
    })
  })
}

routes.get('/me', async (c) => {
  const { member, team } = c.var
  return c.json({
    ...seamstressMe(member, team),
    today: today(member),
    timer: serializeTimer(member, await runningTimer(team.id, member.id)),
  })
})

routes.get('/me/orders', async (c) => {
  const { member, team } = c.var
  const { orders, garments } = await listMemberOrders(team.id, member.id)
  const on = today(member)
  const list = orders
    .map((order) => seamstressOrder(order, garments, on))
    .filter((order) => !allGarmentsDone(order.garments))
    .sort((a, b) => workroomOrder({ ...a, dueDate: a.dueDate ?? '9999-12-31' }, { ...b, dueDate: b.dueDate ?? '9999-12-31' }))
  return c.json({ orders: list })
})

routes.get('/me/garments/:id', async (c) => {
  const { member, team } = c.var
  const found = await getMemberGarment(team.id, member.id, c.req.param('id'))
  if (!found) throw notHers()
  const [photos, entries, months] = await Promise.all([
    listPhotos(team.id, { garmentIds: [found.garment.id] }),
    listEntries(team.id, { garmentIds: [found.garment.id], memberId: member.id }),
    sentMonths(team.id, member.id),
  ])
  return c.json({
    order: seamstressOrderSummary(found.order),
    garment: seamstressGarment(found.garment),
    photos: photos.map((photo) => seamstressPhoto(photo, member)),
    entries: entries.map((entry) => seamstressSavedEntry({ ...entry, garment_ref: found.garment.ref }, months)),
  })
})

routes.post('/me/timer', validate('json', startTimerSchema), async (c) => {
  const { member, team } = c.var
  const { garmentId, kind } = c.req.valid('json')
  const found = garmentId ? await workableGarment(team, member, garmentId) : null

  const running = await runningTimer(team.id, member.id)
  if (running && running.garment_id === garmentId && running.kind === kind) {
    return c.json({ timer: serializeTimer(member, running), stopped: null, discarded: false })
  }

  const now = nowIso()
  const months = await sentMonths(team.id, member.id)
  if (months.includes(monthOf(localDate(now, member.time_zone)))) throw locked('timesheet')
  if (running) refuseLocked(running, months)
  const stop = running ? stopStatement(team.id, running, now) : null
  const id = newId()
  const statements = [
    ...(stop ? [stop.statement] : []),
    insertEntry(team.id, id, {
      member_id: member.id,
      garment_id: garmentId,
      kind,
      date_local: localDate(now, member.time_zone),
      started_at: now,
      review_status: garmentId ? reviewStatusFor(member) : null,
      created_by: member.id,
    }),
  ]
  if (found?.garment.status === 'todo') {
    statements.push(
      startGarmentStatement(team.id, found.garment.id),
      activityStatement(team.id, {
        orderId: found.order.id,
        garmentId: found.garment.id,
        memberId: member.id,
        kind: 'stage',
        detail: { from: 'todo', to: 'in_progress' },
      }),
    )
  }
  try {
    await db().batch(statements)
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw new HTTPException(409, { message: 'Another timer just started. Have a look and try again.' })
    throw error
  }

  const stopped = stop?.kept ? await getMemberEntry(team.id, member.id, running!.id) : null
  return c.json(
    {
      timer: serializeTimer(member, await runningTimer(team.id, member.id)),
      stopped: stopped ? seamstressSavedEntry(stopped) : null,
      discarded: stop ? !stop.kept : false,
    },
    201,
  )
})

routes.post('/me/timer/stop', validate('json', stopTimerSchema), async (c) => {
  const { member, team } = c.var
  const running = await runningTimer(team.id, member.id)
  if (!running) throw new HTTPException(404, { message: "There's no timer running." })

  const now = new Date()
  const endedAt = new Date(c.req.valid('json').endedAt ?? now)
  if (endedAt > now) throw new HTTPException(400, { message: "That time hasn't happened yet." })
  if (endedAt < new Date(running.started_at!)) {
    throw new HTTPException(400, { message: 'That was before the timer started.' })
  }

  refuseLocked(running, await sentMonths(team.id, member.id))
  const stop = stopStatement(team.id, running, endedAt.toISOString())
  await stop.statement.run()
  if (!stop.kept) {
    return c.json({ entry: null, discarded: true, message: "Under a minute, so we didn't keep it." })
  }
  const entry = await getMemberEntry(team.id, member.id, running.id)
  return c.json({ entry: seamstressSavedEntry(entry!), discarded: false })
})

routes.patch('/me/timer', validate('json', updateTimerSchema), async (c) => {
  const { member, team } = c.var
  const running = await runningTimer(team.id, member.id)
  if (!running) throw new HTTPException(404, { message: "There's no timer running." })
  if (running.garment_id === null) {
    throw new HTTPException(400, { message: "General time is always waiting, so there's nothing to switch." })
  }
  await updateEntry(team.id, running.id, { kind: c.req.valid('json').kind })
  return c.json({ timer: serializeTimer(member, await runningTimer(team.id, member.id)) })
})

routes.post('/me/entries', validate('json', createEntrySchema), async (c) => {
  const { member, team } = c.var
  const input = c.req.valid('json')
  if (input.garmentId) await workableGarment(team, member, input.garmentId)
  refuseFuture(member, input.dateLocal)
  const months = await sentMonths(team.id, member.id)
  if (months.includes(monthOf(input.dateLocal))) throw locked('timesheet')

  const id = newId()
  await insertEntry(team.id, id, {
    member_id: member.id,
    garment_id: input.garmentId,
    kind: input.kind,
    date_local: input.dateLocal,
    minutes: input.minutes,
    note: input.note ?? null,
    review_status: input.garmentId ? reviewStatusFor(member) : null,
    created_by: member.id,
  }).run()
  const entry = await getMemberEntry(team.id, member.id, id)
  return c.json({ entry: seamstressSavedEntry(entry!, months) }, 201)
})

routes.patch('/me/entries/:id', validate('json', updateEntrySchema), async (c) => {
  const { member, team } = c.var
  const input = c.req.valid('json')
  const entry = await getMemberEntry(team.id, member.id, c.req.param('id'))
  if (!entry) throw noEntry()
  if (isRunning(entry)) throw new HTTPException(409, { message: 'Stop the timer first, then fix it.' })

  const months = await sentMonths(team.id, member.id)
  refuseLocked(entry, months)
  if (input.dateLocal) {
    refuseFuture(member, input.dateLocal)
    if (months.includes(monthOf(input.dateLocal))) throw locked('timesheet')
  }
  if (input.kind && !kindMatchesGarment(entry.garment_id, input.kind)) {
    throw new HTTPException(400, { message: 'Waiting goes on general time, and garment time is sewing, fitting or tidying' })
  }

  const patch: EntryPatch = { kind: input.kind, date_local: input.dateLocal, minutes: input.minutes, note: input.note }
  const changesHours = [input.kind, input.dateLocal, input.minutes].some((value) => value !== undefined)
  if (entry.garment_id && changesHours) patch.review_status = reviewStatusFor(member)
  await updateEntry(team.id, entry.id, patch)
  const updated = await getMemberEntry(team.id, member.id, entry.id)
  return c.json({ entry: seamstressSavedEntry(updated!, months) })
})

routes.delete('/me/entries/:id', async (c) => {
  const { member, team } = c.var
  const entry = await getMemberEntry(team.id, member.id, c.req.param('id'))
  if (!entry) throw noEntry()
  refuseLocked(entry, await sentMonths(team.id, member.id))
  await deleteEntry(team.id, entry.id)
  return c.json({ deleted: true })
})

routes.patch('/me/garments/:id/status', validate('json', updateGarmentStatusSchema), async (c) => {
  const { member, team } = c.var
  const { status } = c.req.valid('json')
  const found = await getMemberGarment(team.id, member.id, c.req.param('id'))
  if (!found) throw notHers()
  const { garment, order } = found
  if (garment.status === status) return c.json({ garment: seamstressGarment(garment) })
  if (!GARMENT_MOVES[garment.status].includes(status)) {
    throw new HTTPException(409, { message: "It can't go back from there. Ask your atelier if it needs to." })
  }

  await db().batch([
    db()
      .prepare('UPDATE garments SET status = ?, updated_at = ? WHERE team_id = ? AND id = ? AND status = ?')
      .bind(status, nowIso(), team.id, garment.id, garment.status),
    activityStatement(team.id, {
      orderId: order.id,
      garmentId: garment.id,
      memberId: member.id,
      kind: 'stage',
      detail: { from: garment.status, to: status },
    }),
  ])
  if (status === 'done') await tellAtelierIfAllDone(c, team, order.id, order.number)
  const updated = await getMemberGarment(team.id, member.id, garment.id)
  return c.json({ garment: seamstressGarment(updated!.garment) })
})

routes.post('/me/garments/:id/photos', validate('query', photoUploadQuerySchema), async (c) => {
  const { member, team } = c.var
  const found = await getMemberGarment(team.id, member.id, c.req.param('id'))
  if (!found) throw notHers()
  const type = c.req.header('Content-Type') ?? ''
  if (!type.startsWith('image/jpeg')) throw new HTTPException(415, { message: 'Send the photo as a JPEG.' })
  if (Number(c.req.header('Content-Length') ?? 0) > MAX_PHOTO_BYTES) throw tooBig()

  const body = await c.req.arrayBuffer()
  if (body.byteLength > MAX_PHOTO_BYTES) throw tooBig()
  const bytes = new Uint8Array(body, 0, Math.min(3, body.byteLength))
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new HTTPException(400, { message: "That doesn't look like a photo. Try again?" })
  }

  const { caption, label } = c.req.valid('query')
  const photo = await createPhoto(team.id, {
    garment_id: found.garment.id,
    member_id: member.id,
    taken_on: today(member),
    caption: caption || null,
    label: label ?? null,
    review_status: reviewStatusFor(member),
  })
  if (!photo) throw notHers()
  try {
    await c.env.PHOTOS.put(photo.r2_key, body, { httpMetadata: { contentType: 'image/jpeg' } })
  } catch (error) {
    await deletePhoto(team.id, photo.id)
    throw error
  }
  return c.json({ photo: seamstressPhoto(photo, member) }, 201)
})

async function memberTimesheet(member: MemberRow, team: TeamRow, month: string) {
  const { first, last } = monthRange(month)
  const [entries, payRates, sent] = await Promise.all([
    listMemberEntriesBetween(team.id, member.id, first, last),
    listPayRates(team.id, [member.id]),
    getTimesheet(team.id, member.id, month),
  ])
  const result = timesheet(
    { id: member.id, timeZone: member.time_zone },
    month,
    entries,
    payRates.map((rate) => ({ ratePence: rate.rate_pence, effectiveFrom: rate.effective_from })),
  )
  const numbers = new Map(entries.flatMap((entry) => (entry.orderId && entry.orderNumber ? [[entry.orderId, entry.orderNumber]] : [])))
  const running = entries.some((entry) => entry.minutes === null)
  return { timesheet: seamstressTimesheet(result, numbers, sent, team), running }
}

routes.get('/me/timesheet', validate('query', monthQuerySchema), async (c) => {
  const { member, team } = c.var
  const { timesheet } = await memberTimesheet(member, team, c.req.valid('query').month)
  return c.json({ timesheet })
})

routes.post('/me/timesheet/:month/send', async (c) => {
  const { member, team } = c.var
  const parsed = monthSchema.safeParse(c.req.param('month'))
  if (!parsed.success) throw new HTTPException(400, { message: 'Use a month like 2026-11' })
  const month = parsed.data
  if (month > monthOf(today(member))) throw new HTTPException(400, { message: "That month hasn't happened yet." })

  const current = await memberTimesheet(member, team, month)
  if (current.timesheet.sentAt) return c.json({ timesheet: current.timesheet })
  if (current.running) throw new HTTPException(409, { message: 'Stop your timer first, then send.' })

  await sendTimesheet(team.id, member.id, month)
  await logActivity(team.id, { memberId: member.id, kind: 'timesheet_sent', detail: { month } })
  const { timesheet } = await memberTimesheet(member, team, month)
  sendEmail(c.env, c.executionCtx, 'seamless-timesheet-sent', {
    team,
    to: team.reply_to_email,
    model: {
      member_name: member.name,
      month,
      total_minutes: timesheet.totalMinutes,
    },
  })
  return c.json({ timesheet })
})

export default routes
