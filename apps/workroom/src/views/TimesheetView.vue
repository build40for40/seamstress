<script setup lang="ts">
import { formatMinutes, formatPence } from '@seamless/shared/format'
import { addMonths, localDate, monthOf } from '@seamless/shared/time'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Glyph from '@/components/Glyph.vue'
import { api, errorMessage } from '@/composables/useApi'
import { changes, me } from '@/composables/useWorkroom'
import { formatMonth, formatMonthName, formatShortDay } from '@/lib/dates'
import type { MyTimesheet } from '@/types'

const props = defineProps<{ month: string | null }>()
const router = useRouter()

const sheet = ref<MyTimesheet | null>(null)
const error = ref('')
const confirming = ref(false)
const sending = ref(false)

const thisMonth = computed(() => monthOf(me.value!.today))
const month = computed(() => (props.month && /^\d{4}-\d{2}$/.test(props.month) && props.month <= thisMonth.value ? props.month : thisMonth.value))
const isThisMonth = computed(() => month.value === thisMonth.value)
const days = computed(() => [...(sheet.value?.byDay ?? [])].filter((day) => day.totalMinutes > 0).reverse())
const orders = computed(() => [...(sheet.value?.byOrder ?? [])].sort((a, b) => b.minutes - a.minutes))

async function load() {
  confirming.value = false
  try {
    const result = await api<{ timesheet: MyTimesheet }>(`/me/timesheet?month=${month.value}`)
    if (result.timesheet.month === month.value) sheet.value = result.timesheet
    error.value = ''
  } catch (caught) {
    error.value = errorMessage(caught)
  }
}

watch([month, changes], load, { immediate: true })

const go = (offset: number) => router.replace({ name: 'timesheet', query: { month: addMonths(month.value, offset) } })

function dayDetail(day: MyTimesheet['byDay'][number]) {
  const parts = []
  if (day.billableMinutes) parts.push(`${formatMinutes(day.billableMinutes)} on orders`)
  if (day.generalMinutes) parts.push(`${formatMinutes(day.generalMinutes)} general`)
  return parts.join(', ')
}

async function send() {
  if (!confirming.value) {
    confirming.value = true
    return
  }
  sending.value = true
  try {
    const result = await api<{ timesheet: MyTimesheet }>(`/me/timesheet/${month.value}/send`, { method: 'POST' })
    sheet.value = result.timesheet
    changes.value++
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    sending.value = false
    confirming.value = false
  }
}

const sentOn = (sentAt: string) => formatShortDay(localDate(sentAt, me.value!.timeZone))
</script>

<template>
  <RouterLink :to="{ name: 'my-orders' }" class="back"><Glyph name="back" :size="18" />My orders</RouterLink>

  <header class="stack heading">
    <div class="months">
      <button type="button" class="month-step" aria-label="Previous month" @click="go(-1)">
        <Glyph name="back" :size="20" />
      </button>
      <p class="month-name"><Glyph name="spool" class="spool" />{{ formatMonth(month) }}</p>
      <button type="button" class="month-step" aria-label="Next month" :disabled="isThisMonth" @click="go(1)">
        <Glyph name="next" :size="20" />
      </button>
    </div>
    <div class="total">
      <h1 class="title-total number">{{ sheet ? formatMinutes(sheet.totalMinutes) : '…' }}</h1>
      <span class="muted">{{ isThisMonth ? 'so far' : `in ${formatMonthName(month)}` }}</span>
    </div>
    <p v-if="sheet && sheet.totalMinutes === 0" class="aside">Not a stitch logged. Yet.</p>
  </header>

  <div v-if="error" class="alert" role="alert">
    <Glyph name="alert" :size="22" />
    <span><strong>Hold on</strong>{{ error }}</span>
  </div>

  <template v-if="sheet && sheet.totalMinutes > 0">
    <section v-if="sheet.payPence !== null" class="card">
      <div class="row">
        <h2 class="section-label">Estimated pay</h2>
        <span class="pay number">{{ formatPence(sheet.payPence) }}</span>
      </div>
      <p v-if="sheet.ratePence !== null" class="muted small">
        At {{ formatPence(sheet.ratePence) }} an hour. Your atelier has the final say.
      </p>
    </section>

    <section class="card">
      <h2 class="section-label">By order</h2>
      <div v-for="(order, index) in orders" :key="order.orderId" class="row" :class="{ stitched: index > 0 }">
        <span class="strong">{{ order.number ?? 'An order' }}</span>
        <span class="strong number">{{ formatMinutes(order.minutes) }}</span>
      </div>
      <div class="row" :class="{ stitched: orders.length > 0 }">
        <span class="stack">
          <span>General time</span>
          <span class="muted small">Paid, never billed</span>
        </span>
        <span class="strong number">{{ formatMinutes(sheet.generalMinutes) }}</span>
      </div>
    </section>

    <section class="card">
      <h2 class="section-label">By day</h2>
      <div v-for="(day, index) in days" :key="day.dateLocal" class="row" :class="{ stitched: index > 0 }">
        <span class="stack">
          <span class="strong">{{ formatShortDay(day.dateLocal) }}</span>
          <span class="muted small">{{ dayDetail(day) }}</span>
        </span>
        <span class="strong number">{{ formatMinutes(day.totalMinutes) }}</span>
      </div>
    </section>
  </template>

  <div v-if="sheet" class="footer">
    <p v-if="sheet.sentAt" class="sent">
      <Glyph name="lock" :size="18" />Sent {{ sentOn(sheet.sentAt) }}. Locked tight, so ask your atelier for changes.
    </p>
    <template v-else>
      <button type="button" class="btn btn-primary" :disabled="sending || sheet.totalMinutes === 0" @click="send">
        {{ confirming ? 'Yes, send it' : `Send ${formatMonthName(month)} timesheet` }}
      </button>
      <button v-if="confirming" type="button" class="link-button cancel" @click="confirming = false">Not yet</button>
      <p class="small muted center">Once it's sent, it's sent. No take backs.</p>
    </template>
  </div>
</template>

<style scoped>
.heading {
  gap: 6px;
}

.months {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: -10px;
}

.month-step {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: none;
  color: var(--muted);
}

.month-step:disabled {
  opacity: 0.3;
}

.month-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--muted);
}

.spool {
  color: var(--claret);
}

.total {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.title-total {
  font-family: var(--serif);
  font-size: 52px;
  font-weight: 600;
  line-height: 1;
}

.total .muted {
  font-size: 18px;
}

.pay {
  font-family: var(--serif);
  font-size: 24px;
  font-weight: 600;
}

.sent {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.cancel {
  align-self: center;
  color: var(--muted);
}

.center {
  text-align: center;
}
</style>
