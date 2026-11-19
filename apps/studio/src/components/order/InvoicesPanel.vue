<script setup lang="ts">
import type { Invoice } from '@seamstress/shared'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { InvoiceView } from '@/api-types'
import { api, errorMessage } from '@/composables/useApi'
import { toast } from '@/composables/useToast'
import { formatInstantDate, formatPence } from '@/lib/format'
import { INVOICE_STATUS_LABELS } from '@/lib/labels'

const props = defineProps<{ orderId: string; invoices: Invoice[] }>()

const router = useRouter()
const busy = ref(false)

const draft = computed(() => props.invoices.find((invoice) => invoice.status === 'draft') ?? null)
const sorted = computed(() => [...props.invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))

async function start() {
  if (draft.value) {
    await router.push({ name: 'invoice', params: { id: draft.value.id } })
    return
  }
  busy.value = true
  try {
    const view = await api<InvoiceView>(`/orders/${props.orderId}/invoices`, { method: 'POST' })
    await router.push({ name: 'invoice', params: { id: view.invoice.id } })
  } catch (error) {
    toast(errorMessage(error), { tone: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="card stack">
    <div class="spread">
      <h2>Invoices</h2>
      <button type="button" class="btn btn-small" :disabled="busy" @click="start">
        {{ draft ? 'Open the draft' : invoices.length ? 'Invoice the rest' : 'Make the invoice' }}
      </button>
    </div>
    <ul v-if="sorted.length" class="invoices">
      <li v-for="invoice in sorted" :key="invoice.id">
        <RouterLink :to="{ name: 'invoice', params: { id: invoice.id } }" class="spread invoice">
          <span>
            <strong>{{ invoice.number ?? 'Draft' }}</strong>
            <span class="muted small"> · {{ formatInstantDate(invoice.sentAt ?? invoice.createdAt) }}</span>
          </span>
          <span class="row">
            <span v-if="invoice.snapshot" class="num">{{ formatPence(invoice.snapshot.totalPence) }}</span>
            <span class="chip" :class="{ 'chip-ok': invoice.status === 'paid', 'chip-soft': invoice.status === 'draft' }">
              {{ INVOICE_STATUS_LABELS[invoice.status] }}
            </span>
          </span>
        </RouterLink>
      </li>
    </ul>
    <p v-else class="muted small">Nothing billed yet. The draft fills itself from the approved hours.</p>
  </section>
</template>

<style scoped>
.invoices {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.invoice {
  padding: 0.4rem 0;
  border-bottom: 1px dashed var(--line-soft);
  color: inherit;
  text-decoration: none;
}

.invoice:hover strong {
  color: var(--claret);
}
</style>
