<script setup lang="ts">
import { PHOTO_LABELS, type PhotoLabel } from '@seamless/shared'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Glyph from '@/components/Glyph.vue'
import { ApiError, api, errorMessage } from '@/composables/useApi'
import { primePhoto } from '@/composables/usePhotoSrc'
import { changes, showToast } from '@/composables/useWorkroom'
import { shrinkPhoto } from '@/lib/shrink'
import type { GarmentDetail, Photo } from '@/types'

const props = defineProps<{ id: string }>()
const router = useRouter()

const LABELS: Record<PhotoLabel, string> = { before: 'Before', progress: 'Progress', after: 'After' }

const detail = ref<GarmentDetail | null>(null)
const photo = ref<Blob | null>(null)
const preview = ref<string | null>(null)
const caption = ref('')
const label = ref<PhotoLabel | null>(null)
const preparing = ref(false)
const sending = ref(false)
const pickError = ref('')
const sendError = ref<{ title: string; message: string } | null>(null)

const garment = computed(() => detail.value?.garment ?? null)

watch(
  () => props.id,
  async (id) => {
    try {
      detail.value = await api<GarmentDetail>(`/me/garments/${id}`)
    } catch (caught) {
      showToast({ message: errorMessage(caught), tone: 'warn' })
      router.replace({ name: 'my-orders' })
    }
  },
  { immediate: true },
)

function setPreview(blob: Blob | null) {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = blob ? URL.createObjectURL(blob) : null
}

onBeforeUnmount(() => setPreview(null))

async function picked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  preparing.value = true
  pickError.value = ''
  sendError.value = null
  try {
    photo.value = await shrinkPhoto(file)
    setPreview(photo.value)
  } catch {
    pickError.value = "That photo wouldn't open. Try another?"
  } finally {
    preparing.value = false
  }
}

async function send() {
  if (!photo.value || sending.value) return
  sending.value = true
  sendError.value = null
  const query = new URLSearchParams()
  if (caption.value.trim()) query.set('caption', caption.value.trim())
  if (label.value) query.set('label', label.value)
  try {
    const result = await api<{ photo: Photo }>(`/me/garments/${props.id}/photos?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: photo.value,
    })
    primePhoto(result.photo.url, photo.value)
    changes.value++
    showToast({ message: 'Photo sent. The atelier has a look before the client does.', tone: 'saved' })
    router.replace({ name: 'garment', params: { id: props.id } })
  } catch (caught) {
    const dropped = !(caught instanceof ApiError) || caught.status === 0 || caught.status >= 500
    sendError.value = {
      title: "Well, that's annoying. It didn't send",
      message: dropped
        ? "Your signal may have dropped. The photo is still here, so you don't need to take it again."
        : errorMessage(caught),
    }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <RouterLink :to="{ name: 'garment', params: { id } }" class="back">
    <Glyph name="back" :size="18" />{{ garment?.description ?? 'Back' }}
  </RouterLink>

  <header class="stack heading">
    <span class="tag">{{ garment?.ref ?? '…' }}</span>
    <h1 class="title">Show me the goods</h1>
  </header>

  <div v-if="sendError" class="alert" role="alert">
    <Glyph name="alert" :size="22" />
    <span><strong>{{ sendError.title }}</strong>{{ sendError.message }}</span>
  </div>

  <div class="preview" :class="{ 'preview-small': sendError }">
    <img v-if="preview" :src="preview" alt="The photo you picked" />
    <template v-else>
      <Glyph name="dress" :size="sendError ? 140 : 180" />
      <span class="strong soft">{{ preparing ? 'Pressing it flat…' : 'Your photo shows here' }}</span>
    </template>
  </div>
  <p v-if="pickError" class="small strong" role="alert">{{ pickError }}</p>

  <div class="choices" style="--count: 2">
    <label class="btn btn-dark picker">
      Take photo
      <input type="file" accept="image/*" capture="environment" class="visually-hidden" @change="picked" />
    </label>
    <label class="btn picker">
      From gallery
      <input type="file" accept="image/*" class="visually-hidden" @change="picked" />
    </label>
  </div>

  <label class="stack gap">
    <span class="section-label">What does it show?</span>
    <input v-model="caption" class="field" type="text" maxlength="500" placeholder="New cuffs pinned on" />
  </label>

  <section class="stack gap">
    <h2 class="section-label">Before, during or after? <span class="muted">(if you like)</span></h2>
    <div class="choices">
      <button
        v-for="option in PHOTO_LABELS"
        :key="option"
        type="button"
        class="choice"
        :aria-pressed="label === option"
        @click="label = label === option ? null : option"
      >
        {{ LABELS[option] }}
      </button>
    </div>
  </section>

  <p class="small muted">Nothing reaches the client until the atelier has had a look.</p>

  <div class="footer">
    <button type="button" class="btn btn-primary" :disabled="!photo || sending || preparing" @click="send">
      {{ sending ? 'Sending…' : sendError ? 'Try again' : 'Send photo' }}
    </button>
    <RouterLink :to="{ name: 'garment', params: { id } }" class="link-button later">Not now</RouterLink>
  </div>
</template>

<style scoped>
.heading {
  gap: 8px;
}

.gap {
  gap: 8px;
}

.preview {
  height: 300px;
  border-radius: 6px;
  background: var(--swatch);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.preview-small {
  height: 212px;
}

.preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.soft {
  color: var(--soft);
}

.picker {
  position: relative;
  font-size: 16px;
}

.picker:focus-within {
  outline: 2px solid var(--claret);
  outline-offset: 2px;
}

.later {
  align-self: center;
  color: var(--muted);
}
</style>
