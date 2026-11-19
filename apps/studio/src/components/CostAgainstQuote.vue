<script setup lang="ts">
import { computed } from 'vue'
import { formatMinutes, formatPence } from '@/lib/format'

const props = defineProps<{ minutes: number; pence: number; quotePence: number }>()

const share = computed(() => (props.quotePence > 0 ? Math.min(1, props.pence / props.quotePence) : props.pence > 0 ? 1 : 0))
const over = computed(() => props.pence > props.quotePence)
</script>

<template>
  <div class="cost">
    <div class="spread small num">
      <span>{{ formatMinutes(minutes) }} · {{ formatPence(pence) }}</span>
      <span class="muted">of {{ formatPence(quotePence) }} quote</span>
    </div>
    <div class="bar" :class="{ over }" role="presentation">
      <span :style="{ width: `${share * 100}%` }"></span>
    </div>
  </div>
</template>

<style scoped>
.cost {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.bar {
  height: 6px;
  background: var(--line-soft);
}

.bar span {
  display: block;
  height: 100%;
  background: var(--claret);
}

.bar.over span {
  background: var(--red);
}
</style>
