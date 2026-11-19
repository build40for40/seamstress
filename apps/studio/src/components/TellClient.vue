<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api, errorMessage } from '@/composables/useApi'
import { toast } from '@/composables/useToast'
import {
  clientMessage,
  emailSubject,
  mailtoUrl,
  MOMENT_CHOICES,
  whatsappUrl,
  type Channel,
  type Moment,
  type TellClientContext,
} from '@/lib/tell-client'

const props = defineProps<{
  orderId: string
  suggested: Moment
  phone: string | null
  email: string | null
  context: TellClientContext
}>()
const emit = defineEmits<{ told: [] }>()

const moment = ref<Moment>(props.suggested)
watch(
  () => props.suggested,
  (value) => (moment.value = value),
)

const message = computed(() => clientMessage(moment.value, props.context))
const whatsapp = computed(() => whatsappUrl(props.phone, message.value))
const mailto = computed(() =>
  props.email ? mailtoUrl(props.email, emailSubject(moment.value, props.context), message.value) : null,
)

async function logTold(channel: Channel) {
  try {
    await api(`/orders/${props.orderId}/told`, { method: 'POST', json: { channel, moment: moment.value } })
    emit('told')
  } catch (error) {
    toast(`Opened it, but couldn't note it on the order: ${errorMessage(error)}`, { tone: 'error' })
  }
}
</script>

<template>
  <div class="stack">
    <label class="field">
      <span>What's the news?</span>
      <select v-model="moment">
        <option v-for="choice in MOMENT_CHOICES" :key="choice.value" :value="choice.value">{{ choice.label }}</option>
      </select>
    </label>
    <p class="message small">{{ message }}</p>
    <div class="row">
      <a class="btn btn-small" :href="whatsapp" target="_blank" rel="noopener" @click="logTold('whatsapp')">WhatsApp</a>
      <a v-if="mailto" class="btn btn-quiet btn-small" :href="mailto" @click="logTold('email')">Email</a>
      <span v-else class="muted small">No email on file for this client.</span>
    </div>
  </div>
</template>

<style scoped>
.message {
  padding: 0.6rem 0.75rem;
  border-left: 3px solid var(--blush);
  background: var(--ground);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
