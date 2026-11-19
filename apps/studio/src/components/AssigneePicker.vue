<script setup lang="ts">
import { initials } from '@/lib/format'

const selected = defineModel<string[]>({ required: true })
defineProps<{ members: { id: string; name: string }[] }>()

function toggle(id: string) {
  selected.value = selected.value.includes(id) ? selected.value.filter((other) => other !== id) : [...selected.value, id]
}
</script>

<template>
  <div class="picker" role="group" aria-label="Who's sewing it">
    <button
      v-for="member in members"
      :key="member.id"
      type="button"
      class="person"
      :class="{ on: selected.includes(member.id) }"
      :aria-pressed="selected.includes(member.id)"
      @click="toggle(member.id)"
    >
      <span class="dot">{{ initials(member.name) }}</span>
      {{ member.name }}
    </button>
    <span v-if="members.length === 0" class="muted small">
      No seamstresses yet. <RouterLink :to="{ name: 'team' }">Add one on Team</RouterLink>.
    </span>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.person {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.25rem;
  padding: 0.2rem 0.7rem 0.2rem 0.25rem;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.person.on {
  border-color: var(--claret);
  background: var(--blush);
  color: var(--claret);
  font-weight: 600;
}

.dot {
  display: inline-grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: var(--line);
  color: var(--ink);
  font-size: 0.65rem;
  font-weight: 600;
}

.on .dot {
  background: var(--claret);
  color: #fff;
}
</style>
