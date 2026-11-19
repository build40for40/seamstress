<script setup lang="ts">
import { ref, watch } from 'vue'
import { parsePounds, penceToPoundsText } from '@/lib/format'

const pence = defineModel<number | null>({ required: true })
defineProps<{ id?: string; placeholder?: string; required?: boolean }>()

const text = ref(penceToPoundsText(pence.value))

watch(pence, (value) => {
  if (parsePounds(text.value) !== value) text.value = penceToPoundsText(value)
})

function onInput(event: Event) {
  text.value = (event.target as HTMLInputElement).value
  pence.value = text.value.trim() === '' ? null : parsePounds(text.value)
}
</script>

<template>
  <span class="pounds">
    <span class="pound-sign" aria-hidden="true">£</span>
    <input
      :id="id"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :placeholder="placeholder"
      :required="required"
      :value="text"
      @input="onInput"
    />
  </span>
</template>

<style scoped>
.pounds {
  position: relative;
  display: block;
}

.pound-sign {
  position: absolute;
  top: 50%;
  left: 0.6rem;
  transform: translateY(-50%);
  color: var(--muted);
}

.pounds input {
  padding-left: 1.5rem;
}
</style>
