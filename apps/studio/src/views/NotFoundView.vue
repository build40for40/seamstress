<script setup lang="ts">
import TapeMeasure from '@/components/TapeMeasure.vue'
</script>

<template>
  <TapeMeasure />
  <main class="not-found">
    <span class="wordmark">Seamless</span>
    <h1>Nothing on this rail.</h1>
    <p class="aside">This page has gone missing, like a pin in the carpet. Your orders are right where you left them.</p>
    <RouterLink :to="{ name: 'home' }" class="btn">Back to the orders</RouterLink>
  </main>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  max-width: 32rem;
  margin: 0 auto;
  padding: 3rem 1rem;
}

.wordmark {
  font-family: var(--serif);
  font-style: italic;
  font-size: 1.6rem;
  color: var(--claret);
}
</style>
