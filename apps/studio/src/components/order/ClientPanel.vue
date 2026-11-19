<script setup lang="ts">
import type { Client } from '@seamstress/shared'
import { ref } from 'vue'
import TellClient from '@/components/TellClient.vue'
import { api, errorMessage } from '@/composables/useApi'
import { toast } from '@/composables/useToast'
import type { Moment, TellClientContext } from '@/lib/tell-client'

const props = defineProps<{
  orderId: string
  client: Client | null
  trackingUrl: string
  suggested: Moment
  context: TellClientContext
}>()
const emit = defineEmits<{ relinked: [trackingUrl: string]; told: [] }>()

const busy = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.trackingUrl)
    toast('Link copied.')
  } catch {
    toast("Couldn't copy. Select the link and copy it by hand.", { tone: 'error' })
  }
}

async function regenerate() {
  if (!window.confirm('Make a new link? The old one stops working straight away.')) return
  busy.value = true
  try {
    const { trackingUrl } = await api<{ trackingUrl: string }>(`/orders/${props.orderId}/tracking-token`, { method: 'POST' })
    emit('relinked', trackingUrl)
    toast('New link made. The old one is dead.')
  } catch (error) {
    toast(errorMessage(error), { tone: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="card stack">
    <h2>Client</h2>
    <div v-if="client" class="stack details">
      <strong>{{ client.name }}</strong>
      <a :href="`tel:${client.phone}`">{{ client.phone }}</a>
      <a v-if="client.email" :href="`mailto:${client.email}`">{{ client.email }}</a>
      <p v-if="client.notes" class="muted small notes">{{ client.notes }}</p>
    </div>

    <hr class="stitch" />
    <div class="stack">
      <h3>Their link</h3>
      <p class="small muted">They see approved hours and photos here. No login.</p>
      <input :value="trackingUrl" type="text" readonly aria-label="Client link" @focus="($event.target as HTMLInputElement).select()" />
      <div class="row">
        <button type="button" class="btn btn-small" @click="copy">Copy link</button>
        <a :href="trackingUrl" target="_blank" rel="noopener" class="btn btn-quiet btn-small">Open</a>
        <button type="button" class="btn-link small" :disabled="busy" @click="regenerate">Make a new link</button>
      </div>
    </div>

    <hr class="stitch" />
    <div class="stack">
      <h3>Tell the client</h3>
      <TellClient
        :order-id="orderId"
        :suggested="suggested"
        :phone="client?.phone ?? null"
        :email="client?.email ?? null"
        :context="context"
        @told="emit('told')"
      />
    </div>
  </section>
</template>

<style scoped>
.details {
  gap: 0.2rem;
  overflow-wrap: anywhere;
}

.notes {
  white-space: pre-wrap;
}
</style>
