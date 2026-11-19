import type { GarmentEntryKind } from '@seamstress/shared'
import { formatMinutes } from '@seamstress/shared/format'
import { ref } from 'vue'
import type { Entry, Me, Timer } from '@/types'
import { ApiError, api, errorMessage } from './useApi'

export interface Toast {
  id: number
  message: string
  tone: 'saved' | 'note' | 'warn'
  entry?: Entry
}

export const me = ref<Me | null>(null)
export const meError = ref<string | null>(null)
export const timer = ref<Timer | null>(null)
export const toast = ref<Toast | null>(null)
export const changes = ref(0)
export const busy = ref(false)

export const KIND_LABELS = { sewing: 'Sewing', fitting: 'Fitting', tidying: 'Tidying up', waiting: 'Waiting' } as const
export const KIND_CYCLE: GarmentEntryKind[] = ['sewing', 'fitting', 'tidying']

export const nextKind = (kind: string): GarmentEntryKind =>
  KIND_CYCLE[(KIND_CYCLE.indexOf(kind as GarmentEntryKind) + 1) % KIND_CYCLE.length]!

const TOAST_MS = 6000
let toastCount = 0
let toastTimeout: ReturnType<typeof setTimeout> | undefined

export function showToast(next: Omit<Toast, 'id'>, ms = TOAST_MS) {
  clearTimeout(toastTimeout)
  toast.value = { ...next, id: ++toastCount }
  toastTimeout = setTimeout(dismissToast, ms)
}

export function dismissToast() {
  clearTimeout(toastTimeout)
  toast.value = null
}

export function savedMessage(entry: Entry) {
  const time = formatMinutes(entry.minutes ?? 0)
  return entry.garmentRef ? `Saved ${time} on ${entry.garmentRef}` : `Saved ${time} of general time`
}

const showSaved = (entry: Entry) => showToast({ message: savedMessage(entry), tone: 'saved', entry })

const changed = () => changes.value++

let loadingMe: Promise<void> | null = null

export function loadMe() {
  loadingMe ??= api<Me>('/me')
    .then((data) => {
      me.value = data
      timer.value = data.timer
      meError.value = null
    })
    .catch((error) => {
      meError.value = errorMessage(error)
    })
    .finally(() => {
      loadingMe = null
    })
  return loadingMe
}

async function act(work: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  try {
    await work()
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) await loadMe()
    showToast({ message: errorMessage(error), tone: 'warn' })
  } finally {
    busy.value = false
  }
}

export const startTimer = (garmentId: string | null) =>
  act(async () => {
    const result = await api<{ timer: Timer; stopped: Entry | null; discarded: boolean }>('/me/timer', {
      method: 'POST',
      json: { garmentId },
    })
    timer.value = result.timer
    if (result.stopped) showSaved(result.stopped)
    else if (result.discarded) showToast({ message: "The last one was under a minute, so I didn't keep it.", tone: 'note' })
    changed()
  })

export const stopTimer = (endedAt?: string) =>
  act(async () => {
    const result = await api<{ entry: Entry | null; discarded: boolean; message?: string }>('/me/timer/stop', {
      method: 'POST',
      json: endedAt ? { endedAt } : {},
    })
    timer.value = null
    if (result.entry) showSaved(result.entry)
    else showToast({ message: result.message ?? "Under a minute, so I didn't keep it.", tone: 'note' })
    changed()
  })

export const cycleTimerKind = () =>
  act(async () => {
    if (!timer.value?.garmentId) return
    const result = await api<{ timer: Timer }>('/me/timer', { method: 'PATCH', json: { kind: nextKind(timer.value.kind) } })
    timer.value = result.timer
  })

export const cycleSavedKind = (entry: Entry) =>
  act(async () => {
    const result = await api<{ entry: Entry }>(`/me/entries/${entry.id}`, {
      method: 'PATCH',
      json: { kind: nextKind(entry.kind) },
    })
    showSaved({ ...result.entry, garmentRef: result.entry.garmentRef ?? entry.garmentRef })
    changed()
  })

export const undoEntry = (entry: Entry) =>
  act(async () => {
    await api(`/me/entries/${entry.id}`, { method: 'DELETE' })
    showToast({ message: 'Undone. Like it never happened.', tone: 'note' }, 3000)
    changed()
  })

export function useWorkroom() {
  return { me, meError, timer, toast, changes, busy }
}
