<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import type { InvoiceView } from '@/api-types'
import PoundsInput from '@/components/PoundsInput.vue'
import { api, errorMessage } from '@/composables/useApi'
import { useResource } from '@/composables/useResource'
import { refreshCounts } from '@/composables/useSession'
import { toast } from '@/composables/useToast'
import { formatDate, formatInstantDate, formatMinutes, formatPence } from '@/lib/format'
import { INVOICE_STATUS_LABELS } from '@/lib/labels'

const props = defineProps<{ id: string }>()

const { data, error, loading, reload } = useResource(() => api<InvoiceView>(`/invoices/${props.id}`))
const view = shallowRef<InvoiceView | null>(null)
const finalPrice = ref<number | null>(null)
const busy = ref(false)

const current = computed(() => view.value ?? data.value)
const isDraft = computed(() => current.value?.invoice.status === 'draft')

function adopt(next: InvoiceView) {
  view.value = next
  finalPrice.value = next.draft.finalPricePence
}

watch(data, (next) => next && adopt(next), { immediate: true })

const payRows = computed(() => {
  const atelier = current.value?.atelier
  if (!atelier) return []
  return [
    ['Account name', atelier.bankAccountName],
    ['Sort code', atelier.bankSortCode],
    ['Account number', atelier.bankAccountNumber],
    ['IBAN', atelier.bankIban],
    ['BIC', atelier.bankBic],
  ].filter((row): row is [string, string] => Boolean(row[1]))
})

const refByGarment = computed(() => new Map((current.value?.draft.lines ?? []).map((line) => [line.garmentId, line.ref])))
const finalChanged = computed(() => finalPrice.value !== (current.value?.draft.finalPricePence ?? null))

async function run(action: () => Promise<InvoiceView>, message?: string) {
  busy.value = true
  try {
    adopt(await action())
    if (message) toast(message)
    void refreshCounts()
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
  } finally {
    busy.value = false
  }
}

const patch = (body: object) => api<InvoiceView>(`/invoices/${props.id}`, { method: 'PATCH', json: body })

function toggleHeldBack(entryId: string, included: boolean) {
  const draft = current.value!.draft
  const ids = new Set(draft.heldBack.filter((entry) => entry.included).map((entry) => entry.entryId))
  if (included) ids.add(entryId)
  else ids.delete(entryId)
  return run(() => patch({ includedHeldBack: [...ids] }))
}

const saveFinalPrice = () => run(() => patch({ finalPricePence: finalPrice.value }), 'Final price saved.')
const clearFinalPrice = () => run(() => patch({ finalPricePence: null }), 'Back to the hourly total.')

function send() {
  const emails = current.value?.client?.email ? ` We'll email ${current.value.client.email}.` : ''
  if (!window.confirm(`Send this invoice? It locks the lines and the hours on it.${emails}`)) return
  return run(() => api<InvoiceView>(`/invoices/${props.id}/send`, { method: 'POST' }), 'Sent. Numbered and locked.')
}

const markPaid = () => run(() => api<InvoiceView>(`/invoices/${props.id}/paid`, { method: 'POST' }), 'Paid. Lovely.')
const print = () => window.print()
</script>

<template>
  <div v-if="current" class="stack-lg invoice">
    <div class="spread no-print">
      <RouterLink :to="{ name: 'order', params: { id: current.order.id } }" class="btn-link">
        Back to {{ current.order.number }}
      </RouterLink>
      <span class="chip" :class="{ 'chip-ok': current.invoice.status === 'paid' }">
        {{ INVOICE_STATUS_LABELS[current.invoice.status] }}
      </span>
    </div>

    <article class="sheet card stack-lg">
      <header class="spread head">
        <div class="stack">
          <h1>{{ current.atelier.name }}</h1>
          <p v-if="current.atelier.businessAddress" class="small muted address">{{ current.atelier.businessAddress }}</p>
          <p class="small muted">{{ current.atelier.replyToEmail }}</p>
          <p v-if="current.atelier.companyNumber" class="small muted">Company number {{ current.atelier.companyNumber }}</p>
          <p v-if="current.atelier.vatNumber" class="small muted">VAT number {{ current.atelier.vatNumber }}</p>
        </div>
        <div class="stack meta">
          <p class="sewn-label">{{ current.invoice.number ?? 'Draft invoice' }}</p>
          <p class="small muted">{{ current.order.number }}</p>
          <p v-if="current.invoice.sentAt" class="small muted">{{ formatInstantDate(current.invoice.sentAt) }}</p>
        </div>
      </header>

      <p v-if="current.client" class="stack">
        <span class="small muted">Billed to</span>
        <strong>{{ current.client.name }}</strong>
      </p>
      <p>{{ current.order.description }}</p>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Garment</th>
              <th class="num">Time</th>
              <th class="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in current.draft.lines" :key="line.garmentId">
              <td>
                <strong>{{ line.ref }}</strong> {{ line.description }}
              </td>
              <td class="num">{{ formatMinutes(line.minutes) }}</td>
              <td class="num">{{ formatPence(line.pence) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Hourly total at {{ formatPence(current.draft.ratePence) }} an hour</td>
              <td class="num">{{ formatMinutes(current.draft.minutes) }}</td>
              <td class="num">{{ formatPence(current.draft.hourlyTotalPence) }}</td>
            </tr>
            <tr v-if="current.draft.finalPricePence !== null">
              <td colspan="2">Agreed final price</td>
              <td class="num">{{ formatPence(current.draft.finalPricePence) }}</td>
            </tr>
            <tr class="grand">
              <td colspan="2">Total due</td>
              <td class="num">{{ formatPence(current.draft.totalPence) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <section v-if="payRows.length || current.atelier.paymentTerms" class="stack pay">
        <h2 v-if="payRows.length">How to pay</h2>
        <dl v-if="payRows.length" class="pay-rows">
          <div v-for="[label, value] in payRows" :key="label"><dt>{{ label }}</dt><dd class="num">{{ value }}</dd></div>
          <div><dt>Reference</dt><dd class="num">{{ current.invoice.number ?? current.order.number }}</dd></div>
        </dl>
        <p v-if="current.atelier.paymentTerms" class="small">{{ current.atelier.paymentTerms }}</p>
      </section>
      <p v-else-if="isDraft" class="small muted no-print">
        No bank details on this one yet. <RouterLink :to="{ name: 'settings' }">Add them in Settings</RouterLink> so clients know where to pay.
      </p>

      <p v-if="current.invoice.paidAt" class="small muted">Paid on {{ formatInstantDate(current.invoice.paidAt) }}. Thank you.</p>
    </article>

    <section class="card stack no-print">
      <h2>Against the quote</h2>
      <dl class="figures num">
        <div><dt>Quote</dt><dd>{{ formatPence(current.draft.quotePence) }}</dd></div>
        <div><dt>Hourly total</dt><dd>{{ formatPence(current.draft.hourlyTotalPence) }}</dd></div>
        <div>
          <dt>Difference</dt>
          <dd :class="{ over: current.draft.overQuote }">
            {{ current.draft.differencePence > 0 ? '+' : '' }}{{ formatPence(current.draft.differencePence) }}
          </dd>
        </div>
      </dl>
      <p v-if="current.draft.overQuote" class="chip chip-alert">Over the quote. Worth a word before you send.</p>
      <p v-if="current.draft.waiting.count" class="small muted">
        {{ current.draft.waiting.count }} waiting {{ current.draft.waiting.count === 1 ? 'entry' : 'entries' }}
        ({{ formatMinutes(current.draft.waiting.minutes) }}) left out until you review them.
        <RouterLink :to="{ name: 'review' }">Review</RouterLink>
      </p>
    </section>

    <section v-if="current.draft.heldBack.length" class="card stack no-print">
      <h2>Held back</h2>
      <p class="aside">These stay off the bill unless you tick them. Ticked ones go on the invoice, and the client sees the total.</p>
      <ul class="stack held">
        <li v-for="entry in current.draft.heldBack" :key="entry.entryId">
          <label class="check">
            <input
              type="checkbox"
              :checked="entry.included"
              :disabled="!isDraft || busy"
              @change="toggleHeldBack(entry.entryId, ($event.target as HTMLInputElement).checked)"
            />
            <span>
              {{ refByGarment.get(entry.garmentId) ?? 'Garment' }} · {{ formatDate(entry.dateLocal) }} ·
              {{ formatMinutes(entry.minutes) }}<template v-if="entry.note"> · {{ entry.note }}</template>
            </span>
          </label>
        </li>
      </ul>
    </section>

    <section v-if="isDraft" class="card stack no-print">
      <h2>Final price</h2>
      <p class="aside">Leave it empty to bill the hourly total. Set one to bill that instead.</p>
      <form class="stack" @submit.prevent="saveFinalPrice">
        <label class="field">
          <span>Final price</span>
          <PoundsInput v-model="finalPrice" placeholder="Hourly total" />
        </label>
        <div class="row">
          <button type="submit" class="btn btn-small" :disabled="busy || !finalChanged || finalPrice === null">Save price</button>
          <button
            v-if="current.draft.finalPricePence !== null"
            type="button"
            class="btn btn-small btn-quiet"
            :disabled="busy"
            @click="clearFinalPrice"
          >
            Use hourly total
          </button>
        </div>
      </form>
    </section>

    <div class="row no-print actions">
      <button v-if="isDraft" type="button" class="btn" :disabled="busy || finalChanged" @click="send">Send invoice</button>
      <button v-if="current.invoice.status === 'sent'" type="button" class="btn" :disabled="busy" @click="markPaid">
        Mark paid
      </button>
      <button type="button" class="btn btn-quiet" @click="print">Print or save as PDF</button>
    </div>
    <p v-if="isDraft && finalChanged" class="small muted no-print">Save the final price before you send.</p>
  </div>

  <p v-else-if="error" class="error-note row">
    {{ error }} <button type="button" class="btn btn-small btn-quiet" @click="reload">Try again</button>
  </p>
  <p v-else-if="loading" class="muted">Threading the needle…</p>
</template>

<style scoped>
.invoice {
  max-width: 48rem;
}

.head {
  align-items: flex-start;
}

.meta {
  text-align: right;
}

.address {
  white-space: pre-line;
}

.pay {
  border-top: 1px solid var(--line);
  padding-top: 1rem;
  break-inside: avoid;
}

.pay-rows {
  display: grid;
  gap: 0.25rem;
  margin: 0;
}

.pay-rows div {
  display: flex;
  gap: 1rem;
}

.pay-rows dt {
  min-width: 9rem;
  color: var(--muted);
}

.pay-rows dd {
  margin: 0;
  font-weight: 600;
}

.figures {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
}

.figures div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.figures dd {
  margin: 0;
  font-weight: 600;
}

.over {
  color: var(--red);
}

.held {
  list-style: none;
  padding: 0;
}

tfoot td {
  border-top: 1px solid var(--line);
}

.grand td {
  font-weight: 700;
  font-size: 1.1rem;
}

@media print {
  @page {
    size: A4;
    margin: 18mm;
  }

  .no-print {
    display: none !important;
  }

  .invoice {
    max-width: none;
  }

  .sheet {
    border: 0;
    box-shadow: none;
    padding: 0;
    background: #fff;
    color: #000;
  }

  .sheet :deep(*) {
    color: #000;
  }

  tr {
    break-inside: avoid;
  }
}
</style>
