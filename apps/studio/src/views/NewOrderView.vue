<script setup lang="ts">
import { createOrderSchema, type Client, type PriceItem } from '@seamstress/shared'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { OrderDetail, TeamMember } from '@/api-types'
import AssigneePicker from '@/components/AssigneePicker.vue'
import PoundsInput from '@/components/PoundsInput.vue'
import { api, errorMessage, uploadGarmentPhoto } from '@/composables/useApi'
import { useResource } from '@/composables/useResource'
import { toast } from '@/composables/useToast'
import { formatPence, todayInLondon } from '@/lib/format'
import { shrinkPhoto } from '@/lib/photos'

type DraftPhoto = { blob: Blob; preview: string }
type DraftGarment = { key: number; description: string; assigneeIds: string[]; photos: DraftPhoto[] }

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

const clientMode = ref<'existing' | 'new'>('existing')
const clientSearch = ref('')
const clientId = ref<string | null>(null)
const newClient = reactive({ name: '', phone: '', email: '', notes: '' })

const description = ref('')
const dueDate = ref('')
const express = ref(false)
const quotePence = ref<number | null>(null)
const added = ref<{ key: number; name: string; pricePence: number }[]>([])

let nextKey = 1
const garments = ref<DraftGarment[]>([{ key: nextKey++, description: '', assigneeIds: [], photos: [] }])

const error = ref<string | null>(null)
const busy = ref(false)
const today = todayInLondon()

const clients = computed(() => lookups.data.value?.clients ?? [])
const matchingClients = computed(() => {
  const query = clientSearch.value.trim().toLowerCase()
  const list = query
    ? clients.value.filter((client) => `${client.name} ${client.phone} ${client.email ?? ''}`.toLowerCase().includes(query))
    : clients.value
  return list.slice(0, 8)
})
const chosenClient = computed(() => clients.value.find((client) => client.id === clientId.value) ?? null)
const usingNewClient = computed(() => clientMode.value === 'new' || clients.value.length === 0)

function addPrice(item: PriceItem) {
  quotePence.value = (quotePence.value ?? 0) + item.pricePence
  added.value = [...added.value, { key: nextKey++, name: item.name, pricePence: item.pricePence }]
}

function removePrice(key: number) {
  const item = added.value.find((entry) => entry.key === key)
  if (!item) return
  quotePence.value = Math.max(0, (quotePence.value ?? 0) - item.pricePence)
  added.value = added.value.filter((entry) => entry.key !== key)
}

function addGarment() {
  garments.value = [...garments.value, { key: nextKey++, description: '', assigneeIds: [], photos: [] }]
}

function removeGarment(key: number) {
  const garment = garments.value.find((item) => item.key === key)
  garment?.photos.forEach((photo) => URL.revokeObjectURL(photo.preview))
  garments.value = garments.value.filter((item) => item.key !== key)
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
  const client = clientInput()
  if (!client) {
    error.value = 'Pick the client, or add a new one.'
    return
  }
  if (quotePence.value === null) {
    error.value = 'What did you quote? Put in the price, even if it is a guess.'
    return
  }
  if (!dueDate.value) {
    error.value = 'When is it due?'
    return
  }
  const parsed = createOrderSchema.safeParse({
    client,
    description: description.value,
    quotePence: quotePence.value,
    dueDate: dueDate.value,
    express: express.value,
    garments: garments.value.map((garment) => ({ description: garment.description, assigneeIds: garment.assigneeIds })),
  })
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Check the form.'
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
  <form class="new-order stack-lg" novalidate @submit.prevent="submit">
    <div class="stack">
      <RouterLink :to="{ name: 'home' }" class="small">← Orders</RouterLink>
      <h1>New order</h1>
      <p class="aside">Tell me everything. Who, what, when, and what you promised them.</p>
    </div>

    <p v-if="lookups.error.value" class="error-note">{{ lookups.error.value }}</p>

    <section class="card stack">
      <div class="spread">
        <h2>Client</h2>
        <div v-if="clients.length" class="row">
          <button
            type="button"
            class="btn btn-small"
            :class="{ 'btn-quiet': clientMode !== 'existing' }"
            @click="clientMode = 'existing'"
          >
            Existing
          </button>
          <button
            type="button"
            class="btn btn-small"
            :class="{ 'btn-quiet': clientMode !== 'new' }"
            @click="clientMode = 'new'"
          >
            New client
          </button>
        </div>
      </div>

      <template v-if="!usingNewClient">
        <div v-if="chosenClient" class="chosen spread">
          <div>
            <strong>{{ chosenClient.name }}</strong>
            <p class="muted small">{{ [chosenClient.phone, chosenClient.email].filter(Boolean).join(' · ') }}</p>
          </div>
          <button type="button" class="btn-link" @click="clientId = null">Change</button>
        </div>
        <template v-else>
          <label class="field">
            <span>Find a client</span>
            <input v-model="clientSearch" type="search" placeholder="Name, phone or email" autocomplete="off" />
          </label>
          <ul class="client-list">
            <li v-for="client in matchingClients" :key="client.id">
              <button type="button" class="client-option" @click="clientId = client.id">
                <strong>{{ client.name }}</strong>
                <span class="muted small">{{ client.phone }}</span>
              </button>
            </li>
            <li v-if="matchingClients.length === 0" class="muted small">
              Nobody by that name. <button type="button" class="btn-link" @click="clientMode = 'new'">Add them</button>
            </li>
          </ul>
        </template>
      </template>

      <div v-else class="grid-2">
        <label class="field">
          <span>Name</span>
          <input v-model="newClient.name" type="text" autocomplete="off" required />
        </label>
        <label class="field">
          <span>Phone</span>
          <input v-model="newClient.phone" type="tel" autocomplete="off" required />
        </label>
        <label class="field">
          <span>Email (optional)</span>
          <input v-model="newClient.email" type="email" autocomplete="off" />
          <span class="field-hint">With an email, they hear from you when it's taken in and ready.</span>
        </label>
        <label class="field">
          <span>Notes (optional)</span>
          <input v-model="newClient.notes" type="text" autocomplete="off" />
        </label>
      </div>
    </section>

    <section class="card stack">
      <h2>The order</h2>
      <label class="field">
        <span>What is it?</span>
        <textarea v-model="description" placeholder="Wedding gown alterations and a matching bolero" required></textarea>
      </label>
      <div class="grid-2">
        <label class="field">
          <span>Due date</span>
          <input v-model="dueDate" type="date" :min="today" required />
        </label>
        <label class="field">
          <span>Quote</span>
          <PoundsInput v-model="quotePence" placeholder="480" required />
        </label>
      </div>
      <label class="check">
        <input v-model="express" type="checkbox" />
        <span>Express. It jumps the queue everywhere.</span>
      </label>
      <div v-if="lookups.data.value?.priceItems.length" class="stack">
        <span class="small muted">Tap to add to the quote</span>
        <div class="row">
          <button
            v-for="item in lookups.data.value.priceItems"
            :key="item.id"
            type="button"
            class="chip price"
            @click="addPrice(item)"
          >
            {{ item.name }} {{ formatPence(item.pricePence) }}
          </button>
        </div>
        <div v-if="added.length" class="row small">
          <span class="muted">Added:</span>
          <span v-for="item in added" :key="item.key" class="chip chip-soft">
            {{ item.name }}
            <button type="button" class="unadd" :aria-label="`Take ${item.name} off the quote`" @click="removePrice(item.key)">
              ×
            </button>
          </span>
        </div>
      </div>
    </section>

    <section class="stack">
      <h2>Garments</h2>
      <div v-for="(garment, index) in garments" :key="garment.key" class="card stack">
        <div class="spread">
          <h3>Garment {{ String.fromCharCode(65 + index) }}</h3>
          <button v-if="garments.length > 1" type="button" class="btn-link small" @click="removeGarment(garment.key)">
            Remove
          </button>
        </div>
        <label class="field">
          <span>What needs doing</span>
          <textarea v-model="garment.description" placeholder="Take in the bodice 2cm, hem to floor length" required></textarea>
        </label>
        <div class="field">
          <span>Who's sewing it</span>
          <AssigneePicker v-model="garment.assigneeIds" :members="lookups.data.value?.members ?? []" />
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
      </div>
      <button v-if="garments.length < 26" type="button" class="btn btn-quiet add-garment" @click="addGarment">
        Add another garment
      </button>
    </section>

    <p v-if="error" class="error-note">{{ error }}</p>
    <div class="row">
      <button type="submit" class="btn" :disabled="busy">{{ busy ? 'Pinning it all together…' : 'Take the order' }}</button>
      <RouterLink :to="{ name: 'home' }" class="btn-link">Cancel</RouterLink>
    </div>
  </form>
</template>

<style scoped>
.new-order {
  max-width: 48rem;
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
