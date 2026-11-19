<script setup lang="ts">
import type { TimeEntry } from '@seamless/shared'
import { computed } from 'vue'
import { formatDate, formatMinutes, formatTime } from '@/lib/format'
import { ENTRY_KIND_LABELS, REVIEW_STATUS_LABELS } from '@/lib/labels'

const props = defineProps<{
  entries: TimeEntry[]
  memberName: (id: string) => string
  garmentRef: (id: string) => string
}>()

const sorted = computed(() =>
  [...props.entries].sort(
    (a, b) => b.dateLocal.localeCompare(a.dateLocal) || (b.startedAt ?? b.createdAt).localeCompare(a.startedAt ?? a.createdAt),
  ),
)

const REVIEW_TONES = { waiting: 'chip-soft', approved: 'chip-ok', held_back: 'chip-warn' } as const
</script>

<template>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Who</th>
          <th>Garment</th>
          <th>What</th>
          <th class="right">Time</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in sorted" :key="entry.id">
          <td class="nowrap">{{ formatDate(entry.dateLocal) }}</td>
          <td>{{ memberName(entry.memberId) }}</td>
          <td class="nowrap">{{ entry.garmentId ? garmentRef(entry.garmentId) : 'General' }}</td>
          <td>
            {{ ENTRY_KIND_LABELS[entry.kind] }}
            <span v-if="entry.note" class="muted small note">{{ entry.note }}</span>
          </td>
          <td class="right num nowrap">
            <template v-if="entry.minutes !== null">{{ formatMinutes(entry.minutes) }}</template>
            <span v-else class="chip chip-soft">Running since {{ formatTime(entry.startedAt!) }}</span>
          </td>
          <td>
            <span class="row tags">
              <span v-if="entry.reviewStatus" class="chip" :class="REVIEW_TONES[entry.reviewStatus]">
                {{ REVIEW_STATUS_LABELS[entry.reviewStatus] }}
              </span>
              <span v-if="entry.invoiceId" class="chip">Invoiced</span>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.right {
  text-align: right;
}

.nowrap {
  white-space: nowrap;
}

.note {
  display: block;
}

.tags {
  gap: 0.25rem;
}

@media (max-width: 40rem) {
  thead {
    display: none;
  }

  tr {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.15rem 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px dashed var(--line-soft);
  }

  .table td {
    padding: 0;
    border: 0;
  }

  .right {
    text-align: right;
  }
}
</style>
