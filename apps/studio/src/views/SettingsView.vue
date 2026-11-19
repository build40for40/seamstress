<script setup lang="ts">
import { businessDetailsSchema, updateTeamSchema, type BusinessDetails, type PriceItem } from '@seamstress/shared'
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

const BUSINESS_FIELDS = Object.keys(businessDetailsSchema.shape) as (keyof BusinessDetails)[]
const business = reactive(Object.fromEntries(BUSINESS_FIELDS.map((field) => [field, ''])) as Record<keyof BusinessDetails, string>)
const savingBusiness = ref(false)
const businessError = ref<string | null>(null)

function fillBusiness(details: BusinessDetails) {
  for (const field of BUSINESS_FIELDS) business[field] = details[field] ?? ''
}

let loaded = false
watchEffect(() => {
  if (loaded || !team.value) return
  loaded = true
  form.name = team.value.name
  form.replyToEmail = team.value.replyToEmail
  form.hourlyRatePence = team.value.hourlyRatePence
  form.autoEmailClients = team.value.autoEmailClients
  form.showPayEstimate = team.value.showPayEstimate
  fillBusiness(team.value)
})

async function saveBusiness() {
  businessError.value = null
  const parsed = businessDetailsSchema.safeParse(business)
  if (!parsed.success) {
    businessError.value = parsed.error.issues[0]?.message ?? 'Check the details.'
    return
  }
  savingBusiness.value = true
  try {
    const result = await api<{ team: NonNullable<typeof team.value> }>('/team', { method: 'PATCH', json: parsed.data })
    setTeam(result.team)
    fillBusiness(result.team)
    toast('Saved. Your invoices know where the money goes.')
  } catch (caught) {
    businessError.value = errorMessage(caught)
  } finally {
    savingBusiness.value = false
  }
}

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

    <form class="card stack" @submit.prevent="saveBusiness">
      <h2>Getting paid</h2>
      <p class="aside">These go on your invoices, so clients know who you are and where to send the money. Only you can see or change them.</p>
      <label class="field">
        <span>Business address</span>
        <textarea v-model="business.businessAddress" rows="3" autocomplete="street-address"></textarea>
      </label>
      <div class="pair">
        <label class="field">
          <span>Company number</span>
          <input v-model="business.companyNumber" type="text" />
          <span class="field-hint">Limited companies only.</span>
        </label>
        <label class="field">
          <span>VAT number</span>
          <input v-model="business.vatNumber" type="text" />
          <span class="field-hint">If you're registered.</span>
        </label>
      </div>
      <label class="field">
        <span>Account name</span>
        <input v-model="business.bankAccountName" type="text" autocomplete="off" />
        <span class="field-hint">Exactly as your bank has it. Your client's bank checks the name.</span>
      </label>
      <div class="pair">
        <label class="field">
          <span>Sort code</span>
          <input v-model="business.bankSortCode" type="text" inputmode="numeric" placeholder="00-00-00" autocomplete="off" />
        </label>
        <label class="field">
          <span>Account number</span>
          <input v-model="business.bankAccountNumber" type="text" inputmode="numeric" placeholder="8 digits" autocomplete="off" />
        </label>
      </div>
      <div class="pair">
        <label class="field">
          <span>IBAN</span>
          <input v-model="business.bankIban" type="text" autocomplete="off" />
          <span class="field-hint">For clients paying from abroad.</span>
        </label>
        <label class="field">
          <span>BIC</span>
          <input v-model="business.bankBic" type="text" autocomplete="off" />
        </label>
      </div>
      <label class="field">
        <span>Payment terms</span>
        <input v-model="business.paymentTerms" type="text" placeholder="Please pay within 14 days." />
      </label>
      <p v-if="businessError" class="error-note">{{ businessError }}</p>
      <p class="small muted">We email you whenever the bank details change, in case it wasn't you.</p>
      <div><button type="submit" class="btn" :disabled="savingBusiness">{{ savingBusiness ? 'Saving…' : 'Save' }}</button></div>
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

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 30rem) {
  .pair {
    grid-template-columns: 1fr;
  }
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
