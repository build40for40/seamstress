import type { Activity } from '@seamless/shared'
import { describe, expect, it } from 'vitest'
import { describeActivity } from './labels'

const lookups = {
  memberName: (id: string) => ({ m1: 'Ada Example', m2: 'Bea Example' })[id],
  garmentRef: (id: string) => ({ g1: 'SE-1001-A' })[id],
}

const activity = (kind: string, detail: Record<string, unknown> | null = null, garmentId: string | null = null): Activity => ({
  id: 'a1',
  teamId: 't1',
  orderId: 'o1',
  garmentId,
  memberId: 'm1',
  kind,
  detail,
  createdAt: '2026-11-19T10:00:00Z',
})

describe('describeActivity', () => {
  it('says what happened in plain words', () => {
    expect(describeActivity(activity('created'), lookups)).toBe('Order taken in')
    expect(describeActivity(activity('garment_added', null, 'g1'), lookups)).toBe('Added SE-1001-A')
    expect(describeActivity(activity('stage', { ref: 'SE-1001-A', from: 'todo', to: 'fitting' }), lookups)).toBe(
      'SE-1001-A moved to fitting',
    )
    expect(describeActivity(activity('assigned', { ref: 'SE-1001-A', memberIds: ['m1', 'm2'] }), lookups)).toBe(
      'SE-1001-A given to Ada Example and Bea Example',
    )
    expect(describeActivity(activity('reviewed', { approved: 3, heldBack: 1 }), lookups)).toBe(
      'Reviewed: 3 approved, 1 held back',
    )
    expect(describeActivity(activity('told_client', { channel: 'whatsapp', moment: 'ready' }), lookups)).toBe(
      'Told the client on WhatsApp: ready to collect',
    )
    expect(
      describeActivity(activity('email', { alias: 'seamstress-order-received', to: 'c@example.com', status: 'sent' }), lookups),
    ).toBe('Emailed c@example.com: order received')
    expect(describeActivity(activity('invoice_sent', { number: 'INV-0001', totalPence: 240000 }), lookups)).toBe(
      'Sent invoice INV-0001 for £2,400.00',
    )
  })

  it('falls back to the kind for anything new', () => {
    expect(describeActivity(activity('timesheet_reopened'), lookups)).toBe('Timesheet reopened')
  })
})
