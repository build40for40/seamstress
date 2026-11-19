<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <div v-for="item in toasts" :key="item.id" class="toast" :class="{ 'toast-error': item.tone === 'error' }">
      <span>{{ item.message }}</span>
      <button type="button" class="toast-close" aria-label="Dismiss" @click="dismiss(item.id)">×</button>
    </div>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  left: 1rem;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  max-width: 28rem;
  padding: 0.7rem 0.9rem;
  background: var(--ink);
  color: var(--ground);
  box-shadow: 0 6px 20px rgba(43, 27, 51, 0.25);
  pointer-events: auto;
}

.toast-error {
  background: var(--red);
}

.toast-close {
  border: 0;
  background: none;
  color: inherit;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}

@media print {
  .toasts {
    display: none;
  }
}
</style>
