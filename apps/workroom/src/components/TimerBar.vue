<script setup lang="ts">
import { localDate, timerNeedsCheck } from '@seamless/shared/time'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import Glyph from '@/components/Glyph.vue'
import {
  KIND_LABELS,
  busy,
  cycleSavedKind,
  cycleTimerKind,
  dismissToast,
  me,
  stopTimer,
  timer,
  toast,
  undoEntry,
} from '@/composables/useWorkroom'
import { clockInput, startedLabel, stopwatch, zonedToUtc } from '@/lib/dates'

const router = useRouter()
const now = ref(Date.now())
const picking = ref(false)
const stopDate = ref('')
const stopTime = ref('')
const pickError = ref('')
const dock = useTemplateRef<HTMLElement>('dock')

const timeZone = computed(() => me.value?.timeZone ?? 'Europe/London')
const elapsed = computed(() => (timer.value?.startedAt ? stopwatch(now.value - Date.parse(timer.value.startedAt)) : ''))
const needsCheck = computed(() => {
  const startedAt = timer.value?.startedAt
  if (!startedAt) return false
  return timer.value!.needsCheck || timerNeedsCheck(startedAt, new Date(now.value), timeZone.value)
})
const started = computed(() => (timer.value?.startedAt ? startedLabel(timer.value.startedAt, timeZone.value, new Date(now.value)) : ''))
const what = computed(() => timer.value?.garmentRef ?? 'General time')
const today = computed(() => localDate(new Date(now.value), timeZone.value))

let tick: ReturnType<typeof setInterval> | undefined
watch(
  () => timer.value?.id,
  (id) => {
    clearInterval(tick)
    picking.value = false
    if (id) {
      now.value = Date.now()
      tick = setInterval(() => (now.value = Date.now()), 1000)
    }
  },
  { immediate: true },
)

let observer: ResizeObserver | undefined
onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    const height = entry ? Math.ceil(entry.contentRect.height) : 0
    document.documentElement.style.setProperty('--bar-space', `${height}px`)
  })
  if (dock.value) observer.observe(dock.value)
})

onBeforeUnmount(() => {
  clearInterval(tick)
  observer?.disconnect()
  document.documentElement.style.removeProperty('--bar-space')
})

function pickStop() {
  const startedAt = timer.value?.startedAt
  if (!startedAt) return
  const guess = new Date(Math.min(Date.parse(startedAt) + 60 * 60_000, Date.now()))
  stopDate.value = localDate(guess, timeZone.value)
  stopTime.value = clockInput(guess, timeZone.value)
  pickError.value = ''
  picking.value = true
}

async function saveStop() {
  const startedAt = timer.value?.startedAt
  if (!startedAt || !stopDate.value || !stopTime.value) return
  const endedAt = zonedToUtc(stopDate.value, stopTime.value, timeZone.value)
  if (Date.parse(endedAt) <= Date.parse(startedAt)) {
    pickError.value = 'That was before the timer started.'
    return
  }
  if (Date.parse(endedAt) > Date.now()) {
    pickError.value = "That time hasn't happened yet."
    return
  }
  await stopTimer(endedAt)
}

function addPhoto(garmentId: string) {
  dismissToast()
  router.push({ name: 'garment-photo', params: { id: garmentId } })
}
</script>

<template>
  <div ref="dock" class="dock" aria-live="polite">
    <div v-if="toast" :key="toast.id" class="toast" :class="`toast-${toast.tone}`" role="status">
      <div class="toast-message">
        <Glyph v-if="toast.tone === 'saved'" name="check" :size="18" />
        <Glyph v-else-if="toast.tone === 'warn'" name="alert" :size="18" />
        <span>{{ toast.message }}</span>
      </div>
      <div v-if="toast.entry" class="toast-actions">
        <button
          v-if="toast.entry.garmentId"
          type="button"
          class="chip"
          :disabled="busy"
          :aria-label="`Saved as ${KIND_LABELS[toast.entry.kind]}. Tap to change`"
          @click="cycleSavedKind(toast.entry)"
        >
          {{ KIND_LABELS[toast.entry.kind] }}
        </button>
        <button v-if="toast.entry.garmentId" type="button" class="toast-link" @click="addPhoto(toast.entry.garmentId)">
          Add photo
        </button>
        <button type="button" class="toast-link" :disabled="busy" @click="undoEntry(toast.entry)">Undo</button>
      </div>
    </div>

    <section v-if="timer && needsCheck" class="bar bar-check" aria-label="Forgotten timer">
      <div class="stack">
        <span class="check-title">Still going?</span>
        <span class="small">{{ started }} on {{ what }}</span>
      </div>
      <form v-if="picking" class="pick" @submit.prevent="saveStop">
        <div class="pick-fields">
          <label class="pick-field">
            <span class="small strong">Day</span>
            <input v-model="stopDate" class="field" type="date" :max="today" required />
          </label>
          <label class="pick-field">
            <span class="small strong">Time</span>
            <input v-model="stopTime" class="field" type="time" required />
          </label>
        </div>
        <p v-if="pickError" class="small strong" role="alert">{{ pickError }}</p>
        <div class="pick-actions">
          <button type="submit" class="btn btn-small btn-dark" :disabled="busy">Save that time</button>
          <button type="button" class="btn btn-small" @click="picking = false">Cancel</button>
        </div>
      </form>
      <div v-else class="pick-actions">
        <button type="button" class="btn btn-small btn-dark" :disabled="busy" @click="stopTimer()">Stop now</button>
        <button type="button" class="btn btn-small" @click="pickStop">I stopped at…</button>
      </div>
    </section>

    <section v-else-if="timer" class="bar" aria-label="Timer">
      <div class="stack running">
        <span class="bar-what">{{ what }}</span>
        <span class="bar-time number" role="timer">{{ elapsed }}</span>
      </div>
      <button
        v-if="timer.garmentId"
        type="button"
        class="chip chip-dark"
        :disabled="busy"
        :aria-label="`${KIND_LABELS[timer.kind]}. Tap to change`"
        @click="cycleTimerKind"
      >
        {{ KIND_LABELS[timer.kind] }}
      </button>
      <span v-else class="chip chip-dark chip-still">Waiting</span>
      <button type="button" class="stop" :disabled="busy" @click="stopTimer()">Stop</button>
    </section>
  </div>
</template>

<style scoped>
.dock {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.dock > * {
  pointer-events: auto;
}

.toast {
  margin: 0 12px;
  padding: 12px 14px;
  border-radius: 6px;
  background: var(--paper);
  border: 1px solid var(--edge);
  box-shadow: 0 6px 24px rgba(43, 27, 51, 0.18);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dock > .toast:last-child {
  margin-bottom: calc(12px + env(safe-area-inset-bottom));
}

.toast-warn {
  background: var(--warn-ground);
  border-color: var(--warn-edge);
  color: var(--warn-ink);
}

.toast-message {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.toast-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.toast-link {
  min-height: 44px;
  padding: 0 10px;
  border: 0;
  background: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--claret);
}

.chip {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1.5px dashed var(--label-edge);
  background: var(--blush);
  color: var(--claret-ink);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.chip-dark {
  min-height: 44px;
  border-color: rgba(255, 255, 255, 0.5);
  background: transparent;
  color: var(--paper);
}

.chip-still {
  display: inline-flex;
  align-items: center;
}

.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--ink);
  color: var(--paper);
  border-top: 2px dashed var(--label-edge);
}

.running {
  flex: 1;
}

.bar-what {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-time {
  font-family: var(--serif);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
}

.stop {
  min-height: 48px;
  min-width: 80px;
  padding: 0 16px;
  border: 0;
  border-radius: 6px;
  background: var(--claret);
  color: var(--paper);
  font-size: 17px;
  font-weight: 600;
  outline: 1.5px dashed rgba(255, 255, 255, 0.6);
  outline-offset: -5px;
}

.bar-check {
  flex-direction: column;
  align-items: stretch;
  background: var(--warn-ground);
  color: var(--warn-ink);
  border-top: 2px solid var(--warn-edge);
}

.check-title {
  font-family: var(--serif);
  font-style: italic;
  font-size: 20px;
  font-weight: 600;
}

.pick {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pick-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.pick-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pick-field .field {
  min-height: 48px;
  padding: 8px 10px;
}

.pick-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}
</style>
