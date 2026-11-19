import { describe, expect, it } from 'vitest'
import { formatMinutes, formatPence, poundsToPence } from './format'

describe('format', () => {
  it('shows pence as pounds', () => {
    expect(formatPence(240_000)).toBe('£2,400.00')
    expect(formatPence(8)).toBe('£0.08')
  })

  it('shows minutes as hours and minutes', () => {
    expect(formatMinutes(85)).toBe('1h 25m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(-90)).toBe('-1h 30m')
  })

  it('turns typed pounds into exact pence', () => {
    expect(poundsToPence(18.1)).toBe(1810)
    expect(poundsToPence(0.29)).toBe(29)
  })
})
