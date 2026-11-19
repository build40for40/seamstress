<script setup lang="ts">
import TapeMeasure from '@/components/TapeMeasure.vue'
import { signOut } from '@/composables/useAuth'
import { useSession } from '@/composables/useSession'

const { team, counts } = useSession()
</script>

<template>
  <TapeMeasure />
  <header class="studio-header">
    <RouterLink :to="{ name: 'home' }" class="brand">
      <span class="wordmark">Seamless</span>
      <span v-if="team" class="atelier">{{ team.name }}</span>
    </RouterLink>
    <nav aria-label="Studio">
      <RouterLink :to="{ name: 'home' }" exact-active-class="current">Orders</RouterLink>
      <RouterLink :to="{ name: 'review' }" active-class="current">
        Review
        <span v-if="counts?.waitingReviews" class="badge" :aria-label="`${counts.waitingReviews} waiting`">
          {{ counts.waitingReviews }}
        </span>
      </RouterLink>
      <RouterLink :to="{ name: 'timesheets' }" active-class="current">
        Timesheets
        <span v-if="counts?.sentTimesheets" class="badge" :aria-label="`${counts.sentTimesheets} sent`">
          {{ counts.sentTimesheets }}
        </span>
      </RouterLink>
      <RouterLink :to="{ name: 'team' }" active-class="current">Team</RouterLink>
      <RouterLink :to="{ name: 'settings' }" active-class="current">Settings</RouterLink>
      <button type="button" class="btn-link sign-out" @click="signOut">Sign out</button>
    </nav>
  </header>
  <main class="studio-main">
    <RouterView />
  </main>
</template>

<style scoped>
.studio-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 2rem;
  align-items: center;
  justify-content: space-between;
  max-width: 72rem;
  margin: 0 auto;
  padding: 1rem;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.wordmark {
  font-family: var(--serif);
  font-style: italic;
  font-weight: 500;
  font-size: 1.6rem;
  color: var(--claret);
}

.atelier {
  overflow: hidden;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 1.1rem;
}

nav a {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0;
  border-bottom: 2px solid transparent;
  color: var(--ink);
  font-weight: 500;
  text-decoration: none;
}

nav a.current {
  border-bottom-color: var(--claret);
  color: var(--claret);
}

.badge {
  min-width: 1.3rem;
  padding: 0 0.35rem;
  border-radius: 1rem;
  background: var(--claret);
  color: #fff;
  font-size: 0.75rem;
  text-align: center;
}

.sign-out {
  color: var(--muted);
  font-size: 0.9rem;
}

.studio-main {
  max-width: 72rem;
  margin: 0 auto;
  padding: 0.5rem 1rem 4rem;
}

@media print {
  .studio-header {
    display: none;
  }

  .studio-main {
    max-width: none;
    padding: 0;
  }
}
</style>
