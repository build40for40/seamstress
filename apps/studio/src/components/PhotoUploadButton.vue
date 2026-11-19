<script setup lang="ts">
import type { PhotoLabel } from '@seamstress/shared'
import { ref } from 'vue'
import type { OwnerPhoto } from '@/api-types'
import { errorMessage, uploadGarmentPhoto } from '@/composables/useApi'
import { PHOTO_LABEL_LABELS } from '@/lib/labels'
import { shrinkPhoto } from '@/lib/photos'

const props = defineProps<{ garmentId: string }>()
const emit = defineEmits<{ uploaded: [photo: OwnerPhoto] }>()

const label = ref<PhotoLabel | ''>('progress')
const caption = ref('')
const pending = ref<Blob | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)
const input = ref<HTMLInputElement | null>(null)

async function send() {
  if (!pending.value) return
  busy.value = true
  error.value = null
  try {
    const photo = await uploadGarmentPhoto(props.garmentId, pending.value, {
      label: label.value || null,
      caption: caption.value,
    })
    pending.value = null
    caption.value = ''
    emit('uploaded', photo)
  } catch (caught) {
    error.value = `${errorMessage(caught)} The photo's kept, so just try again.`
  } finally {
    busy.value = false
  }
}

async function onPick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (input.value) input.value.value = ''
  if (!file) return
  error.value = null
  try {
    pending.value = await shrinkPhoto(file)
  } catch {
    error.value = "That file didn't open as a photo. Try another?"
    return
  }
  await send()
}
</script>

<template>
  <div class="upload stack">
    <div class="row">
      <select v-model="label" aria-label="Photo label" class="label-select">
        <option value="">No label</option>
        <option v-for="(text, value) in PHOTO_LABEL_LABELS" :key="value" :value="value">{{ text }}</option>
      </select>
      <input v-model="caption" type="text" placeholder="Caption (optional)" aria-label="Caption" class="caption" />
      <label class="btn btn-quiet btn-small" :class="{ disabled: busy }">
        {{ busy ? 'Sending…' : 'Add photo' }}
        <input ref="input" type="file" accept="image/*" class="visually-hidden" :disabled="busy" @change="onPick" />
      </label>
    </div>
    <div v-if="error" class="error-note row">
      <span>{{ error }}</span>
      <button v-if="pending" type="button" class="btn btn-small" :disabled="busy" @click="send">Try again</button>
    </div>
  </div>
</template>

<style scoped>
.label-select {
  width: auto;
}

.caption {
  flex: 1 1 10rem;
  width: auto;
}

.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
