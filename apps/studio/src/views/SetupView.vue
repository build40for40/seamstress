<script setup lang="ts">
import { createTeamSchema, type Member, type Team } from '@seamstress/shared'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PoundsInput from '@/components/PoundsInput.vue'
import TapeMeasure from '@/components/TapeMeasure.vue'
import { api, errorMessage } from '@/composables/useApi'
import { currentUser, signOut } from '@/composables/useAuth'
import { setSession } from '@/composables/useSession'

const router = useRouter()

const name = ref('')
const yourName = ref('')
const replyToEmail = ref('')
const hourlyRatePence = ref<number | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)

onMounted(async () => {
  const user = await currentUser()
  if (!user) return
  replyToEmail.value ||= user.email
  yourName.value ||= [user.firstName, user.lastName].filter(Boolean).join(' ')
})

async function submit() {
  error.value = null
  const parsed = createTeamSchema.safeParse({
    name: name.value,
    replyToEmail: replyToEmail.value,
    hourlyRatePence: hourlyRatePence.value ?? undefined,
  })
  if (!parsed.success) {
    error.value = hourlyRatePence.value ? (parsed.error.issues[0]?.message ?? 'Check the form.') : 'Set your hourly rate.'
    return
  }
  busy.value = true
  try {
    const created = await api<{ member: Member; team: Team }>('/teams', { method: 'POST', json: parsed.data })
    let member = created.member
    if (yourName.value.trim()) {
      member = await api<{ member: Member }>(`/members/${member.id}`, {
        method: 'PATCH',
        json: { name: yourName.value.trim() },
      })
        .then((result) => result.member ?? created.member)
        .catch(() => created.member)
    }
    setSession(member, created.team, { waitingReviews: 0, sentTimesheets: 0, readyToCollect: 0 })
    await router.replace({ name: 'home' })
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <TapeMeasure />
  <main class="setup">
    <span class="wordmark">Seamless</span>
    <h1>Set up your atelier</h1>
    <p class="aside">Three things and you're open for business. You can change any of them later.</p>
    <form class="stack" novalidate @submit.prevent="submit">
      <label class="field">
        <span>Atelier name</span>
        <input v-model="name" type="text" autocomplete="organization" placeholder="Needle & Thread Atelier" required />
      </label>
      <label class="field">
        <span>Your name</span>
        <input v-model="yourName" type="text" autocomplete="name" />
        <span class="field-hint">It goes on the order history next to what you do.</span>
      </label>
      <label class="field">
        <span>Where client replies go</span>
        <input v-model="replyToEmail" type="email" autocomplete="email" required />
        <span class="field-hint">Emails to clients come from Seamless, and their replies land here.</span>
      </label>
      <label class="field">
        <span>Hourly rate for clients</span>
        <PoundsInput v-model="hourlyRatePence" placeholder="60" required />
        <span class="field-hint">Every hour logged is billed at this, before you pick the final price.</span>
      </label>
      <p v-if="error" class="error-note">{{ error }}</p>
      <div class="row">
        <button type="submit" class="btn" :disabled="busy">{{ busy ? 'Opening the doors…' : 'Open my atelier' }}</button>
        <button type="button" class="btn-link" @click="signOut">Sign out</button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.setup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 32rem;
  margin: 0 auto;
  padding: 2.5rem 1rem;
}

.wordmark {
  font-family: var(--serif);
  font-style: italic;
  font-size: 1.6rem;
  color: var(--claret);
}
</style>
