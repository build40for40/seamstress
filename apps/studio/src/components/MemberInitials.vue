<script setup lang="ts">
import { initials } from '@/lib/format'

defineProps<{ names: string[] }>()
</script>

<template>
  <span class="initials">
    <span v-for="name in names" :key="name" class="initial" :title="name">{{ initials(name) }}</span>
    <span v-if="names.length === 0" class="muted small">Nobody yet</span>
  </span>
</template>

<style scoped>
.initials {
  display: inline-flex;
  gap: 0.2rem;
}

.initial {
  display: inline-grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--ink);
  color: var(--ground);
  font-size: 0.7rem;
  font-weight: 600;
}
</style>
