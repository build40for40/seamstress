<script setup lang="ts">
import { createOrderSchema, ORDER_NOTE_MAX, type Client, type OrderDraft, type PriceItem, type UnsureField } from '@seamstress/shared'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { OrderDetail, TeamMember } from '@/api-types'
import AssigneePicker from '@/components/AssigneePicker.vue'
import DraftRow from '@/components/order/DraftRow.vue'
import PoundsInput from '@/components/PoundsInput.vue'
import { api, errorMessage, uploadGarmentPhoto } from '@/composables/useApi'
import { useResource } from '@/composables/useResource'
import { toast } from '@/composables/useToast'
import { formatDate, formatPence, todayInLondon } from '@/lib/format'
import { shrinkPhoto } from '@/lib/photos'
import {
  formStateFromDraft,
  formStateFromFailedDraft,
  type DraftClient,
  type OrderFormState,
} from './new-order-draft'

type DraftPhoto = { blob: Blob; preview: string }
type DraftGarment = { key: number; description: string; assigneeIds: string[]; photos: DraftPhoto[] }
type Stage = 'note' | 'drafting' | 'form'

const WAITING_LINES = [
  'Reading your scribbles…',
  'Squinting at the handwriting…',
  'Pinning your note to the dress form…',
  'Measuring twice…',
  'Threading the needle…',
]

const router = useRouter()

const lookups = useResource(() =>
  Promise.all([
    api<{ clients: Client[] }>('/clients'),
    api<{ priceItems: PriceItem[] }>('/price-items'),
    api<{ members: TeamMember[] }>('/members'),
  ]).then(([clients, prices, members]) => ({
    clients: clients.clients,
    priceItems: prices.priceItems.filter((item) => !item.archivedAt),
    members: members.members.filter((member) => !member.removedAt),
  })),
)

const stage = ref<Stage>('note')
const note = ref('')
const noteOpen = ref(false)
const reviewing = ref(false)
const draftError = ref<string | null>(null)
const waitingLine = ref(WAITING_LINES[0])

const clientMode = ref<'existing' | 'new'>('existing')
const clientSearch = ref('')
const clientId = ref<string | null>(null)
const newClient = reactive({ name: '', phone: '', email: '', notes: '' })
const candidates = ref<DraftClient[]>([])
const candidatesPending = ref(false)

const description = ref('')
const dueDate = ref('')
const express = ref(false)
const quotePence = ref<number | null>(null)
const quoteFromItems = ref(false)
const added = ref<{ key: number; itemId: string | null; name: string; pricePence: number; counted: boolean }[]>([])

let nextKey = 1
const garments = ref<DraftGarment[]>([blankGarment()])

const marks = reactive(new Set<UnsureField>())
const checkedGarments = reactive(new Set<number>())
const openRows = reactive<Record<string, boolean>>({})

const error = ref<string | null>(null)
const busy = ref(false)
const today = todayInLondon()

const clients = computed(() => lookups.data.value?.clients ?? [])
const members = computed(() => lookups.data.value?.members ?? [])
const priceItems = computed(() => lookups.data.value?.priceItems ?? [])
const matchingClients = computed(() => {
  const query = clientSearch.value.trim().toLowerCase()
  const list = query
    ? clients.value.filter((client) => `${client.name} ${client.phone} ${client.email ?? ''}`.toLowerCase().includes(query))
    : clients.value
  return list.slice(0, 8)
})
const chosenClient = computed<{ name: string; phone: string; email?: string | null } | null>(
  () =>
    clients.value.find((client) => client.id === clientId.value) ??
    candidates.value.find((client) => client.id === clientId.value) ??
    null,
)
const usingNewClient = computed(() => clientMode.value === 'new' || clients.value.length === 0)
const clientReady = computed(() => {
  if (candidatesPending.value) return false
  if (!usingNewClient.value) return clientId.value !== null
  return newClient.name.trim() !== '' && newClient.phone.trim() !== ''
})
const clientSummary = computed(() => {
  if (!usingNewClient.value) {
    return chosenClient.value ? [chosenClient.value.name, chosenClient.value.phone].join(' · ') : ''
  }
  const details = [newClient.phone, newClient.email].filter((part) => part.trim())
  return `New client: ${[newClient.name, ...details].filter((part) => part.trim()).join(' · ')}`
})
const descriptionFallsBackToNote = computed(() => reviewing.value && note.value.trim() !== '' && description.value.trim() === '')
const quoteSummary = computed(() => {
  if (quotePence.value === null) return ''
  const names = added.value.map((item) => item.name)
  const from = names.length ? ` (${names.join(', ')})` : ''
  return `${formatPence(quotePence.value)}${from}`
})

function blankGarment(): DraftGarment {
  return { key: nextKey++, description: '', assigneeIds: [], photos: [] }
}

function isOpen(row: string) {
  return openRows[row] ?? true
}

function marked(field: UnsureField) {
  return marks.has(field)
}

function touch(field: UnsureField) {
  marks.delete(field)
}

function touchGarment(garment: DraftGarment) {
  checkedGarments.delete(garment.key)
}

function memberNames(ids: string[]) {
  const names = ids.map((id) => members.value.find((member) => member.id === id)?.name).filter(Boolean)
  return names.length ? names.join(', ') : 'Nobody yet'
}

function garmentSummary(garment: DraftGarment) {
  const photos = garment.photos.length ? ` · ${garment.photos.length} photo${garment.photos.length === 1 ? '' : 's'}` : ''
  return `${garment.description.trim() || 'No description yet'} · ${memberNames(garment.assigneeIds)}${photos}`
}

function applyState(state: OrderFormState, fromDraft: boolean) {
  garments.value.forEach((garment) => garment.photos.forEach((photo) => URL.revokeObjectURL(photo.preview)))
  clientMode.value = state.client.mode
  clientId.value = state.client.clientId
  clientSearch.value = ''
  Object.assign(newClient, state.client.fields)
  candidates.value = state.client.candidates
  candidatesPending.value = state.client.candidates.length > 0
  description.value = state.description
  dueDate.value = state.dueDate
  express.value = state.express
  quotePence.value = state.quotePence
  quoteFromItems.value = state.quoteFromItems
  added.value = state.pricePicks.flatMap((pick) => {
    const item = priceItems.value.find((candidate) => candidate.id === pick.itemId)
    return item ? [{ key: nextKey++, itemId: item.id, name: item.name, pricePence: item.pricePence, counted: pick.counted }] : []
  })
  garments.value = state.garments.map((garment) => ({ key: nextKey++, ...garment, photos: [] }))

  marks.clear()
  state.unsure.forEach((field) => marks.add(field))
  checkedGarments.clear()
  if (marks.has('garments') || marks.has('assignees')) garments.value.forEach((garment) => checkedGarments.add(garment.key))

  for (const row of Object.keys(openRows)) delete openRows[row]
  reviewing.value = fromDraft
  if (fromDraft) {
    openRows.client = !clientReady.value
    openRows.description = false
    openRows.dueDate = !state.dueDate
    openRows.quote = state.quotePence === null
    openRows.express = false
    garments.value.forEach((garment) => (openRows[`garment-${garment.key}`] = garment.description.trim() === ''))
  }
}

async function draftFromNote() {
  const text = note.value.trim()
  if (!text) {
    draftError.value = 'Tell me a bit about the order first, or fill it in yourself.'
    return
  }
  draftError.value = null
  waitingLine.value = WAITING_LINES[Math.floor(Math.random() * WAITING_LINES.length)]
  stage.value = 'drafting'
  try {
    if (!lookups.data.value) await lookups.reload()
    const draft = await api<OrderDraft>('/orders/draft', { method: 'POST', json: { note: text } })
    applyState(formStateFromDraft(draft, priceItems.value), true)
    noteOpen.value = false
  } catch (caught) {
    draftError.value = errorMessage(caught)
    applyState(formStateFromFailedDraft(text), false)
  }
  stage.value = 'form'
}

function fillItInMyself() {
  draftError.value = null
  applyState(formStateFromFailedDraft(''), false)
  stage.value = 'form'
}

function startAgain() {
  draftError.value = null
  error.value = null
  stage.value = 'note'
}

function chooseCandidate(candidate: DraftClient) {
  clientId.value = candidate.id
  clientMode.value = 'existing'
  candidatesPending.value = false
  touch('client')
}

function chooseNewClient() {
  clientMode.value = 'new'
  candidatesPending.value = false
  touch('client')
}

function pickClient(id: string | null) {
  clientId.value = id
  touch('client')
}

function addPrice(item: PriceItem) {
  quotePence.value = (quotePence.value ?? 0) + item.pricePence
  quoteFromItems.value = false
  added.value = [
    ...added.value,
    { key: nextKey++, itemId: item.id, name: item.name, pricePence: item.pricePence, counted: true },
  ]
  touch('quotePence')
}

function removePrice(key: number) {
  const item = added.value.find((entry) => entry.key === key)
  if (!item) return
  if (item.counted) quotePence.value = Math.max(0, (quotePence.value ?? 0) - item.pricePence)
  added.value = added.value.filter((entry) => entry.key !== key)
  touch('quotePence')
}

function setQuote(value: number | null) {
  quotePence.value = value
  quoteFromItems.value = false
  touch('quotePence')
}

function addGarment() {
  const garment = blankGarment()
  garments.value = [...garments.value, garment]
  touch('garments')
}

function removeGarment(key: number) {
  const garment = garments.value.find((item) => item.key === key)
  garment?.photos.forEach((photo) => URL.revokeObjectURL(photo.preview))
  garments.value = garments.value.filter((item) => item.key !== key)
  touch('garments')
}

async function addPhotos(garment: DraftGarment, event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  for (const file of files) {
    try {
      const blob = await shrinkPhoto(file)
      garment.photos.push({ blob, preview: URL.createObjectURL(blob) })
    } catch {
      toast(`${file.name} didn't open as a photo.`, { tone: 'error' })
    }
  }
}

function removePhoto(garment: DraftGarment, index: number) {
  const [photo] = garment.photos.splice(index, 1)
  if (photo) URL.revokeObjectURL(photo.preview)
}

onBeforeUnmount(() => garments.value.forEach((garment) => garment.photos.forEach((photo) => URL.revokeObjectURL(photo.preview))))

function clientInput() {
  if (!usingNewClient.value) return clientId.value ? { id: clientId.value } : null
  return {
    name: newClient.name,
    phone: newClient.phone,
    email: newClient.email.trim() || null,
    notes: newClient.notes.trim() || null,
  }
}

async function submit() {
  error.value = null
  const client = candidatesPending.value ? null : clientInput()
  if (!client) {
    error.value = 'Pick the client, or add a new one.'
    openRows.client = true
    return
  }
  if (quotePence.value === null) {
    error.value = 'What did you quote? Put in the price, even if it is a guess.'
    openRows.quote = true
    return
  }
  if (!dueDate.value) {
    error.value = 'When is it due?'
    openRows.dueDate = true
    return
  }
  const parsed = createOrderSchema.safeParse({
    client,
    description: description.value.trim() || (reviewing.value ? note.value.trim() : ''),
    quotePence: quotePence.value,
    dueDate: dueDate.value,
    express: express.value,
    garments: garments.value.map((garment) => ({ description: garment.description, assigneeIds: garment.assigneeIds })),
  })
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Check the form.'
    garments.value.forEach((garment) => {
      if (!garment.description.trim()) openRows[`garment-${garment.key}`] = true
    })
    return
  }

  busy.value = true
  try {
    const detail = await api<OrderDetail>('/orders', { method: 'POST', json: parsed.data })
    const failed = await uploadBeforePhotos(detail)
    if (failed) toast(`${failed} photo${failed === 1 ? '' : 's'} didn't send. Add them again on the order.`, { tone: 'error' })
    else toast(`${detail.order.number} is in. Lovely.`)
    await router.push({ name: 'order', params: { id: detail.order.id } })
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    busy.value = false
  }
}

async function uploadBeforePhotos(detail: OrderDetail) {
  const created = [...detail.order.garments].sort((a, b) => a.position - b.position)
  let failed = 0
  for (const [index, garment] of garments.value.entries()) {
    const saved = created[index]
    if (!saved) continue
    for (const photo of garment.photos) {
      try {
        await uploadGarmentPhoto(saved.id, photo.blob, { label: 'before' })
      } catch {
        failed += 1
      }
    }
  }
  return failed
}
</script>

<template>
  <div class="new-order stack-lg">
    <div class="stack">
      <RouterLink :to="{ name: 'home' }" class="small">← Orders</RouterLink>
      <h1>New order</h1>
      <p v-if="stage === 'note'" class="aside">Tell me about it the way you'd tell a friend. I'll do the paperwork.</p>
      <p v-else-if="stage === 'form' && reviewing" class="aside">Here's what I made of that. Mind the yellow bits.</p>
      <p v-else-if="stage === 'form'" class="aside">Tell me everything. Who, what, when, and what you promised them.</p>
    </div>

    <p v-if="lookups.error.value" class="error-note">{{ lookups.error.value }}</p>

    <form v-if="stage === 'note'" class="card stack" novalidate @submit.prevent="draftFromNote">
      <label class="field">
        <span>Tell me about the order</span>
        <textarea
          v-model="note"
          class="note-box"
          :maxlength="ORDER_NOTE_MAX"
          placeholder="Mrs Fake back again, wedding gown take in the bodice and hem, plus a bolero, Bea on the gown, needs it by the 12th, quoted 480"
        ></textarea>
      </label>
      <p v-if="draftError" class="error-note">{{ draftError }}</p>
      <div class="row">
        <button type="submit" class="btn">Draft it</button>
        <button type="button" class="btn-link" @click="fillItInMyself">I'll fill it in myself</button>
      </div>
    </form>

    <div v-else-if="stage === 'drafting'" class="card stack waiting" role="status">
      <p class="aside">{{ waitingLine }}</p>
      <p class="muted small">Won't be long.</p>
    </div>

    <form v-else class="stack-lg" novalidate @submit.prevent="submit">
      <p v-if="draftError" class="error-note">{{ draftError }} Your note is in the description below, so nothing is lost.</p>

      <section v-if="reviewing" class="card stack note-card">
        <div class="spread">
          <h2>Your note</h2>
          <span class="row">
            <button type="button" class="btn-link small" @click="noteOpen = !noteOpen">{{ noteOpen ? 'Hide' : 'Show' }}</button>
            <button type="button" class="btn-link small" @click="startAgain">Start again</button>
          </span>
        </div>
        <p class="note-text" :class="{ clipped: !noteOpen }">{{ note }}</p>
      </section>

      <section class="card stack">
        <h2>Client</h2>
        <DraftRow
          label="Who is it for?"
          :open="isOpen('client')"
          :summary="clientSummary"
          :check="marked('client')"
          :needed="reviewing && !clientReady && !candidatesPending"
          @update:open="openRows.client = $event"
          @looks-right="touch('client')"
        >
          <div v-if="candidatesPending" class="stack">
            <p><strong>New client, or one of these?</strong></p>
            <ul class="client-list">
              <li v-for="candidate in candidates" :key="candidate.id">
                <button type="button" class="client-option" @click="chooseCandidate(candidate)">
                  <strong>{{ candidate.name }}</strong>
                  <span class="muted small">{{ candidate.phone }}</span>
                </button>
              </li>
              <li>
                <button type="button" class="client-option" @click="chooseNewClient">
                  <strong>New client{{ newClient.name ? `: ${newClient.name}` : '' }}</strong>
                  <span class="muted small">Not one of these</span>
                </button>
              </li>
            </ul>
          </div>
          <template v-else>
            <div v-if="clients.length" class="row">
              <button
                type="button"
                class="btn btn-small"
                :class="{ 'btn-quiet': clientMode !== 'existing' }"
                @click="clientMode = 'existing'; touch('client')"
              >
                Existing
              </button>
              <button
                type="button"
                class="btn btn-small"
                :class="{ 'btn-quiet': clientMode !== 'new' }"
                @click="clientMode = 'new'; touch('client')"
              >
                New client
              </button>
            </div>

            <template v-if="!usingNewClient">
              <div v-if="chosenClient" class="chosen spread">
                <div>
                  <strong>{{ chosenClient.name }}</strong>
                  <p class="muted small">{{ [chosenClient.phone, chosenClient.email].filter(Boolean).join(' · ') }}</p>
                </div>
                <button type="button" class="btn-link" @click="pickClient(null)">Change</button>
              </div>
              <template v-else>
                <label class="field">
                  <span>Find a client</span>
                  <input v-model="clientSearch" type="search" placeholder="Name, phone or email" autocomplete="off" />
                </label>
                <ul class="client-list">
                  <li v-for="client in matchingClients" :key="client.id">
                    <button type="button" class="client-option" @click="pickClient(client.id)">
                      <strong>{{ client.name }}</strong>
                      <span class="muted small">{{ client.phone }}</span>
                    </button>
                  </li>
                  <li v-if="matchingClients.length === 0" class="muted small">
                    Nobody by that name. <button type="button" class="btn-link" @click="chooseNewClient">Add them</button>
                  </li>
                </ul>
              </template>
            </template>

            <div v-else class="grid-2">
              <label class="field">
                <span>Name</span>
                <input v-model="newClient.name" type="text" autocomplete="off" required @input="touch('client')" />
              </label>
              <label class="field">
                <span>Phone</span>
                <input v-model="newClient.phone" type="tel" autocomplete="off" required @input="touch('client')" />
              </label>
              <label class="field">
                <span>Email (optional)</span>
                <input v-model="newClient.email" type="email" autocomplete="off" @input="touch('client')" />
                <span class="field-hint">With an email, they hear from you when it's taken in and ready.</span>
              </label>
              <label class="field">
                <span>Notes (optional)</span>
                <input v-model="newClient.notes" type="text" autocomplete="off" />
              </label>
            </div>
          </template>
        </DraftRow>
      </section>

      <section class="card stack">
        <h2>The order</h2>
        <DraftRow
          label="What is it?"
          :open="isOpen('description')"
          :summary="description || 'Empty. Your note will be saved here.'"
          :check="marked('description')"
          :hint="descriptionFallsBackToNote ? 'Left empty, your note is saved as the description.' : undefined"
          @update:open="openRows.description = $event"
          @looks-right="touch('description')"
        >
          <textarea
            v-model="description"
            placeholder="Wedding gown alterations and a matching bolero"
            required
            @input="touch('description')"
          ></textarea>
        </DraftRow>

        <DraftRow
          label="Due date"
          :open="isOpen('dueDate')"
          :summary="dueDate ? formatDate(dueDate) : ''"
          :check="marked('dueDate')"
          :needed="reviewing && !dueDate"
          @update:open="openRows.dueDate = $event"
          @looks-right="touch('dueDate')"
        >
          <input v-model="dueDate" type="date" :min="today" required @input="touch('dueDate')" />
        </DraftRow>

        <DraftRow
          label="Quote"
          :open="isOpen('quote')"
          :summary="quoteSummary"
          :check="marked('quotePence')"
          :needed="reviewing && quotePence === null"
          :hint="quoteFromItems ? 'Added up from the price list items. Worth a look.' : undefined"
          @update:open="openRows.quote = $event"
          @looks-right="touch('quotePence')"
        >
          <PoundsInput :model-value="quotePence" placeholder="480" required @update:model-value="setQuote" />
          <div v-if="priceItems.length" class="stack">
            <span class="small muted">Tap to add to the quote</span>
            <div class="row">
              <button v-for="item in priceItems" :key="item.id" type="button" class="chip price" @click="addPrice(item)">
                {{ item.name }} {{ formatPence(item.pricePence) }}
              </button>
            </div>
            <div v-if="added.length" class="row small">
              <span class="muted">Picked:</span>
              <span v-for="item in added" :key="item.key" class="chip chip-soft">
                {{ item.name }}
                <button type="button" class="unadd" :aria-label="`Take ${item.name} off the quote`" @click="removePrice(item.key)">
                  ×
                </button>
              </span>
            </div>
          </div>
        </DraftRow>

        <DraftRow
          label="Express"
          :open="isOpen('express')"
          :summary="express ? 'Express. It jumps the queue everywhere.' : 'Normal queue'"
          :check="marked('express')"
          @update:open="openRows.express = $event"
          @looks-right="touch('express')"
        >
          <label class="check">
            <input v-model="express" type="checkbox" @change="touch('express')" />
            <span>Express. It jumps the queue everywhere.</span>
          </label>
        </DraftRow>
      </section>

      <section class="stack">
        <h2>Garments</h2>
        <div v-for="(garment, index) in garments" :key="garment.key">
          <DraftRow
            :label="`Garment ${String.fromCharCode(65 + index)}`"
            :open="isOpen(`garment-${garment.key}`)"
            :summary="garmentSummary(garment)"
            :check="checkedGarments.has(garment.key) && (marked('garments') || marked('assignees'))"
            :needed="reviewing && !garment.description.trim()"
            @update:open="openRows[`garment-${garment.key}`] = $event"
            @looks-right="touchGarment(garment)"
          >
            <label class="field">
              <span>What needs doing</span>
              <textarea
                v-model="garment.description"
                placeholder="Take in the bodice 2cm, hem to floor length"
                required
                @input="touchGarment(garment)"
              ></textarea>
            </label>
            <div class="field">
              <span>Who's sewing it</span>
              <AssigneePicker v-model="garment.assigneeIds" :members="members" @update:model-value="touchGarment(garment)" />
            </div>
            <div class="field">
              <span>Before photos (optional)</span>
              <div class="photos">
                <div v-for="(photo, photoIndex) in garment.photos" :key="photo.preview" class="thumb">
                  <img :src="photo.preview" alt="Before photo" />
                  <button type="button" class="unthumb" aria-label="Remove photo" @click="removePhoto(garment, photoIndex)">×</button>
                </div>
                <label class="add-photo">
                  <span>+ Photo</span>
                  <input type="file" accept="image/*" multiple class="visually-hidden" @change="addPhotos(garment, $event)" />
                </label>
              </div>
            </div>
            <button v-if="garments.length > 1" type="button" class="btn-link small remove" @click="removeGarment(garment.key)">
              Remove this garment
            </button>
          </DraftRow>
        </div>
        <button v-if="garments.length < 26" type="button" class="btn btn-quiet add-garment" @click="addGarment">
          Add another garment
        </button>
      </section>

      <p v-if="error" class="error-note">{{ error }}</p>
      <div class="row">
        <button type="submit" class="btn" :disabled="busy">{{ busy ? 'Pinning it all together…' : 'Take the order' }}</button>
        <RouterLink :to="{ name: 'home' }" class="btn-link">Cancel</RouterLink>
        <button v-if="!reviewing" type="button" class="btn-link" @click="startAgain">Back to the note</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.new-order {
  max-width: 48rem;
}

.note-box {
  min-height: 9rem;
  font-size: 1rem;
}

.waiting {
  text-align: center;
  padding: 2rem 1rem;
}

.note-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.note-text.clipped {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.remove {
  align-self: flex-start;
}

.chosen {
  padding: 0.6rem 0.75rem;
  background: var(--blush);
}

.client-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.client-option {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--line-soft);
  background: var(--paper);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.client-option:hover {
  border-color: var(--claret);
}

.price {
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.price:hover {
  border-color: var(--claret);
  color: var(--claret);
}

.unadd,
.unthumb {
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.photos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.thumb,
.add-photo {
  position: relative;
  width: 5.5rem;
  height: 5.5rem;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.unthumb {
  position: absolute;
  top: 0.15rem;
  right: 0.15rem;
  width: 1.5rem;
  height: 1.5rem;
  background: var(--ink);
  color: var(--ground);
}

.add-photo {
  display: grid;
  place-items: center;
  border: 2px dashed var(--line);
  color: var(--claret);
  font-weight: 600;
  cursor: pointer;
}

.add-garment {
  align-self: flex-start;
}
</style>
