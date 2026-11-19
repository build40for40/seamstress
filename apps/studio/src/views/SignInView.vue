<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import TapeMeasure from '@/components/TapeMeasure.vue'
import { signIn } from '@/composables/useAuth'

const route = useRoute()
const busy = ref(false)
const error = ref<string | null>(
  route.query.failed ? "We couldn't load your atelier. Sign in again, or try in a moment." : null,
)

async function go() {
  busy.value = true
  error.value = null
  try {
    await signIn(typeof route.query.next === 'string' ? route.query.next : '/')
  } catch {
    error.value = "Sign in didn't start. Check your connection and try again."
    busy.value = false
  }
}
</script>

<template>
  <TapeMeasure />
  <main class="sign-in">
    <span class="wordmark">Seamless</span>
    <h1>Every hour, billed and paid.</h1>
    <p class="aside">Orders, hours, invoices and timesheets for your atelier. Darling, sign in and let's get to work.</p>
    <button type="button" class="btn" :disabled="busy" @click="go">{{ busy ? 'Off we go…' : 'Sign in' }}</button>
    <p v-if="error" class="error-note">{{ error }}</p>
    <p class="muted small">Seamstresses don't sign in here. They open the personal link their atelier sent them.</p>
  </main>
</template>

<style scoped>
.sign-in {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  max-width: 32rem;
  margin: 0 auto;
  padding: 3rem 1rem;
}

.wordmark {
  font-family: var(--serif);
  font-style: italic;
  font-size: 1.6rem;
  color: var(--claret);
}
</style>
