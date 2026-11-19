<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TimesheetResult } from '@seamless/shared'
import EmptyState from '@/components/EmptyState.vue'
import { api, errorMessage } from '@/composables/useApi'
import { useResource } from '@/composables/useResource'
import { refreshCounts } from '@/composables/useSession'
import { toast } from '@/composables/useToast'
import { addMonths } from '@seamless/shared/time'
import { formatDate, formatInstantDate, formatMinutes, formatMonth, formatPence, todayInLondon } from '@/lib/format'

type TimesheetRow = TimesheetResult & {
  member: { id: string; name: string; removed: boolean }
  sentAt: string | null
  byOrder: { orderId: string; number: string | null; minutes: number }[]
}

const thisMonth = todayInLondon().slice(0, 7)
const month = ref(thisMonth)
const open = ref(new Set<string>())
const busy = ref<string | null>(null)

const { data, error, loading, reload } = useResource(
  () => api<{ month: string; timesheets: TimesheetRow[] }>(`/timesheets?month=${month.value}`).then((r) => r.timesheets),
  { watch: month },
)

const rows = computed(() => data.value ?? [])
const totalPay = computed(() => rows.value.reduce((sum, row) => sum + (row.payPence ?? 0), 0))
const totalMinutes = computed(() => rows.value.reduce((sum, row) => sum + row.totalMinutes, 0))

function step(by: number) {
  month.value = addMonths(month.value, by)
  open.value = new Set()
}

function toggle(id: string) {
  const next = new Set(open.value)
  if (!next.delete(id)) next.add(id)
  open.value = next
}

async function reopen(row: TimesheetRow) {
  if (!window.confirm(`Reopen ${row.member.name}'s ${formatMonth(month.value)}? She'll be able to edit it again.`)) return
  busy.value = row.memberId
  try {
    await api(`/timesheets/${row.memberId}/${month.value}`, { method: 'DELETE' })
    toast('Reopened.')
    await reload()
    void refreshCounts()
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
  } finally {
    busy.value = null
  }
}

async function download(type: 'summary' | 'detail') {
  busy.value = type
  try {
    const text = await api<string>(`/timesheets/export?month=${month.value}&type=${type}`)
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `seamless-timesheets-${month.value}-${type}.csv`
    link.click()
    URL.revokeObjectURL(url)
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <div class="stack-lg">
    <div class="stack">
      <h1>Timesheets</h1>
      <p class="aside">Who sewed what, and what they're owed for it.</p>
    </div>

    <div class="spread">
      <div class="row">
        <button type="button" class="btn btn-small btn-quiet" aria-label="Previous month" @click="step(-1)">Back</button>
        <strong class="month">{{ formatMonth(month) }}</strong>
        <button
          type="button"
          class="btn btn-small btn-quiet"
          aria-label="Next month"
          :disabled="month >= thisMonth"
          @click="step(1)"
        >
          Next
        </button>
      </div>
      <div class="row">
        <button type="button" class="btn btn-small" :disabled="busy === 'summary'" @click="download('summary')">
          Summary CSV
        </button>
        <button type="button" class="btn btn-small" :disabled="busy === 'detail'" @click="download('detail')">
          Detail CSV
        </button>
      </div>
    </div>

    <p v-if="error" class="error-note row">
      {{ error }} <button type="button" class="btn btn-small btn-quiet" @click="reload">Try again</button>
    </p>
    <p v-else-if="loading && !data" class="muted">Counting the hours…</p>
    <EmptyState v-else-if="rows.length === 0" aside="Nobody has logged a minute this month." />

    <template v-else>
      <p class="small muted num">
        {{ formatMinutes(totalMinutes) }} in total<template v-if="totalPay"> · {{ formatPence(totalPay) }} pay</template>
      </p>
      <section v-for="row in rows" :key="row.memberId" class="card stack">
        <div class="spread">
          <div class="row">
            <strong>{{ row.member.name }}</strong>
            <span v-if="row.member.removed" class="chip chip-soft">Left</span>
            <span v-if="row.sentAt" class="chip chip-ok">Sent {{ formatInstantDate(row.sentAt) }}</span>
            <span v-else class="chip chip-soft">Not sent</span>
          </div>
          <div class="row">
            <button type="button" class="btn btn-small btn-quiet" :aria-expanded="open.has(row.memberId)" @click="toggle(row.memberId)">
              {{ open.has(row.memberId) ? 'Hide days' : 'Show days' }}
            </button>
            <button
              v-if="row.sentAt"
              type="button"
              class="btn btn-small btn-quiet"
              :disabled="busy === row.memberId"
              @click="reopen(row)"
            >
              Reopen
            </button>
          </div>
        </div>

        <dl class="sums num">
          <div><dt>Billable</dt><dd>{{ formatMinutes(row.billableMinutes) }}</dd></div>
          <div><dt>Workshop</dt><dd>{{ formatMinutes(row.generalMinutes) }}</dd></div>
          <div><dt>Total</dt><dd>{{ formatMinutes(row.totalMinutes) }}</dd></div>
          <div>
            <dt>Pay</dt>
            <dd>{{ row.payPence === null ? 'No rate' : formatPence(row.payPence) }}</dd>
          </div>
        </dl>

        <div v-if="open.has(row.memberId)" class="stack">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Day</th><th class="num">Billable</th><th class="num">Workshop</th><th class="num">Total</th></tr>
              </thead>
              <tbody>
                <tr v-for="day in row.byDay" :key="day.dateLocal">
                  <td>{{ formatDate(day.dateLocal) }}</td>
                  <td class="num">{{ formatMinutes(day.billableMinutes) }}</td>
                  <td class="num">{{ formatMinutes(day.generalMinutes) }}</td>
                  <td class="num">{{ formatMinutes(day.totalMinutes) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="row.byOrder.length" class="small muted">
            By order:
            <template v-for="(order, index) in row.byOrder" :key="order.orderId">
              <template v-if="index">, </template>{{ order.number ?? 'Order' }} {{ formatMinutes(order.minutes) }}
            </template>
          </p>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.month {
  min-width: 9rem;
  text-align: center;
}

.sums {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
  gap: 0.5rem 1rem;
  margin: 0;
}

.sums dt {
  font-size: 0.8rem;
  color: var(--muted);
}

.sums dd {
  margin: 0;
  font-weight: 600;
}
</style>
