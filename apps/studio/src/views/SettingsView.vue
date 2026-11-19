<script setup lang="ts">
import { updateTeamSchema, type PriceItem } from '@seamstress/shared'
import { reactive, ref, watchEffect } from 'vue'
import PoundsInput from '@/components/PoundsInput.vue'
import { api, errorMessage } from '@/composables/useApi'
import { useResource } from '@/composables/useResource'
import { setTeam, useSession } from '@/composables/useSession'
import { toast } from '@/composables/useToast'
import { formatPence } from '@/lib/format'

const { team } = useSession()

const form = reactive({
  name: '',
  replyToEmail: '',
  hourlyRatePence: null as number | null,
  autoEmailClients: true,
  showPayEstimate: true,
})
const saving = ref(false)
const formError = ref<string | null>(null)

let loaded = false
watchEffect(() => {
  if (loaded || !team.value) return
  loaded = true
  form.name = team.value.name
  form.replyToEmail = team.value.replyToEmail
  form.hourlyRatePence = team.value.hourlyRatePence
  form.autoEmailClients = team.value.autoEmailClients
  form.showPayEstimate = team.value.showPayEstimate
})

async function saveTeam() {
  formError.value = null
  const parsed = updateTeamSchema.safeParse({ ...form, hourlyRatePence: form.hourlyRatePence ?? undefined })
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? 'Check the details.'
    return
  }
  saving.value = true
  try {
    const result = await api<{ team: NonNullable<typeof team.value> }>('/team', { method: 'PATCH', json: parsed.data })
    setTeam(result.team)
    toast('Saved. Looking sharp.')
  } catch (caught) {
    formError.value = errorMessage(caught)
  } finally {
    saving.value = false
  }
}

async function toggle(key: 'autoEmailClients' | 'showPayEstimate') {
  const previous = !form[key]
  try {
    const result = await api<{ team: NonNullable<typeof team.value> }>('/team', {
      method: 'PATCH',
      json: { [key]: form[key] },
    })
    setTeam(result.team)
  } catch (caught) {
    form[key] = previous
    toast(errorMessage(caught), { tone: 'error' })
  }
}

const prices = useResource(() => api<{ priceItems: PriceItem[] }>('/price-items').then((r) => r.priceItems))
const newName = ref('')
const newPrice = ref<number | null>(null)
const editing = ref<string | null>(null)
const editName = ref('')
const editPrice = ref<number | null>(null)
const priceError = ref<string | null>(null)

async function addPrice() {
  priceError.value = null
  if (!newName.value.trim() || newPrice.value === null) {
    priceError.value = 'Give the job a name and a price.'
    return
  }
  try {
    await api('/price-items', { method: 'POST', json: { name: newName.value.trim(), pricePence: newPrice.value } })
    newName.value = ''
    newPrice.value = null
    await prices.reload()
  } catch (caught) {
    priceError.value = errorMessage(caught)
  }
}

function startEdit(item: PriceItem) {
  editing.value = item.id
  editName.value = item.name
  editPrice.value = item.pricePence
}

async function saveEdit(item: PriceItem) {
  if (!editName.value.trim() || editPrice.value === null) {
    toast('Give the job a name and a price.', { tone: 'error' })
    return
  }
  try {
    await api(`/price-items/${item.id}`, { method: 'PATCH', json: { name: editName.value.trim(), pricePence: editPrice.value } })
    editing.value = null
    await prices.reload()
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
  }
}

async function archive(item: PriceItem) {
  try {
    await api(`/price-items/${item.id}`, { method: 'DELETE' })
    await prices.reload()
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
  }
}
</script>

<template>
  <div class="stack-lg settings">
    <h1>Settings</h1>

    <form class="card stack" @submit.prevent="saveTeam">
      <h2>Your atelier</h2>
      <label class="field">
        <span>Name</span>
        <input v-model="form.name" type="text" required />
      </label>
      <label class="field">
        <span>Reply-to email</span>
        <input v-model="form.replyToEmail" type="email" required />
        <span class="field-hint">Where client replies land.</span>
      </label>
      <label class="field">
        <span>Hourly rate</span>
        <PoundsInput v-model="form.hourlyRatePence" required />
        <span class="field-hint">What a billable hour costs the client.</span>
      </label>
      <p v-if="formError" class="error-note">{{ formError }}</p>
      <div><button type="submit" class="btn" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button></div>
    </form>

    <section class="card stack">
      <h2>The small print</h2>
      <label class="check">
        <input v-model="form.autoEmailClients" type="checkbox" @change="toggle('autoEmailClients')" />
        <span>Email clients automatically when their order moves along</span>
      </label>
      <label class="check">
        <input v-model="form.showPayEstimate" type="checkbox" @change="toggle('showPayEstimate')" />
        <span>Show seamstresses their estimated pay</span>
      </label>
    </section>

    <section class="card stack">
      <h2>Price list</h2>
      <p class="aside">The jobs you quote again and again. They show up as chips on a new order.</p>
      <p v-if="prices.error.value" class="error-note">{{ prices.error.value }}</p>
      <ul v-if="prices.data.value?.length" class="prices">
        <li v-for="item in prices.data.value.filter((p) => !p.archivedAt)" :key="item.id">
          <form v-if="editing === item.id" class="price-row" @submit.prevent="saveEdit(item)">
            <input v-model="editName" type="text" aria-label="Name" />
            <PoundsInput v-model="editPrice" />
            <button type="submit" class="btn btn-small">Save</button>
            <button type="button" class="btn btn-small btn-quiet" @click="editing = null">Cancel</button>
          </form>
          <div v-else class="price-row">
            <span>{{ item.name }}</span>
            <span class="num">{{ formatPence(item.pricePence) }}</span>
            <button type="button" class="btn btn-small btn-quiet" @click="startEdit(item)">Edit</button>
            <button type="button" class="btn btn-small btn-quiet" @click="archive(item)">Remove</button>
          </div>
        </li>
      </ul>
      <p v-else-if="prices.data.value" class="muted small">Nothing on the list yet.</p>

      <form class="price-row" @submit.prevent="addPrice">
        <input v-model="newName" type="text" placeholder="Hem trousers" aria-label="Job name" />
        <PoundsInput v-model="newPrice" placeholder="25" />
        <button type="submit" class="btn btn-small">Add</button>
      </form>
      <p v-if="priceError" class="error-note">{{ priceError }}</p>
    </section>
  </div>
</template>

<style scoped>
.settings {
  max-width: 40rem;
}

.prices {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.price-row {
  display: grid;
  grid-template-columns: 1fr 7rem auto auto;
  gap: 0.5rem;
  align-items: center;
}

.price-row > :first-child {
  min-width: 0;
}

@media (max-width: 30rem) {
  .price-row {
    grid-template-columns: 1fr 6rem;
  }
}
</style>
