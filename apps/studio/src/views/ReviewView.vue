<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ReviewGroup } from '@/api-types'
import EmptyState from '@/components/EmptyState.vue'
import PhotoTile from '@/components/PhotoTile.vue'
import { api, errorMessage } from '@/composables/useApi'
import { useResource } from '@/composables/useResource'
import { refreshCounts } from '@/composables/useSession'
import { toast } from '@/composables/useToast'
import { formatDate, formatMinutes } from '@/lib/format'
import { ENTRY_KIND_LABELS } from '@/lib/labels'

type Decision = 'approved' | 'held_back'
type ReviewBody = {
  entries?: { id: string; status: Decision }[]
  photos?: { id: string; status: Decision }[]
  approveOrderId?: string
}

const { data, error, loading, reload } = useResource(() =>
  api<{ orders: ReviewGroup[] }>('/review').then((result) => result.orders),
)

const busy = ref(new Set<string>())
const groups = computed(() => (data.value ?? []).filter((group) => group.entries.length || group.photos.length))

const waitingMinutes = (group: ReviewGroup) => group.entries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0)

function drop(ids: { entries?: string[]; photos?: string[]; orderId?: string }) {
  data.value = (data.value ?? []).map((group) =>
    group.order.id === ids.orderId
      ? { ...group, entries: [], photos: [] }
      : {
          ...group,
          entries: group.entries.filter((entry) => !ids.entries?.includes(entry.id)),
          photos: group.photos.filter((photo) => !ids.photos?.includes(photo.id)),
        },
  )
}

async function decide(key: string, body: ReviewBody, message: string) {
  busy.value = new Set(busy.value).add(key)
  try {
    await api('/review', { method: 'POST', json: body })
    drop({
      entries: body.entries?.map((item) => item.id),
      photos: body.photos?.map((item) => item.id),
      orderId: body.approveOrderId,
    })
    toast(message)
    void refreshCounts()
  } catch (caught) {
    toast(errorMessage(caught), { tone: 'error' })
    void reload()
  } finally {
    const next = new Set(busy.value)
    next.delete(key)
    busy.value = next
  }
}

const decideEntry = (id: string, status: Decision) =>
  decide(id, { entries: [{ id, status }] }, status === 'approved' ? 'Approved. The client can see it.' : 'Held back. Still paid, never shown.')

const decidePhoto = (id: string, status: Decision) =>
  decide(id, { photos: [{ id, status }] }, status === 'approved' ? 'Photo approved.' : 'Photo held back.')

const approveAll = (group: ReviewGroup) =>
  decide(group.order.id, { approveOrderId: group.order.id }, `Everything on ${group.order.number} approved.`)
</script>

<template>
  <div class="stack-lg review">
    <div class="stack">
      <h1>Review</h1>
      <p class="aside">Nothing reaches a client until you've had a look. Approve it, or hold it back and keep it between us.</p>
    </div>

    <p v-if="error" class="error-note row">
      {{ error }} <button type="button" class="btn btn-small btn-quiet" @click="reload">Try again</button>
    </p>
    <p v-else-if="loading && !data" class="muted">Gathering the gossip…</p>
    <EmptyState v-else-if="groups.length === 0" aside="All caught up. Not a stitch waiting for you." />

    <section v-for="group in groups" :key="group.order.id" class="card stack group">
      <div class="spread">
        <div class="row">
          <RouterLink :to="{ name: 'order', params: { id: group.order.id } }" class="sewn-label">
            {{ group.order.number }}
          </RouterLink>
          <strong>{{ group.order.clientName ?? 'No client' }}</strong>
          <span v-if="group.order.express" class="chip chip-express">Express</span>
        </div>
        <button type="button" class="btn btn-small" :disabled="busy.has(group.order.id)" @click="approveAll(group)">
          Approve all
        </button>
      </div>
      <p class="small muted">
        <template v-if="group.entries.length">
          {{ group.entries.length }} {{ group.entries.length === 1 ? 'entry' : 'entries' }}, {{ formatMinutes(waitingMinutes(group)) }}
        </template>
        <template v-if="group.entries.length && group.photos.length"> · </template>
        <template v-if="group.photos.length">
          {{ group.photos.length }} {{ group.photos.length === 1 ? 'photo' : 'photos' }}
        </template>
      </p>

      <ul v-if="group.entries.length" class="items">
        <li v-for="entry in group.entries" :key="entry.id" class="item">
          <div class="what">
            <div class="row">
              <strong class="num">{{ formatMinutes(entry.minutes ?? 0) }}</strong>
              <span>{{ ENTRY_KIND_LABELS[entry.kind] }} on {{ entry.ref }}</span>
            </div>
            <span class="small muted">{{ entry.memberName }} · {{ formatDate(entry.dateLocal) }}</span>
            <span v-if="entry.note" class="small note">{{ entry.note }}</span>
          </div>
          <div class="row actions">
            <button type="button" class="btn btn-small" :disabled="busy.has(entry.id)" @click="decideEntry(entry.id, 'approved')">
              Approve
            </button>
            <button
              type="button"
              class="btn btn-quiet btn-small"
              :disabled="busy.has(entry.id)"
              @click="decideEntry(entry.id, 'held_back')"
            >
              Hold back
            </button>
          </div>
        </li>
      </ul>

      <div v-if="group.photos.length" class="photos">
        <div v-for="photo in group.photos" :key="photo.id" class="photo stack">
          <PhotoTile :photo="photo" :by="`${photo.memberName} · ${photo.ref}`" />
          <div class="row">
            <button type="button" class="btn btn-small" :disabled="busy.has(photo.id)" @click="decidePhoto(photo.id, 'approved')">
              Approve
            </button>
            <button
              type="button"
              class="btn btn-quiet btn-small"
              :disabled="busy.has(photo.id)"
              @click="decidePhoto(photo.id, 'held_back')"
            >
              Hold back
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.review {
  max-width: 56rem;
}

.items {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  padding: 0.6rem 0;
  border-top: 1px dashed var(--line-soft);
}

.what {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.note {
  overflow-wrap: anywhere;
  font-style: italic;
}

.photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: 1rem;
}

.photo {
  gap: 0.5rem;
}
</style>
