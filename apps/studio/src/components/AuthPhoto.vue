<script setup lang="ts">
import { ref, watch } from 'vue'
import { fetchPhoto } from '@/composables/useApi'

const props = defineProps<{ src: string; alt: string }>()

const cache = new Map<string, Promise<string>>()

function objectUrl(src: string) {
  let url = cache.get(src)
  if (!url) {
    url = fetchPhoto(src).then((blob) => URL.createObjectURL(blob))
    url.catch(() => cache.delete(src))
    cache.set(src, url)
  }
  return url
}

const url = ref<string | null>(null)
const failed = ref(false)

watch(
  () => props.src,
  async (src) => {
    url.value = null
    failed.value = false
    try {
      url.value = await objectUrl(src)
    } catch {
      failed.value = true
    }
  },
  { immediate: true },
)
</script>

<template>
  <img v-if="url" :src="url" :alt="alt" class="auth-photo" />
  <span v-else class="auth-photo placeholder" role="img" :aria-label="alt">
    {{ failed ? "Couldn't load" : '' }}
  </span>
</template>

<style scoped>
.auth-photo {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: var(--blush);
}

.placeholder {
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 0.8rem;
}
</style>
