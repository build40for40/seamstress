<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { OrderCard } from '@/api-types'
import DashboardTiles from '@/components/DashboardTiles.vue'
import EmptyState from '@/components/EmptyState.vue'
import OrderListItem from '@/components/OrderListItem.vue'
import { api } from '@/composables/useApi'
import { useResource } from '@/composables/useResource'
import { useSession } from '@/composables/useSession'

const FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'ready', label: 'Ready' },
  { value: 'collected', label: 'Collected' },
  { value: 'all', label: 'All' },
] as const
type Filter = (typeof FILTERS)[number]['value']

const route = useRoute()
const router = useRouter()
const { counts } = useSession()

const filter = computed<Filter>(() => FILTERS.find((item) => item.value === route.query.status)?.value ?? 'open')

const { data, error, loading, reload } = useResource(
  () => api<{ orders: OrderCard[] }>(`/orders?status=${filter.value}`).then((result) => result.orders),
  { watch: filter },
)

const orders = computed(() =>
  [...(data.value ?? [])].sort((a, b) => {
    if (a.express !== b.express) return a.express ? -1 : 1
    return a.dueDate.localeCompare(b.dueDate) || a.number.localeCompare(b.number)
  }),
)

function pick(value: Filter) {
  void router.replace({ query: value === 'open' ? {} : { status: value } })
}

const EMPTY: Record<Filter, string> = {
  open: 'Not a stitch on the table. Take an order and let the gossip begin.',
  ready: 'Nothing waiting at the door for collection.',
  collected: 'Nobody has collected anything yet. Patience, darling.',
  all: 'No orders yet. Your first one is a tap away.',
}
</script>

<template>
  <div class="stack-lg">
    <DashboardTiles />

    <section class="stack">
      <div class="spread">
        <h1>Orders</h1>
        <RouterLink :to="{ name: 'new-order' }" class="btn">New order</RouterLink>
      </div>

      <div class="filters" role="tablist" aria-label="Which orders">
        <button
          v-for="item in FILTERS"
          :key="item.value"
          type="button"
          role="tab"
          class="filter"
          :aria-selected="filter === item.value"
          @click="pick(item.value)"
        >
          {{ item.label }}
          <span v-if="item.value === 'open' && counts?.readyToCollect" class="chip chip-ok">
            {{ counts.readyToCollect }} all done
          </span>
        </button>
      </div>

      <p v-if="error" class="error-note row">
        {{ error }} <button type="button" class="btn btn-small btn-quiet" @click="reload">Try again</button>
      </p>
      <p v-else-if="loading && !data" class="muted">Laying out the fabric…</p>
      <EmptyState v-else-if="orders.length === 0" :aside="EMPTY[filter]">
        <RouterLink v-if="filter === 'open' || filter === 'all'" :to="{ name: 'new-order' }" class="btn btn-quiet">
          Take an order
        </RouterLink>
      </EmptyState>
      <div v-else class="orders">
        <OrderListItem v-for="order in orders" :key="order.id" :order="order" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 2px dashed var(--line);
}

.filter {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.5rem;
  padding: 0.25rem 0.75rem;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--muted);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.filter[aria-selected='true'] {
  border-bottom-color: var(--claret);
  color: var(--claret);
}

.orders {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
  gap: 0.75rem;
}
</style>
