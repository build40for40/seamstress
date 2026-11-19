<script setup lang="ts">
defineProps<{ label: string; summary: string; check?: boolean; needed?: boolean; hint?: string }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ looksRight: [] }>()

function lookedAt() {
  emit('looksRight')
  open.value = false
}
</script>

<template>
  <div class="draft-row" :class="{ needed, check }">
    <div class="spread head">
      <span class="label">{{ label }}</span>
      <span class="row marks">
        <span v-if="needed" class="chip chip-alert">Needed</span>
        <span v-else-if="check" class="chip chip-warn">Check this</span>
      </span>
    </div>
    <template v-if="!open">
      <div class="spread">
        <p class="summary">{{ summary }}</p>
        <span class="row">
          <button v-if="check" type="button" class="btn-link small" @click="lookedAt">Looks right</button>
          <button type="button" class="btn-link small" @click="open = true">Edit</button>
        </span>
      </div>
    </template>
    <div v-else class="stack">
      <p v-if="hint" class="field-hint">{{ hint }}</p>
      <slot />
      <button v-if="!needed && summary" type="button" class="btn-link small done" @click="lookedAt">Done</button>
    </div>
  </div>
</template>

<style scoped>
.draft-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--line-soft);
  border-left: 4px solid var(--line-soft);
  background: var(--paper);
  min-width: 0;
}

.draft-row.check {
  border-left-color: var(--amber);
}

.draft-row.needed {
  border-left-color: var(--red);
}

.label {
  font-size: 0.85rem;
  font-weight: 600;
}

.summary {
  min-width: 0;
  overflow-wrap: anywhere;
}

.done {
  align-self: flex-start;
}
</style>
