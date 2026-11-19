<script setup lang="ts">
import type { OwnerPhoto } from '@/api-types'
import { formatDate } from '@/lib/format'
import { PHOTO_LABEL_LABELS, REVIEW_STATUS_LABELS } from '@/lib/labels'
import AuthPhoto from './AuthPhoto.vue'

defineProps<{ photo: OwnerPhoto; by?: string; showReview?: boolean }>()
</script>

<template>
  <figure class="photo-tile">
    <AuthPhoto :src="photo.url" :alt="photo.caption ?? 'Garment photo'" />
    <figcaption class="small">
      <span class="row tags">
        <span v-if="photo.label" class="chip">{{ PHOTO_LABEL_LABELS[photo.label] }}</span>
        <span
          v-if="showReview && photo.reviewStatus !== 'approved'"
          class="chip"
          :class="photo.reviewStatus === 'waiting' ? 'chip-soft' : 'chip-warn'"
        >
          {{ REVIEW_STATUS_LABELS[photo.reviewStatus] }}
        </span>
      </span>
      <span v-if="photo.caption" class="caption">{{ photo.caption }}</span>
      <span class="muted">{{ formatDate(photo.takenOn) }}<template v-if="by"> · {{ by }}</template></span>
    </figcaption>
  </figure>
</template>

<style scoped>
.photo-tile {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0;
  min-width: 0;
}

figcaption {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.tags {
  gap: 0.25rem;
}

.caption {
  overflow-wrap: anywhere;
}
</style>
