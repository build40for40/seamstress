<script setup lang="ts">
import type { Activity } from '@seamstress/shared'
import { computed } from 'vue'
import { formatDateTime } from '@/lib/format'
import { describeActivity, type ActivityLookups } from '@/lib/labels'

const props = defineProps<{ activity: Activity[]; lookups: ActivityLookups }>()

const items = computed(() =>
  [...props.activity]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({
      id: item.id,
      text: describeActivity(item, props.lookups),
      who: item.memberId ? props.lookups.memberName(item.memberId) : undefined,
      when: formatDateTime(item.createdAt),
      failed: item.kind === 'email' && item.detail?.status === 'failed',
    })),
)
</script>

<template>
  <ol class="activity">
    <li v-for="item in items" :key="item.id" :class="{ failed: item.failed }">
      <span>{{ item.text }}</span>
      <span class="muted small">{{ item.when }}<template v-if="item.who"> · {{ item.who }}</template></span>
    </li>
  </ol>
</template>

<style scoped>
.activity {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 0;
  padding: 0 0 0 1rem;
  border-left: 2px dashed var(--line);
  list-style: none;
}

.activity li {
  display: flex;
  flex-direction: column;
  overflow-wrap: anywhere;
}

.failed > span:first-child {
  color: var(--red);
}
</style>
