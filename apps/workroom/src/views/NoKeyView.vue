<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Glyph from '@/components/Glyph.vue'

const route = useRoute()
const gone = computed(() => route.query.gone === '1')
</script>

<template>
  <div class="tape" aria-hidden="true" />
  <main class="page no-key">
    <span class="brand">Seamless</span>
    <div class="badge"><Glyph name="unlink" :size="30" /></div>
    <template v-if="gone">
      <h1 class="title">This link is out of fashion</h1>
      <p class="lead">It may have been replaced with a new one, or switched off.</p>
      <p class="lead">Ask your atelier for your link.</p>
      <div class="card">
        <p class="muted">Nothing is lost. The hours and photos you've already sent are safe with the atelier.</p>
      </div>
    </template>
    <template v-else>
      <h1 class="title">Ask your atelier for your link.</h1>
      <p class="aside">No link, no entry. I'm discreet like that.</p>
      <p class="lead">Your atelier sends you a personal link. Open it on this phone and you're in, no password needed.</p>
    </template>
  </main>
</template>

<style scoped>
.no-key {
  padding-top: 40px;
  gap: 20px;
}

.badge {
  width: 60px;
  height: 60px;
  border-radius: 999px;
  background: #ede2e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lead {
  font-size: 17px;
}
</style>
