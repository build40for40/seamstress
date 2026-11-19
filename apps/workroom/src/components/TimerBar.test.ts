import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { dismissToast, me, timer } from '@/composables/useWorkroom'
import type { Me, Timer } from '@/types'
import TimerBar from './TimerBar.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:any(.*)*', name: 'garment-photo', component: { template: '<div />' } }],
})

const bea: Me = {
  id: 'm1',
  name: 'Bea Fake',
  role: 'seamstress',
  timeZone: 'Europe/London',
  team: { name: 'Needle & Thread Atelier', showPayEstimate: true },
  today: '2026-11-19',
  timer: null,
}

function running(overrides: Partial<Timer> = {}): Timer {
  return {
    id: 't1',
    garmentId: 'g1',
    kind: 'sewing',
    dateLocal: '2026-11-19',
    minutes: null,
    startedAt: new Date(Date.now() - 85 * 60_000).toISOString(),
    endedAt: null,
    note: null,
    reviewStatus: 'waiting',
    invoiced: false,
    locked: false,
    garmentRef: 'SE-1003-A',
    needsCheck: false,
    ...overrides,
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('TimerBar', () => {
  beforeEach(() => {
    me.value = bea
  })

  afterEach(() => {
    timer.value = null
    dismissToast()
    vi.unstubAllGlobals()
  })

  it('shows the garment, the ticking time and Stop while running', () => {
    timer.value = running()
    const bar = mount(TimerBar, { global: { plugins: [router] } })
    expect(bar.text()).toContain('SE-1003-A')
    expect(bar.text()).toMatch(/1:2[45]:\d\d/)
    expect(bar.text()).toContain('Sewing')
    expect(bar.find('button.stop').exists()).toBe(true)
  })

  it('saves on Stop and offers Undo and Add photo', async () => {
    const entry = { ...running(), minutes: 85, endedAt: new Date().toISOString(), needsCheck: undefined }
    const fetch = vi.fn(async () => json({ entry, discarded: false }))
    vi.stubGlobal('fetch', fetch)
    timer.value = running()
    const bar = mount(TimerBar, { global: { plugins: [router] } })

    await bar.find('button.stop').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith('/api/me/timer/stop', expect.objectContaining({ method: 'POST' }))
    expect(timer.value).toBeNull()
    expect(bar.text()).toContain('Saved 1h 25m on SE-1003-A')
    expect(bar.text()).toContain('Undo')
    expect(bar.text()).toContain('Add photo')
  })

  it('asks "Still going?" when the timer ran past her midnight, and lets her pick the stop time', async () => {
    timer.value = running({ startedAt: '2026-11-18T09:05:00Z', needsCheck: true })
    const bar = mount(TimerBar, { global: { plugins: [router] } })
    expect(bar.text()).toContain('Still going?')
    expect(bar.text()).toContain('Started 9:05')

    const pick = bar.findAll('button').find((button) => button.text() === 'I stopped at…')!
    await pick.trigger('click')
    expect(bar.find('input[type="date"]').exists()).toBe(true)
    expect(bar.find('input[type="time"]').exists()).toBe(true)
  })
})
