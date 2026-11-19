import { describe, expect, it } from 'vitest'
import { isLocked, lockReason } from './locking'
import { entriesOf, entryById, sentMonthsFor } from './test/fixtures'

describe('isLocked', () => {
  it('locks SE-1001 on its sent invoice', () => {
    for (const entry of entriesOf('SE-1001')) {
      expect(lockReason(entry, [])).toBe('invoice')
    }
  })

  it("locks entries in a month whose timesheet she's sent", () => {
    expect(lockReason(entryById('T006'), sentMonthsFor('S01'))).toBe('timesheet')
    expect(lockReason(entryById('T012'), sentMonthsFor('S03'))).toBe('timesheet')
  })

  it('leaves open months and uninvoiced entries editable', () => {
    expect(isLocked(entryById('T025'), sentMonthsFor('S01'))).toBe(false)
    expect(isLocked(entryById('T016'), sentMonthsFor('S03'))).toBe(false)
    expect(isLocked(entryById('T014'), sentMonthsFor('S02'))).toBe(false)
  })
})
