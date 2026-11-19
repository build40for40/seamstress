<script setup lang="ts">
import { formatMinutes } from '@seamstress/shared/format'
import { monthOf } from '@seamstress/shared/time'
import { computed, ref, watch } from 'vue'
import Glyph from '@/components/Glyph.vue'
import { api, errorMessage } from '@/composables/useApi'
import { busy, changes, me, startTimer, stopTimer, timer } from '@/composables/useWorkroom'
import { formatLongDay, formatMonthName, greeting } from '@/lib/dates'
import { FLAG_LABELS, STAGE_LABELS, countWords, dueText } from '@/lib/labels'
import type { MyOrder, MyTimesheet } from '@/types'

const orders = ref<MyOrder[] | null>(null)
const monthMinutes = ref<number | null>(null)
const error = ref('')

const today = computed(() => me.value!.today)
const month = computed(() => monthOf(today.value))
const firstName = computed(() => me.value!.name.split(' ')[0])
const hello = computed(() => `${greeting(new Date(), me.value!.timeZone)}, ${firstName.value}`)

const aside = computed(() => {
  const count = orders.value?.length ?? 0
  if (!orders.value) return 'Let me see what is on your table.'
  if (count === 0) return 'Nothing on your table. Put the kettle on.'
  return `${countWords(count, 'order', 'orders')} on your table. Make ${count === 1 ? 'it' : 'them'} gorgeous.`
})

async function load() {
  try {
    const [list, sheet] = await Promise.all([
      api<{ orders: MyOrder[] }>('/me/orders'),
      api<{ timesheet: MyTimesheet }>(`/me/timesheet?month=${month.value}`),
    ])
    orders.value = list.orders
    monthMinutes.value = sheet.timesheet.totalMinutes
    error.value = ''
  } catch (caught) {
    error.value = errorMessage(caught)
  }
}

watch(changes, load, { immediate: true })

const runningOn = (garmentId: string | null) => timer.value !== null && timer.value.garmentId === garmentId
</script>

<template>
  <header class="hello">
    <div class="row">
      <div class="stack">
        <span class="brand">Seamless</span>
        <p class="muted small">{{ formatLongDay(today) }}</p>
      </div>
      <Glyph name="machine" :size="76" class="machine" />
    </div>
    <h1 class="title title-big">{{ hello }}</h1>
    <p class="aside">{{ aside }}</p>
  </header>

  <div v-if="error" class="alert" role="alert">
    <Glyph name="alert" :size="22" />
    <span><strong>Couldn't load your orders</strong>{{ error }}</span>
  </div>

  <article v-for="order in orders" :key="order.id" class="card order">
    <div class="row">
      <span class="tag">{{ order.number }}</span>
      <span class="muted small">{{ dueText(order.dueDate, today) }}</span>
    </div>
    <div v-if="order.express || order.dueFlag" class="flags">
      <span v-if="order.express" class="flag flag-express">Express</span>
      <span v-if="order.dueFlag" class="flag" :class="order.dueFlag === 'overdue' ? 'flag-overdue' : 'flag-soon'">
        {{ FLAG_LABELS[order.dueFlag] }}
      </span>
    </div>
    <h2 class="order-title">{{ order.description }}</h2>

    <div v-for="garment in order.garments" :key="garment.id" class="garment stitched">
      <RouterLink :to="{ name: 'garment', params: { id: garment.id } }" class="garment-link">
        <span class="row">
          <span class="tag tag-small">{{ garment.ref }}</span>
          <span class="stage">{{ STAGE_LABELS[garment.status] }}</span>
        </span>
        <span class="garment-name">{{ garment.description }}</span>
        <span class="muted small">Your hours {{ formatMinutes(garment.myMinutes) }}</span>
      </RouterLink>
      <button
        v-if="runningOn(garment.id)"
        type="button"
        class="btn btn-dark start"
        :disabled="busy"
        @click="stopTimer()"
      >
        Stop
      </button>
      <button
        v-else
        type="button"
        class="btn btn-primary start"
        :disabled="busy"
        :aria-label="`Start ${garment.ref}`"
        @click="startTimer(garment.id)"
      >
        Start
      </button>
    </div>

    <p v-if="order.otherGarments > 0" class="muted small">
      +{{ order.otherGarments }} other {{ order.otherGarments === 1 ? 'garment' : 'garments' }}
    </p>
  </article>

  <article class="card">
    <div class="row">
      <div class="stack">
        <h2 class="general-title">General time</h2>
        <span class="muted small">Waiting, no order. Paid, never billed.</span>
      </div>
      <button v-if="runningOn(null)" type="button" class="btn btn-dark start" :disabled="busy" @click="stopTimer()">
        Stop
      </button>
      <button v-else type="button" class="btn btn-primary start" :disabled="busy" @click="startTimer(null)">Start</button>
    </div>
    <RouterLink :to="{ name: 'general-time' }" class="link-button">Forgot to time it? Type it in</RouterLink>
  </article>

  <RouterLink :to="{ name: 'timesheet' }" class="card timesheet-link">
    <span class="row">
      <span class="stack">
        <span class="strong">My timesheet</span>
        <span class="muted small">
          {{ formatMonthName(month) }}: {{ monthMinutes === null ? '…' : formatMinutes(monthMinutes) }}
        </span>
      </span>
      <Glyph name="spool" :size="24" class="spool" />
    </span>
  </RouterLink>
</template>

<style scoped>
.hello {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 12px;
}

.machine {
  color: var(--claret);
  flex: none;
}

.flags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.order-title {
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.garment {
  display: flex;
  align-items: center;
  gap: 12px;
}

.garment-link {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.garment-link .row {
  justify-content: flex-start;
  gap: 8px;
}

.garment-name {
  font-size: 16px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.stage {
  font-family: var(--serif);
  font-style: italic;
  font-size: 15px;
  color: var(--claret);
  white-space: nowrap;
}

.start {
  flex: none;
  min-width: 92px;
  min-height: 56px;
}

.general-title {
  font-size: 16px;
  font-weight: 600;
}

.timesheet-link .spool {
  color: var(--claret);
}
</style>
