<script setup lang="ts">
import { LOCK_MESSAGES, type GarmentStatus } from '@seamstress/shared'
import { formatMinutes } from '@seamstress/shared/format'
import { GARMENT_STATUSES } from '@seamstress/shared/types'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AuthPhoto from '@/components/AuthPhoto.vue'
import Glyph from '@/components/Glyph.vue'
import { ApiError, api, errorMessage } from '@/composables/useApi'
import { KIND_LABELS, busy, changes, me, showToast, startTimer, stopTimer, timer } from '@/composables/useWorkroom'
import { formatShortDay } from '@/lib/dates'
import { GARMENT_MOVES, STAGE_LABELS, dueText } from '@/lib/labels'
import type { Entry, GarmentDetail, MyGarment } from '@/types'

const props = defineProps<{ id: string }>()
const router = useRouter()

const detail = ref<GarmentDetail | null>(null)
const error = ref('')
const moving = ref(false)

const today = computed(() => me.value!.today)
const garment = computed(() => detail.value?.garment)
const running = computed(() => timer.value !== null && timer.value.garmentId === props.id)
const entries = computed(() =>
  [...(detail.value?.entries ?? [])].sort((a, b) => b.dateLocal.localeCompare(a.dateLocal) || (b.startedAt ?? '').localeCompare(a.startedAt ?? '')),
)
const photos = computed(() => [...(detail.value?.photos ?? [])].sort((a, b) => a.takenOn.localeCompare(b.takenOn)))

async function load() {
  try {
    detail.value = await api<GarmentDetail>(`/me/garments/${props.id}`)
    error.value = ''
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      showToast({ message: caught.message, tone: 'warn' })
      router.replace({ name: 'my-orders' })
      return
    }
    error.value = errorMessage(caught)
  }
}

watch([() => props.id, changes], load, { immediate: true })

const canMove = (to: GarmentStatus) => {
  const from = garment.value?.status
  return from === to || (from !== undefined && GARMENT_MOVES[from].includes(to))
}

async function move(to: GarmentStatus) {
  if (!garment.value || garment.value.status === to || moving.value) return
  moving.value = true
  try {
    const result = await api<{ garment: MyGarment }>(`/me/garments/${props.id}/status`, { method: 'PATCH', json: { status: to } })
    detail.value = { ...detail.value!, garment: result.garment }
    if (to === 'done') showToast({ message: 'Done and dusted. The atelier can see it.', tone: 'note' })
  } catch (caught) {
    showToast({ message: errorMessage(caught), tone: 'warn' })
  } finally {
    moving.value = false
  }
}

function entryNote(entry: Entry) {
  return [KIND_LABELS[entry.kind], entry.note].filter(Boolean).join('. ')
}

function entryState(entry: Entry) {
  if (entry.minutes === null) return 'Timer running'
  if (entry.invoiced) return 'On a sent invoice'
  if (entry.locked) return 'Timesheet sent'
  if (entry.reviewStatus === 'held_back') return 'Held back by the atelier'
  return null
}

function openEntry(entry: Entry) {
  if (entry.minutes === null) return
  if (entry.locked) {
    showToast({ message: LOCK_MESSAGES[entry.invoiced ? 'invoice' : 'timesheet'], tone: 'warn' })
    return
  }
  router.push({ name: 'garment-time', params: { id: props.id }, query: { entry: entry.id } })
}
</script>

<template>
  <RouterLink :to="{ name: 'my-orders' }" class="back"><Glyph name="back" :size="18" />My orders</RouterLink>

  <div v-if="error" class="alert" role="alert">
    <Glyph name="alert" :size="22" />
    <span><strong>Couldn't open that garment</strong>{{ error }}</span>
  </div>

  <template v-if="detail && garment">
    <header class="stack heading">
      <div class="labels">
        <span class="tag">{{ garment.ref }}</span>
        <span v-if="detail.order.express" class="flag flag-express">Express</span>
      </div>
      <h1 class="title">{{ garment.description }}</h1>
      <p class="muted small">{{ detail.order.number }}. {{ dueText(detail.order.dueDate, today) }}</p>
    </header>

    <button v-if="running" type="button" class="btn btn-dark btn-block" :disabled="busy" @click="stopTimer()">
      Stop the timer
    </button>
    <button v-else type="button" class="btn btn-primary btn-block" :disabled="busy" @click="startTimer(garment.id)">
      Start the timer
    </button>

    <section class="card">
      <h2 class="section-label">The brief</h2>
      <p class="brief">{{ detail.order.description }}</p>
      <p class="brief stitched">{{ garment.description }}</p>
    </section>

    <section class="stack gap">
      <h2 class="section-label">Where it's up to</h2>
      <div class="choices" style="--count: 4">
        <button
          v-for="stage in GARMENT_STATUSES"
          :key="stage"
          type="button"
          class="choice stage"
          :aria-pressed="garment.status === stage"
          :disabled="moving || !canMove(stage)"
          @click="move(stage)"
        >
          {{ STAGE_LABELS[stage] }}
        </button>
      </div>
    </section>

    <section class="stack gap">
      <h2 class="section-label">Photos</h2>
      <div class="photos">
        <figure v-for="photo in photos" :key="photo.id" class="photo">
          <AuthPhoto :url="photo.url" :alt="photo.caption ?? `Photo of ${garment.ref}`" />
          <figcaption>
            <span class="strong">{{ photo.caption ?? (photo.label ? photo.label[0]!.toUpperCase() + photo.label.slice(1) : 'Photo') }}</span>
            <span>{{ formatShortDay(photo.takenOn) }}</span>
          </figcaption>
        </figure>
        <RouterLink :to="{ name: 'garment-photo', params: { id: garment.id } }" class="photo photo-add">
          <Glyph name="plus" :size="22" />
          <span>Add photo</span>
        </RouterLink>
      </div>
    </section>

    <section class="card">
      <div class="row">
        <h2 class="section-label">Your hours on this one</h2>
        <span class="hours number">{{ formatMinutes(garment.myMinutes) }}</span>
      </div>
      <p v-if="entries.length === 0" class="muted small stitched">Nothing yet. Start the timer and I'll keep count.</p>
      <button
        v-for="entry in entries"
        :key="entry.id"
        type="button"
        class="entry stitched"
        :class="{ 'entry-locked': entry.locked }"
        @click="openEntry(entry)"
      >
        <span class="stack">
          <span class="strong">{{ formatShortDay(entry.dateLocal) }}</span>
          <span class="muted small">{{ entryNote(entry) }}</span>
          <span v-if="entryState(entry)" class="muted small state">
            <Glyph v-if="entry.locked" name="lock" :size="14" />{{ entryState(entry) }}
          </span>
        </span>
        <span class="strong number">{{ entry.minutes === null ? '…' : formatMinutes(entry.minutes) }}</span>
      </button>
    </section>

    <div class="footer">
      <div class="choices" style="--count: 2">
        <RouterLink :to="{ name: 'garment-time', params: { id: garment.id } }" class="btn btn-primary">Add time</RouterLink>
        <RouterLink :to="{ name: 'garment-photo', params: { id: garment.id } }" class="btn">Add photo</RouterLink>
      </div>
    </div>
  </template>
</template>

<style scoped>
.heading {
  gap: 8px;
}

.labels {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.brief {
  font-size: 16px;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.gap {
  gap: 8px;
}

.stage {
  font-size: 14px;
  line-height: 1.2;
}

.photos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.photo {
  margin: 0;
  position: relative;
  height: 104px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--swatch);
}

.photo figcaption {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  font-size: 12px;
  background: linear-gradient(transparent, rgba(251, 246, 244, 0.95) 40%);
  overflow: hidden;
}

.photo figcaption span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: none;
  border: 1.5px dashed #a8949c;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.hours {
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 600;
}

.entry {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  margin: 0;
  border: 0;
  border-top: 1.5px dashed var(--stitch);
  background: none;
  text-align: left;
  font-size: 15px;
}

.entry .stack {
  overflow-wrap: anywhere;
}

.state {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
