<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import TimerBar from '@/components/TimerBar.vue'
import { changes, loadMe, me, meError } from '@/composables/useWorkroom'

function refresh() {
  if (document.visibilityState !== 'visible') return
  loadMe().then(() => changes.value++)
}

onMounted(() => {
  loadMe()
  document.addEventListener('visibilitychange', refresh)
})

onBeforeUnmount(() => document.removeEventListener('visibilitychange', refresh))
</script>

<template>
  <div class="tape" aria-hidden="true" />
  <main v-if="me" class="page">
    <RouterView />
  </main>
  <main v-else-if="meError" class="page">
    <span class="brand">Seamless</span>
    <div class="alert" role="alert">
      <span><strong>The workroom won't open</strong>{{ meError }}</span>
    </div>
    <button type="button" class="btn" @click="loadMe">Try again</button>
  </main>
  <main v-else class="page">
    <span class="brand">Seamless</span>
    <p class="aside">Threading the needle…</p>
  </main>
  <TimerBar v-if="me" />
</template>
