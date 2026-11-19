<script setup lang="ts">
import { ref, watch } from 'vue'
import Glyph from '@/components/Glyph.vue'
import { photoSrc } from '@/composables/usePhotoSrc'

const props = defineProps<{ url: string; alt: string }>()
const src = ref<string | null>(null)
const failed = ref(false)

watch(
  () => props.url,
  (url) => {
    src.value = null
    failed.value = false
    photoSrc(url)
      .then((value) => (src.value = value))
      .catch(() => (failed.value = true))
  },
  { immediate: true },
)
</script>

<template>
  <img v-if="src" :src="src" :alt="alt" class="auth-photo" />
  <span v-else class="auth-photo auth-photo-empty" :aria-label="failed ? `${alt} didn't load` : `Loading ${alt}`">
    <Glyph name="dress" :size="40" />
  </span>
</template>

<style scoped>
.auth-photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth-photo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--swatch);
}
</style>
