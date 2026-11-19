<script setup lang="ts">
import type { GarmentStatus } from '@seamstress/shared'
import { GARMENT_STAGE_LABELS } from '@/lib/labels'

defineProps<{ stage: GarmentStatus }>()

const TONES: Record<GarmentStatus, string> = {
  todo: '',
  in_progress: 'chip-soft',
  fitting: 'chip-warn',
  done: 'chip-ok',
}
</script>

<template>
  <span class="chip" :class="TONES[stage]">{{ GARMENT_STAGE_LABELS[stage] }}</span>
</template>
