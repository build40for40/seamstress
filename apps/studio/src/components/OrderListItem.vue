<script setup lang="ts">
import type { OrderCard } from '@/api-types'
import { dueLabel, formatDate } from '@/lib/format'
import { ORDER_STATUS_LABELS } from '@/lib/labels'
import CostAgainstQuote from './CostAgainstQuote.vue'
import MemberInitials from './MemberInitials.vue'
import OrderFlags from './OrderFlags.vue'
import StageChip from './StageChip.vue'

defineProps<{ order: OrderCard }>()
</script>

<template>
  <RouterLink :to="{ name: 'order', params: { id: order.id } }" class="order card">
    <div class="top">
      <div class="who">
        <span class="sewn-label">{{ order.number }}</span>
        <strong class="client">{{ order.client?.name ?? 'No client' }}</strong>
      </div>
      <div class="when small">
        <span>{{ formatDate(order.dueDate) }}</span>
        <span v-if="order.status === 'open'" class="muted"> · {{ dueLabel(order.dueDate) }}</span>
        <span v-else class="muted"> · {{ ORDER_STATUS_LABELS[order.status] }}</span>
      </div>
    </div>
    <OrderFlags :order="order" />
    <p class="description small muted">{{ order.description }}</p>
    <ul class="garments">
      <li v-for="garment in order.garments" :key="garment.id" class="garment">
        <span class="ref small">{{ garment.ref }}</span>
        <span class="what small">{{ garment.description }}</span>
        <StageChip :stage="garment.status" />
        <MemberInitials :names="garment.assignees.map((assignee) => assignee.name)" />
      </li>
    </ul>
    <CostAgainstQuote :minutes="order.runningCost.minutes" :pence="order.runningCost.pence" :quote-pence="order.quotePence" />
  </RouterLink>
</template>

<style scoped>
.order {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  color: inherit;
  text-decoration: none;
}

.order:hover {
  border-color: var(--claret);
}

.top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
}

.who {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.client {
  overflow-wrap: anywhere;
}

.description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.garments {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0;
  padding: 0.5rem 0 0;
  border-top: 2px dashed var(--line-soft);
  list-style: none;
}

.garment {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.5rem;
}

.ref {
  font-weight: 600;
  white-space: nowrap;
}

.what {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 30rem) {
  .garment {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .garment > :last-child {
    grid-column: 2 / -1;
  }
}
</style>
