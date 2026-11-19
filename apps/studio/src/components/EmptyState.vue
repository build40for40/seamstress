<script setup lang="ts">
defineProps<{ aside: string }>()
</script>

<template>
  <div class="empty">
    <p class="aside">{{ aside }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  border: 2px dashed var(--line);
}
</style>
