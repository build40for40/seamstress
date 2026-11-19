<script setup lang="ts">
import { createMemberSchema } from '@seamless/shared'
import { computed, reactive, ref } from 'vue'
import type { TeamMember } from '@/api-types'
import EmptyState from '@/components/EmptyState.vue'
import MemberInitials from '@/components/MemberInitials.vue'
import PoundsInput from '@/components/PoundsInput.vue'
import { api, errorMessage } from '@/composables/useApi'
import { useResource } from '@/composables/useResource'
import { useSession } from '@/composables/useSession'
import { toast } from '@/composables/useToast'
import { formatDate, formatPence, todayInLondon } from '@/lib/format'

const { member: me } = useSession()
const { data, error, loading, reload } = useResource(() =>
  api<{ members: TeamMember[] }>('/members').then((result) => result.members.filter((member) => !member.removedAt)),
)

const zones: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return ['Europe/London']
  }
})()

const links = ref<Record<string, string>>({})
const busy = ref<string | null>(null)

const add = reactive({ name: '', timeZone: 'Europe/London', payRatePence: null as number | null })
const addError = ref<string | null>(null)

async function addMember() {
  addError.value = null
  const parsed = createMemberSchema.safeParse({ ...add, payRatePence: add.payRatePence ?? undefined })
  if (!parsed.success) {
    addError.value = parsed.error.issues[0]?.message ?? 'Check the details.'
    return
  }
  busy.value = 'add'
  try {
    const result = await api<{ member: TeamMember; link: string }>('/members', { method: 'POST', json: parsed.data })
    links.value[result.member.id] = result.link
    add.name = ''
    add.payRatePence = null
    await reload()
    toast(`${result.member.name} is in. Send her the link below.`)
  } catch (caught) {
    addError.value = errorMessage(caught)
  } finally {
    busy.value = null
  }
}

async function newLink(member: TeamMember) {
  busy.value = member.id
  try {
    const result = await api<{ link: string }>(`/members/${member.id}/link`, { method: 'POST' })
    links.value[member.id] = result.link
    await reload()
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
  } finally {
    busy.value = null
  }
}

async function copy(link: string) {
  try {
    await navigator.clipboard.writeText(link)
    toast('Link copied.')
  } catch {
    toast("Couldn't copy. Select the link and copy it by hand.", { tone: 'error' })
  }
}

function whatsapp(member: TeamMember, link: string) {
  const text = `Hi ${member.name.split(' ')[0]}, here's your Seamless workroom link. Keep it to yourself: ${link}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

async function remove(member: TeamMember) {
  if (!window.confirm(`Remove ${member.name}? Their history stays, their access goes.`)) return
  busy.value = member.id
  try {
    await api(`/members/${member.id}`, { method: 'DELETE' })
    delete links.value[member.id]
    await reload()
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
  } finally {
    busy.value = null
  }
}

async function saveZone(member: TeamMember, timeZone: string) {
  if (timeZone === member.timeZone) return
  try {
    await api(`/members/${member.id}`, { method: 'PATCH', json: { timeZone } })
    await reload()
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
    await reload()
  }
}

const raise = reactive<{ memberId: string | null; ratePence: number | null; effectiveFrom: string }>({
  memberId: null,
  ratePence: null,
  effectiveFrom: todayInLondon(),
})

function startRaise(member: TeamMember) {
  raise.memberId = member.id
  raise.ratePence = member.payRatePence
  raise.effectiveFrom = todayInLondon()
}

async function saveRaise(member: TeamMember) {
  if (raise.ratePence === null) {
    toast('Add the new hourly rate.', { tone: 'error' })
    return
  }
  try {
    await api(`/members/${member.id}/pay-rates`, {
      method: 'POST',
      json: { ratePence: raise.ratePence, effectiveFrom: raise.effectiveFrom },
    })
    raise.memberId = null
    await reload()
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
  }
}

const openingWorkroom = ref(false)
async function openMyWorkroom() {
  if (!me.value) return
  openingWorkroom.value = true
  try {
    const result = await api<{ link: string }>(`/members/${me.value.id}/link`, { method: 'POST' })
    window.open(result.link, '_blank', 'noopener')
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
  } finally {
    openingWorkroom.value = false
  }
}

const members = computed(() => data.value ?? [])
const sortedRates = (member: TeamMember) => [...member.payRates].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
</script>

<template>
  <div class="stack-lg team">
    <div class="spread">
      <h1>Team</h1>
      <button type="button" class="btn btn-quiet" :disabled="openingWorkroom" @click="openMyWorkroom">
        Open my workroom
      </button>
    </div>

    <p v-if="error" class="error-note row">
      {{ error }} <button type="button" class="btn btn-small btn-quiet" @click="reload">Try again</button>
    </p>
    <p v-else-if="loading && !data" class="muted">Counting the thimbles…</p>
    <EmptyState v-else-if="members.length === 0" aside="Nobody here yet. Add your first seamstress below." />

    <div class="stack">
      <article v-for="member in members" :key="member.id" class="card stack">
        <div class="spread">
          <div class="row who">
            <MemberInitials :names="[member.name]" />
            <div>
              <strong>{{ member.name }}</strong>
              <span class="chip chip-soft role">{{ member.role === 'owner' ? 'Owner' : 'Seamstress' }}</span>
            </div>
          </div>
          <span class="num">{{ member.payRatePence === null ? 'No rate' : `${formatPence(member.payRatePence)} / hr` }}</span>
        </div>

        <label class="field">
          <span>Time zone</span>
          <input
            type="text"
            list="zones"
            :value="member.timeZone"
            @change="saveZone(member, ($event.target as HTMLInputElement).value)"
          />
        </label>

        <details class="rates">
          <summary class="small">Pay rate history</summary>
          <ul class="small">
            <li v-for="rate in sortedRates(member)" :key="rate.id" class="spread">
              <span>From {{ formatDate(rate.effectiveFrom) }}</span>
              <span class="num">{{ formatPence(rate.ratePence) }} / hr</span>
            </li>
          </ul>
          <form v-if="raise.memberId === member.id" class="raise" @submit.prevent="saveRaise(member)">
            <PoundsInput v-model="raise.ratePence" aria-label="New hourly rate" />
            <input v-model="raise.effectiveFrom" type="date" aria-label="Effective from" />
            <button type="submit" class="btn btn-small">Save rate</button>
            <button type="button" class="btn btn-small btn-quiet" @click="raise.memberId = null">Cancel</button>
          </form>
          <button v-else type="button" class="btn btn-small btn-quiet" @click="startRaise(member)">Change rate</button>
          <p class="field-hint">A new rate only applies from its date, so old months keep their pay.</p>
        </details>

        <div v-if="links[member.id]" class="link stack">
          <span class="sewn-label">Workroom link, shown once</span>
          <input type="text" readonly :value="links[member.id]" aria-label="Workroom link" @focus="($event.target as HTMLInputElement).select()" />
          <div class="row">
            <button type="button" class="btn btn-small" @click="copy(links[member.id]!)">Copy link</button>
            <a class="btn btn-small btn-quiet" :href="whatsapp(member, links[member.id]!)" target="_blank" rel="noopener">
              WhatsApp
            </a>
          </div>
        </div>

        <div class="row">
          <button type="button" class="btn btn-small btn-quiet" :disabled="busy === member.id" @click="newLink(member)">
            {{ member.hasLink ? 'New link' : 'Make a link' }}
          </button>
          <button
            v-if="member.id !== me?.id"
            type="button"
            class="btn btn-small btn-quiet"
            :disabled="busy === member.id"
            @click="remove(member)"
          >
            Remove
          </button>
        </div>
        <p v-if="member.hasLink && !links[member.id]" class="field-hint">
          Links can't be shown again. A new link replaces the old one.
        </p>
      </article>
    </div>

    <datalist id="zones">
      <option v-for="zone in zones" :key="zone" :value="zone" />
    </datalist>

    <form class="card stack" @submit.prevent="addMember">
      <h2>Add a seamstress</h2>
      <label class="field">
        <span>Name</span>
        <input v-model="add.name" type="text" required />
      </label>
      <label class="field">
        <span>Time zone</span>
        <input v-model="add.timeZone" type="text" list="zones" required />
      </label>
      <label class="field">
        <span>Hourly pay</span>
        <PoundsInput v-model="add.payRatePence" required />
      </label>
      <p v-if="addError" class="error-note">{{ addError }}</p>
      <div><button type="submit" class="btn" :disabled="busy === 'add'">Add and get link</button></div>
    </form>
  </div>
</template>

<style scoped>
.team {
  max-width: 44rem;
}

.who {
  min-width: 0;
}

.role {
  margin-left: 0.5rem;
}

.rates ul {
  margin: 0.5rem 0;
  padding: 0;
  list-style: none;
}

.raise {
  display: grid;
  grid-template-columns: 7rem 1fr auto auto;
  gap: 0.5rem;
  align-items: center;
  margin: 0.5rem 0;
}

.link {
  padding: 0.75rem;
  border: 2px dashed var(--line);
}

@media (max-width: 30rem) {
  .raise {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
