import { describe, expect, it } from 'vitest'
import { createTestTeam } from '../test/actors'
import { listGarments } from './garments'
import { createEntry, deleteEntry, getEntry, listEntries, runningEntry } from './time-entries'

describe('time entry queries', () => {
  it("refuses time on another atelier's garment or member", async () => {
    const first = await createTestTeam()
    const second = await createTestTeam()
    const ada = await first.addSeamstress()
    const theirs = await second.addOrder()
    const [theirGarment] = await listGarments(second.team.id, [theirs.id])
    const base = { kind: 'sewing' as const, date_local: '2026-11-19', minutes: 30, created_by: ada.member.id }

    expect(await createEntry(first.team.id, { ...base, member_id: ada.member.id, garment_id: theirGarment!.id })).toBeNull()
    expect(await createEntry(second.team.id, { ...base, member_id: ada.member.id, garment_id: theirGarment!.id })).toBeNull()
  })

  it('keeps one running timer per member and scopes reads to the atelier', async () => {
    const first = await createTestTeam()
    const second = await createTestTeam()
    const ada = await first.addSeamstress()
    const timer = {
      member_id: ada.member.id,
      garment_id: null,
      kind: 'waiting' as const,
      date_local: '2026-11-19',
      started_at: '2026-11-19T09:00:00.000Z',
      created_by: ada.member.id,
    }

    const running = await createEntry(first.team.id, timer)
    expect(running?.review_status).toBeNull()
    expect((await runningEntry(first.team.id, ada.member.id))?.id).toBe(running!.id)
    await expect(createEntry(first.team.id, timer)).rejects.toThrow(/UNIQUE/)

    expect(await getEntry(second.team.id, running!.id)).toBeNull()
    expect(await listEntries(second.team.id, { memberId: ada.member.id })).toEqual([])
    expect(await deleteEntry(second.team.id, running!.id)).toBe(false)
  })
})
