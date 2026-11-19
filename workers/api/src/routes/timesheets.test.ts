import { describe, expect, it } from 'vitest'
import { listGarments } from '../db/garments'
import { addPayRate } from '../db/members'
import { createEntry, type NewEntry } from '../db/time-entries'
import { getTimesheet, sendTimesheet } from '../db/timesheets'
import { createTestTeam } from '../test/actors'

async function workshop() {
  const atelier = await createTestTeam()
  const ada = await atelier.addSeamstress('Ada Example', { ratePence: 1800, effectiveFrom: '2026-01-01' })
  await addPayRate(atelier.team.id, ada.member.id, 2400, '2026-11-15')
  const order = await atelier.addOrder({ garments: [{ description: 'Gown, hem', assignees: [ada] }] })
  const [gown] = await listGarments(atelier.team.id, [order.id])
  const log = (entry: Partial<NewEntry>) =>
    createEntry(atelier.team.id, {
      member_id: ada.member.id,
      garment_id: gown!.id,
      kind: 'sewing',
      date_local: '2026-11-10',
      minutes: 60,
      created_by: ada.member.id,
      ...entry,
    })
  await log({ minutes: 120, date_local: '2026-11-10' })
  await log({ minutes: 60, date_local: '2026-11-20', note: '=SUM(A1), "quoted"' })
  await log({ garment_id: null, kind: 'waiting', minutes: 30, date_local: '2026-11-20' })
  await log({ minutes: 600, date_local: '2026-10-31' })
  return { ...atelier, ada, order }
}

describe('GET /api/timesheets', () => {
  it('works out each member for the month, paying each entry at the rate in force', async () => {
    const { owner, ada, order } = await workshop()

    const { status, body } = await owner.get('/api/timesheets?month=2026-11')
    expect(status).toBe(200)
    const row = body.timesheets.find((sheet: { memberId: string }) => sheet.memberId === ada.member.id)
    expect(row).toMatchObject({
      member: { name: 'Ada Example', timeZone: 'Europe/London' },
      sentAt: null,
      billableMinutes: 180,
      generalMinutes: 30,
      totalMinutes: 210,
      ratePence: 2400,
      payPence: 3600 + 2400 + 1200,
      byOrder: [{ orderId: order.id, number: 'SE-1001', minutes: 180 }],
    })
    expect(row.byDay.map((day: { dateLocal: string }) => day.dateLocal)).toEqual(['2026-11-10', '2026-11-20'])
  })
})

describe('GET /api/timesheets/export', () => {
  it('downloads a summary row per member and a detail row per entry', async () => {
    const { owner } = await workshop()

    const summary = await owner.fetch('/api/timesheets/export?month=2026-11&type=summary')
    expect(summary.headers.get('Content-Type')).toContain('text/csv')
    expect((await summary.text()).split('\r\n')).toContain('Ada Example,Europe/London,2026-11,3.00,0.50,3.50,24.00,72.00,')

    const detail = (await (await owner.fetch('/api/timesheets/export?month=2026-11&type=detail')).text()).split('\r\n')
    expect(detail[0]).toBe('name,time_zone,date,order,garment,kind,minutes,hours,pay_rate_gbp,note')
    expect(detail).toContain('Ada Example,Europe/London,2026-11-10,SE-1001,SE-1001-A,sewing,120,2.00,18.00,')
    expect(detail).toContain(`Ada Example,Europe/London,2026-11-20,SE-1001,SE-1001-A,sewing,60,1.00,24.00,"'=SUM(A1), ""quoted"""`)
    expect(detail).toContain('Ada Example,Europe/London,2026-11-20,,,waiting,30,0.50,24.00,')
    expect(detail.filter((line) => line.includes('2026-10-31'))).toEqual([])
  })
})

describe('DELETE /api/timesheets/:memberId/:month', () => {
  it('reopens a sent timesheet and logs it', async () => {
    const { team, owner, ada } = await workshop()
    await sendTimesheet(team.id, ada.member.id, '2026-11')
    const { body } = await owner.get('/api/timesheets?month=2026-11')
    expect(body.timesheets.find((sheet: { memberId: string }) => sheet.memberId === ada.member.id).sentAt).toEqual(expect.any(String))

    expect((await owner.fetch(`/api/timesheets/${ada.member.id}/2026-11`, { method: 'DELETE' })).status).toBe(204)
    expect(await getTimesheet(team.id, ada.member.id, '2026-11')).toBeNull()
    const again = await owner.send('DELETE', `/api/timesheets/${ada.member.id}/2026-11`)
    expect(again).toEqual({ status: 404, body: { error: "That timesheet hasn't been sent." } })
  })

  it("can't reopen another atelier's timesheet", async () => {
    const mine = await workshop()
    const theirs = await workshop()
    await sendTimesheet(theirs.team.id, theirs.ada.member.id, '2026-11')

    expect((await mine.owner.send('DELETE', `/api/timesheets/${theirs.ada.member.id}/2026-11`)).status).toBe(404)
    expect(await getTimesheet(theirs.team.id, theirs.ada.member.id, '2026-11')).not.toBeNull()
  })
})
