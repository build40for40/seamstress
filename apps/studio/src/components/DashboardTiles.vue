<script setup lang="ts">
import type { Dashboard } from '@seamless/shared'
import { computed, ref } from 'vue'
import { api } from '@/composables/useApi'
import { useResource } from '@/composables/useResource'
import { formatMinutes, formatMonth, formatPence } from '@/lib/format'

type DashboardView = Dashboard & {
  orders: Record<string, { number: string; clientId: string | null }>
  clients: Record<string, { name: string }>
}

const { data, error, reload } = useResource(() => api<DashboardView>('/dashboard'))
const showUnbilled = ref(false)

const unbilledOrders = computed(() => {
  const view = data.value
  if (!view) return []
  return view.unbilled.clients
    .flatMap((client) => client.orders)
    .filter((entry) => entry.orderId)
    .sort((a, b) => b.pence - a.pence)
    .map((entry) => ({
      ...entry,
      number: view.orders[entry.orderId]?.number ?? 'Order',
      clientName: view.clients[view.orders[entry.orderId]?.clientId ?? '']?.name ?? '',
    }))
})

const earnedLine = computed(() => {
  const earned = data.value?.earned
  if (!earned) return ''
  if (earned.perHourPence === null) return 'No invoice sent this month yet.'
  const diff = earned.perHourPence - earned.ratePence
  if (diff === 0) return `Exactly your ${formatPence(earned.ratePence)} an hour.`
  return `${formatPence(Math.abs(diff))} an hour ${diff > 0 ? 'above' : 'below'} your ${formatPence(earned.ratePence)} rate.`
})

const overQuoteLine = computed(() => {
  const count = data.value?.overQuote.count ?? 0
  return count === 0 ? 'No open order is over its quote.' : `${count} open ${count === 1 ? 'order is' : 'orders are'} over quote.`
})

const shareText = computed(() => {
  const share = data.value?.billableShare.share
  return share === null || share === undefined ? '–' : `${Math.round(share * 100)}%`
})

const shareLine = computed(() => {
  const share = data.value?.billableShare
  if (!share || share.share === null) return 'No hours logged this month yet.'
  return `${formatMinutes(share.billableMinutes)} billable of ${formatMinutes(share.paidMinutes)} paid.`
})
</script>

<template>
  <section class="tiles" aria-label="Dashboard">
    <p v-if="error" class="error-note row">
      {{ error }} <button type="button" class="btn btn-small btn-quiet" @click="reload">Try again</button>
    </p>
    <template v-else>
      <div class="tile card">
        <button
          type="button"
          class="tile-button"
          :aria-expanded="showUnbilled"
          :disabled="!data || unbilledOrders.length === 0"
          @click="showUnbilled = !showUnbilled"
        >
          <span class="sewn-label">Unbilled work</span>
          <span class="figure num">{{ data ? formatPence(data.unbilled.pence) : '…' }}</span>
          <span class="small muted">
            {{ data ? `${formatMinutes(data.unbilled.minutes)} not on an invoice yet.` : '' }}
          </span>
        </button>
        <ul v-if="showUnbilled" class="unbilled stack small">
          <li v-for="item in unbilledOrders" :key="item.orderId" class="spread">
            <RouterLink :to="{ name: 'order', params: { id: item.orderId } }">
              {{ item.number }}<span v-if="item.clientName" class="muted"> · {{ item.clientName }}</span>
            </RouterLink>
            <span class="num">{{ formatPence(item.pence) }}</span>
          </li>
        </ul>
      </div>

      <div class="tile card">
        <span class="sewn-label">Earned per hour</span>
        <span class="figure num">{{ data?.earned.perHourPence != null ? formatPence(data.earned.perHourPence) : data ? '–' : '…' }}</span>
        <span class="small muted">{{ earnedLine }}</span>
        <span v-if="data" class="small" :class="{ over: data.overQuote.count > 0 }">{{ overQuoteLine }}</span>
        <span v-if="data" class="small muted">Invoices sent in {{ formatMonth(data.month) }}.</span>
      </div>

      <div class="tile card">
        <span class="sewn-label">Billable share</span>
        <span class="figure num">{{ data ? shareText : '…' }}</span>
        <span class="small muted">{{ shareLine }}</span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  gap: 0.75rem;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tile-button {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.tile-button:disabled {
  cursor: default;
}

.figure {
  font-family: var(--serif);
  font-size: 2rem;
  line-height: 1.1;
  color: var(--claret);
}

.unbilled {
  margin: 0.5rem 0 0;
  padding: 0.5rem 0 0;
  border-top: 2px dashed var(--line);
  list-style: none;
}

.over {
  color: var(--red);
  font-weight: 600;
}
</style>
