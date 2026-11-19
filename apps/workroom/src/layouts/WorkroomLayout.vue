<script setup lang="ts">
import TimerBar from '@/components/TimerBar.vue'
</script>

<template>
  <main class="workroom-main">
    <RouterView />
  </main>
  <TimerBar />
</template>

<style scoped>
.workroom-main {
  padding: 1rem 1rem 6rem;
}
</style>
