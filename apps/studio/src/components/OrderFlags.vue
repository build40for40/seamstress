<script setup lang="ts">
import type { OrderCard } from '@/api-types'

defineProps<{ order: Pick<OrderCard, 'express' | 'flags' | 'allGarmentsDone' | 'status'> }>()
</script>

<template>
  <span class="row flags">
    <span v-if="order.express" class="chip chip-express">Express</span>
    <span v-if="order.flags.due === 'overdue'" class="chip chip-alert">Overdue</span>
    <span v-else-if="order.flags.due === 'due_soon'" class="chip chip-warn">Due soon</span>
    <span v-if="order.flags.overQuote" class="chip chip-alert">Over quote</span>
    <span v-if="order.flags.waitingReviews" class="chip chip-soft">
      {{ order.flags.waitingReviews }} to review
    </span>
    <span v-if="order.status === 'open' && order.allGarmentsDone" class="chip chip-ok">All done</span>
  </span>
</template>

<style scoped>
.flags {
  gap: 0.3rem;
}
</style>
