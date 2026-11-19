<script setup lang="ts">
import { canMoveOrder, type OrderStatus } from '@seamstress/shared'
import { computed, reactive, ref } from 'vue'
import type { OrderDetail, OwnerPhoto } from '@/api-types'
import AssigneePicker from '@/components/AssigneePicker.vue'
import CostAgainstQuote from '@/components/CostAgainstQuote.vue'
import EmptyState from '@/components/EmptyState.vue'
import ClientPanel from '@/components/order/ClientPanel.vue'
import GarmentPanel from '@/components/order/GarmentPanel.vue'
import InvoicesPanel from '@/components/order/InvoicesPanel.vue'
import OrderActivity from '@/components/order/OrderActivity.vue'
import TimeEntriesTable from '@/components/order/TimeEntriesTable.vue'
import OrderFlags from '@/components/OrderFlags.vue'
import PoundsInput from '@/components/PoundsInput.vue'
import { api, errorMessage } from '@/composables/useApi'
import { useResource } from '@/composables/useResource'
import { refreshCounts, useSession } from '@/composables/useSession'
import { toast } from '@/composables/useToast'
import { dueLabel, formatDate } from '@/lib/format'
import { ORDER_STATUS_LABELS } from '@/lib/labels'
import { suggestedMoment } from '@/lib/tell-client'

const props = defineProps<{ id: string }>()

const { team } = useSession()
const { data, error, loading, reload } = useResource(() => api<OrderDetail>(`/orders/${props.id}`), {
  watch: () => props.id,
})

const busy = ref(false)
const editing = ref(false)
const form = reactive({ description: '', dueDate: '', quotePence: null as number | null, express: false })
const adding = ref(false)
const newGarment = reactive({ description: '', assigneeIds: [] as string[] })

const order = computed(() => data.value?.order ?? null)
const members = computed(() => data.value?.members ?? [])
const activeMembers = computed(() => members.value.filter((member) => !member.removed))

const memberName = (id: string) => members.value.find((member) => member.id === id)?.name ?? 'Someone'
const garmentRef = (id: string) => order.value?.garments.find((garment) => garment.id === id)?.ref ?? 'Garment'
const lookups = {
  memberName: (id: string) => members.value.find((member) => member.id === id)?.name,
  garmentRef: (id: string) => order.value?.garments.find((garment) => garment.id === id)?.ref,
}

const garments = computed(() => [...(order.value?.garments ?? [])].sort((a, b) => a.position - b.position))
const photosFor = (garmentId: string) => (data.value?.photos ?? []).filter((photo) => photo.garmentId === garmentId)

const hasSentInvoice = computed(() => (data.value?.invoices ?? []).some((invoice) => invoice.status !== 'draft'))
const suggested = computed(() => suggestedMoment(order.value ?? { status: 'open' }, hasSentInvoice.value))
const tellContext = computed(() => ({
  atelierName: team.value?.name ?? 'your atelier',
  clientName: data.value?.client?.name ?? 'there',
  orderNumber: order.value?.number ?? '',
  dueDate: order.value?.dueDate ?? '',
  trackingUrl: data.value?.trackingUrl ?? '',
}))

type Move = { to: OrderStatus; label: string; quiet?: boolean; confirm?: string }
type MoveButton = Move & { allowed: boolean; hint?: string }

const moves = computed<MoveButton[]>(() => {
  const current = order.value
  if (!current) return []
  const options: Move[] = [
    { to: 'ready', label: 'Ready for collection' },
    { to: 'collected', label: 'Collected' },
    { to: 'open', label: current.status === 'cancelled' ? 'Reopen' : 'Back to open', quiet: true },
    { to: 'cancelled', label: 'Cancel order', quiet: true, confirm: `Cancel ${current.number}? You can reopen it later.` },
  ]
  return options.flatMap((move): MoveButton[] => {
    const allowed = canMoveOrder(current, move.to, current.garments)
    if (allowed) return [{ ...move, allowed }]
    if (move.to === 'ready' && current.status === 'open') {
      return [{ ...move, allowed, hint: 'Once every garment is done.' }]
    }
    return []
  })
})

function show(detail: OrderDetail) {
  data.value = detail
}

async function run(request: () => Promise<OrderDetail>, success?: string) {
  busy.value = true
  try {
    show(await request())
    if (success) toast(success)
    return true
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
    return false
  } finally {
    busy.value = false
  }
}

async function move(to: Move) {
  if (to.confirm && !window.confirm(to.confirm)) return
  const done = await run(
    () => api<OrderDetail>(`/orders/${props.id}`, { method: 'PATCH', json: { status: to.to } }),
    to.to === 'ready' ? 'Ready for collection. Tell the client below.' : `Moved to ${ORDER_STATUS_LABELS[to.to].toLowerCase()}.`,
  )
  if (done) void refreshCounts()
}

function startEditing() {
  if (!order.value) return
  Object.assign(form, {
    description: order.value.description,
    dueDate: order.value.dueDate,
    quotePence: order.value.quotePence,
    express: order.value.express,
  })
  editing.value = true
}

async function saveDetails() {
  if (form.quotePence === null || !form.dueDate || !form.description.trim()) {
    toast('Every order needs a description, a due date and a quote.', { tone: 'error' })
    return
  }
  const saved = await run(() =>
    api<OrderDetail>(`/orders/${props.id}`, {
      method: 'PATCH',
      json: {
        description: form.description.trim(),
        dueDate: form.dueDate,
        quotePence: form.quotePence,
        express: form.express,
      },
    }),
  )
  if (saved) editing.value = false
}

async function addGarment() {
  if (!newGarment.description.trim()) {
    toast('Say what the garment needs.', { tone: 'error' })
    return
  }
  const saved = await run(() =>
    api<OrderDetail>(`/orders/${props.id}/garments`, {
      method: 'POST',
      json: { description: newGarment.description.trim(), assigneeIds: newGarment.assigneeIds },
    }),
  )
  if (saved) {
    Object.assign(newGarment, { description: '', assigneeIds: [] })
    adding.value = false
  }
}

function addPhoto(photo: OwnerPhoto) {
  if (data.value) data.value = { ...data.value, photos: [...data.value.photos, photo] }
  toast('Photo added.')
}

function relinked(trackingUrl: string) {
  if (data.value) data.value = { ...data.value, trackingUrl }
}
</script>

<template>
  <div class="stack-lg">
    <RouterLink :to="{ name: 'home' }" class="small">← Orders</RouterLink>

    <p v-if="error && !data" class="error-note row">
      {{ error }} <button type="button" class="btn btn-small btn-quiet" @click="reload">Try again</button>
    </p>
    <p v-else-if="loading && !data" class="muted">Unpicking the details…</p>

    <template v-if="data && order">
      <header class="stack">
        <div class="spread">
          <div class="row">
            <span class="sewn-label big">{{ order.number }}</span>
            <h1>{{ data.client?.name ?? 'No client' }}</h1>
          </div>
          <span class="chip status">{{ ORDER_STATUS_LABELS[order.status] }}</span>
        </div>
        <p class="row">
          <span>Due {{ formatDate(order.dueDate) }}</span>
          <span v-if="order.status === 'open'" class="muted">· {{ dueLabel(order.dueDate) }}</span>
        </p>
        <OrderFlags :order="order" />
      </header>

      <div class="layout">
        <div class="main stack-lg">
          <section class="card stack">
            <div class="spread">
              <h2>The order</h2>
              <button v-if="!editing" type="button" class="btn-link small" @click="startEditing">Edit</button>
            </div>
            <template v-if="editing">
              <label class="field">
                <span>What is it?</span>
                <textarea v-model="form.description"></textarea>
              </label>
              <div class="grid-2">
                <label class="field">
                  <span>Due date</span>
                  <input v-model="form.dueDate" type="date" />
                </label>
                <label class="field">
                  <span>Quote</span>
                  <PoundsInput v-model="form.quotePence" />
                </label>
              </div>
              <label class="check">
                <input v-model="form.express" type="checkbox" />
                <span>Express</span>
              </label>
              <div class="row">
                <button type="button" class="btn btn-small" :disabled="busy" @click="saveDetails">Save</button>
                <button type="button" class="btn-link small" @click="editing = false">Cancel</button>
              </div>
            </template>
            <template v-else>
              <p class="description">{{ order.description }}</p>
              <CostAgainstQuote
                :minutes="order.runningCost.minutes"
                :pence="order.runningCost.pence"
                :quote-pence="order.quotePence"
              />
              <p v-if="order.flags.overQuote" class="small over">
                The hours have gone past the quote. You pick the final price on the invoice.
              </p>
            </template>
            <div v-if="moves.length" class="row moves">
              <button
                v-for="item in moves"
                :key="item.to"
                type="button"
                class="btn btn-small"
                :class="{ 'btn-quiet': item.quiet }"
                :disabled="busy || !item.allowed"
                :title="item.hint"
                @click="move(item)"
              >
                {{ item.label }}
              </button>
              <span v-if="moves.some((item) => item.hint)" class="small muted">Ready once every garment is done.</span>
            </div>
          </section>

          <section class="stack">
            <div class="spread">
              <h2>Garments</h2>
              <button v-if="!adding" type="button" class="btn btn-quiet btn-small" @click="adding = true">Add a garment</button>
            </div>
            <GarmentPanel
              v-for="garment in garments"
              :key="garment.id"
              :garment="garment"
              :photos="photosFor(garment.id)"
              :members="members"
              @changed="show"
              @photo="addPhoto"
            />
            <div v-if="adding" class="card stack">
              <h3>New garment</h3>
              <label class="field">
                <span>What needs doing</span>
                <textarea v-model="newGarment.description"></textarea>
              </label>
              <div class="field">
                <span>Who's sewing it</span>
                <AssigneePicker v-model="newGarment.assigneeIds" :members="activeMembers" />
              </div>
              <div class="row">
                <button type="button" class="btn btn-small" :disabled="busy" @click="addGarment">Add it</button>
                <button type="button" class="btn-link small" @click="adding = false">Cancel</button>
              </div>
            </div>
          </section>

          <section class="card stack">
            <h2>Time</h2>
            <TimeEntriesTable
              v-if="data.entries.length"
              :entries="data.entries"
              :member-name="memberName"
              :garment-ref="garmentRef"
            />
            <EmptyState v-else aside="Not a minute logged yet. The needles are still warming up." />
          </section>
        </div>

        <aside class="side stack-lg">
          <ClientPanel
            :order-id="order.id"
            :client="data.client"
            :tracking-url="data.trackingUrl"
            :suggested="suggested"
            :context="tellContext"
            @relinked="relinked"
            @told="reload"
          />
          <InvoicesPanel :order-id="order.id" :invoices="data.invoices" />
          <section class="card stack">
            <h2>What happened</h2>
            <OrderActivity :activity="data.activity" :lookups="lookups" />
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.big {
  font-size: 1rem;
}

h1 {
  overflow-wrap: anywhere;
}

.status {
  font-size: 0.9rem;
}

.description {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.over {
  color: var(--red);
}

.moves {
  padding-top: 0.75rem;
  border-top: 2px dashed var(--line-soft);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
}

@media (min-width: 60rem) {
  .layout {
    grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
    align-items: start;
  }
}
</style>
