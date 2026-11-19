<script setup lang="ts">
import type { EntryKind } from '@seamless/shared'
import { formatMinutes } from '@seamless/shared/format'
import { monthOf } from '@seamless/shared/time'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Glyph from '@/components/Glyph.vue'
import { api, errorMessage } from '@/composables/useApi'
import { KIND_CYCLE, KIND_LABELS, changes, me, showToast } from '@/composables/useWorkroom'
import { formatMonthName, formatRelativeDay, formatShortDay } from '@/lib/dates'
import type { Entry, GarmentDetail, MyTimesheet } from '@/types'

const props = defineProps<{ garmentId: string | null; entryId: string | null }>()
const router = useRouter()

const STEP = 15
const MAX_MINUTES = 16 * 60

const detail = ref<GarmentDetail | null>(null)
const editing = ref<Entry | null>(null)
const minutes = ref(60)
const kind = ref<EntryKind>(props.garmentId ? 'sewing' : 'waiting')
const dateLocal = ref(me.value!.today)
const note = ref('')
const changingDate = ref(false)
const saving = ref(false)
const error = ref('')
const saved = ref<Entry | null>(null)
const madeMinutes = ref<number | null>(null)

const today = computed(() => me.value!.today)
const garment = computed(() => detail.value?.garment ?? null)
const backTo = computed(() =>
  props.garmentId ? { name: 'garment', params: { id: props.garmentId } } : { name: 'my-orders' },
)
const backLabel = computed(() => (props.garmentId ? (garment.value?.description ?? 'Back') : 'My orders'))
const whenLabel = computed(() => {
  const relative = formatRelativeDay(dateLocal.value, today.value)
  const day = formatShortDay(dateLocal.value)
  return relative === day ? day : `${relative[0]!.toUpperCase()}${relative.slice(1)}, ${day}`
})

function fill(entry: Entry) {
  editing.value = entry
  minutes.value = entry.minutes ?? 60
  kind.value = entry.kind
  dateLocal.value = entry.dateLocal
  note.value = entry.note ?? ''
}

async function load() {
  if (!props.garmentId) return
  try {
    detail.value = await api<GarmentDetail>(`/me/garments/${props.garmentId}`)
    const entry = props.entryId ? detail.value.entries.find((candidate) => candidate.id === props.entryId) : null
    if (props.entryId && (!entry || entry.locked || entry.minutes === null)) {
      showToast({ message: "That entry can't be changed from here.", tone: 'warn' })
      router.replace(backTo.value)
      return
    }
    if (entry) fill({ ...entry, garmentRef: detail.value.garment.ref })
  } catch (caught) {
    error.value = errorMessage(caught)
  }
}

watch(() => [props.garmentId, props.entryId], load, { immediate: true })

const step = (direction: 1 | -1) => {
  const next = direction > 0 ? Math.floor(minutes.value / STEP) * STEP + STEP : Math.ceil(minutes.value / STEP) * STEP - STEP
  minutes.value = Math.min(MAX_MINUTES, Math.max(STEP, next))
}

async function madeSoFar(entry: Entry) {
  if (entry.garmentId) {
    const fresh = await api<GarmentDetail>(`/me/garments/${entry.garmentId}`)
    detail.value = fresh
    return fresh.garment.myMinutes
  }
  const { timesheet } = await api<{ timesheet: MyTimesheet }>(`/me/timesheet?month=${monthOf(entry.dateLocal)}`)
  return timesheet.generalMinutes
}

async function save() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  const body = { kind: kind.value, dateLocal: dateLocal.value, minutes: minutes.value, note: note.value.trim() || undefined }
  try {
    const { entry } = editing.value
      ? await api<{ entry: Entry }>(`/me/entries/${editing.value.id}`, {
          method: 'PATCH',
          json: { ...body, note: note.value.trim() || null },
        })
      : await api<{ entry: Entry }>('/me/entries', { method: 'POST', json: { ...body, garmentId: props.garmentId } })
    saved.value = { ...entry, garmentRef: entry.garmentRef ?? garment.value?.ref ?? null }
    changes.value++
    madeMinutes.value = null
    madeMinutes.value = await madeSoFar(entry).catch(() => null)
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!editing.value || saving.value) return
  saving.value = true
  try {
    await api(`/me/entries/${editing.value.id}`, { method: 'DELETE' })
    changes.value++
    showToast({ message: 'Deleted. Like it never happened.', tone: 'note' }, 3000)
    router.replace(backTo.value)
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    saving.value = false
  }
}

function fixIt() {
  if (!saved.value) return
  fill(saved.value)
  saved.value = null
}

function addPhoto() {
  if (props.garmentId) router.push({ name: 'garment-photo', params: { id: props.garmentId } })
}
</script>

<template>
  <template v-if="saved">
    <section class="saved">
      <div class="badge"><Glyph name="check" :size="30" /></div>
      <h1 class="title">Noted. Not a minute missed</h1>
      <p class="aside">I don't get these wrong. Check anyway.</p>
    </section>

    <section class="card readback">
      <div class="row">
        <span class="muted">Time</span>
        <span class="value number">{{ formatMinutes(saved.minutes ?? 0) }}</span>
      </div>
      <div class="row stitched">
        <span class="muted">What</span>
        <span class="value">{{ KIND_LABELS[saved.kind] }}</span>
      </div>
      <div class="row stitched">
        <span class="muted">{{ saved.garmentId ? 'Garment' : 'Order' }}</span>
        <span class="value">{{ saved.garmentRef ?? 'None, general time' }}</span>
      </div>
      <div class="row stitched">
        <span class="muted">When</span>
        <span class="value">{{ formatShortDay(saved.dateLocal) }}</span>
      </div>
    </section>

    <p v-if="saved.garmentId && madeMinutes !== null" class="muted">
      That makes {{ formatMinutes(madeMinutes) }} of yours on this garment.
    </p>
    <p v-else-if="!saved.garmentId" class="muted">
      You're paid for this and no client is billed.
      <template v-if="madeMinutes !== null">
        That makes {{ formatMinutes(madeMinutes) }} of general time in {{ formatMonthName(monthOf(saved.dateLocal)) }}.
      </template>
    </p>

    <button type="button" class="link-button" @click="fixIt"><Glyph name="scissors" />Not quite right? Fix it</button>

    <div class="footer">
      <button v-if="saved.garmentId" type="button" class="btn btn-primary" @click="addPhoto">Add a photo</button>
      <RouterLink :to="{ name: 'my-orders' }" class="btn" :class="{ 'btn-primary': !saved.garmentId }">
        Back to my orders
      </RouterLink>
    </div>
  </template>

  <form v-else class="form" @submit.prevent="save">
    <RouterLink :to="backTo" class="back"><Glyph name="back" :size="18" />{{ backLabel }}</RouterLink>

    <header class="stack heading">
      <span class="tag">{{ garmentId ? (garment?.ref ?? '…') : 'General time' }}</span>
      <h1 class="title">{{ editing ? 'Fix it' : 'Clock it' }}</h1>
    </header>

    <div v-if="error" class="alert" role="alert">
      <Glyph name="alert" :size="22" />
      <span><strong>That didn't save</strong>{{ error }}</span>
    </div>

    <section class="card">
      <h2 class="section-label">How long?</h2>
      <div class="stepper">
        <button type="button" class="step" aria-label="Quarter of an hour less" :disabled="minutes <= STEP" @click="step(-1)">
          &minus;
        </button>
        <output class="amount number" aria-live="polite">{{ formatMinutes(minutes) }}</output>
        <button type="button" class="step" aria-label="Quarter of an hour more" :disabled="minutes >= MAX_MINUTES" @click="step(1)">
          +
        </button>
      </div>
    </section>

    <section v-if="garmentId" class="stack gap">
      <h2 class="section-label">What was it?</h2>
      <div class="choices">
        <button
          v-for="option in KIND_CYCLE"
          :key="option"
          type="button"
          class="choice"
          :aria-pressed="kind === option"
          @click="kind = option"
        >
          {{ KIND_LABELS[option] }}
        </button>
      </div>
    </section>
    <p v-else class="card muted">Waiting, with no order. You're paid for it, and no client is ever billed.</p>

    <section class="card when">
      <div class="row">
        <div class="stack">
          <span class="section-label">When?</span>
          <span class="strong">{{ whenLabel }}</span>
        </div>
        <button v-if="!changingDate" type="button" class="link-button" @click="changingDate = true">Change</button>
      </div>
      <label v-if="changingDate" class="stack gap">
        <span class="visually-hidden">Day</span>
        <input v-model="dateLocal" class="field" type="date" :max="today" required />
      </label>
    </section>

    <label class="stack gap">
      <span class="section-label">Anything I should know?</span>
      <textarea v-model="note" class="field" rows="2" maxlength="500" placeholder="Fitting for the cuffs" />
    </label>

    <div class="footer">
      <button type="submit" class="btn btn-primary" :disabled="saving || (garmentId !== null && !garment)">
        Save {{ formatMinutes(minutes) }}
      </button>
      <button v-if="editing" type="button" class="link-button delete" :disabled="saving" @click="remove">
        Delete this entry
      </button>
    </div>
  </form>
</template>

<style scoped>
.form {
  display: contents;
}

.heading {
  gap: 8px;
}

.gap {
  gap: 8px;
}

.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.step {
  flex: none;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  border: 1.5px solid var(--ink);
  background: var(--paper);
  font-size: 30px;
  line-height: 1;
}

.step:disabled {
  opacity: 0.4;
}

.amount {
  font-family: var(--serif);
  font-size: 40px;
  font-weight: 600;
  line-height: 1;
  text-align: center;
}

.when .row {
  min-height: 44px;
}

.saved {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 40px;
}

.badge {
  width: 60px;
  height: 60px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
}

.readback {
  gap: 0;
  padding: 4px 16px;
}

.readback .row {
  min-height: 52px;
  padding-top: 0;
}

.value {
  font-size: 17px;
  font-weight: 600;
  text-align: right;
}

.delete {
  align-self: center;
  color: var(--muted);
}
</style>
