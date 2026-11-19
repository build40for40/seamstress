import type { Member, Team } from '@seamless/shared'
import { computed, readonly, ref } from 'vue'
import type { Session, SessionCounts } from '@/api-types'
import { api } from './useApi'

const session = ref<Session | null>(null)
let loading: Promise<Session> | null = null

export function loadSession({ force = false } = {}): Promise<Session> {
  if (session.value && !force) return Promise.resolve(session.value)
  loading ??= api<Session>('/session')
    .then((loaded) => (session.value = loaded))
    .finally(() => (loading = null))
  return loading
}

export function setSession(member: Member, team: Team, counts: SessionCounts | null = null) {
  session.value = { member, team, counts: counts ?? session.value?.counts ?? null }
}

export function setTeam(team: Team) {
  if (session.value) session.value = { ...session.value, team }
}

export function refreshCounts() {
  return loadSession({ force: true }).catch(() => session.value)
}

export function clearSession() {
  session.value = null
}

export function useSession() {
  return {
    session: readonly(session),
    team: computed(() => session.value?.team ?? null),
    member: computed(() => session.value?.member ?? null),
    counts: computed(() => session.value?.counts ?? null),
    refreshCounts,
  }
}
