<script setup lang="ts">
withDefaults(
  defineProps<{
    name: 'machine' | 'dress' | 'scissors' | 'spool' | 'needle' | 'back' | 'next' | 'check' | 'lock' | 'unlink' | 'alert' | 'plus'
    size?: number
  }>(),
  { size: 20 },
)
</script>

<template>
  <svg
    v-if="name === 'machine'"
    aria-hidden="true"
    :width="size"
    :height="size * 0.75"
    viewBox="0 0 64 48"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M10 12h36a6 6 0 0 1 6 6v20H40V24H22v4H10z" fill="#F3E1E7" />
    <rect x="4" y="38" width="56" height="6" rx="2" fill="#F3E1E7" />
    <circle cx="56" cy="20" r="4" fill="#FBF6F4" />
    <rect x="28" y="6" width="6" height="6" fill="#FBF6F4" />
    <path d="M31 6V3" />
    <path d="M16 28v7" />
    <path d="M13 35h6" />
    <circle cx="31" cy="18" r="2" />
    <path d="M34 9c6 0 8 3 8 3" />
  </svg>
  <svg
    v-else-if="name === 'dress'"
    aria-hidden="true"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="#F6EEEC"
    stroke="#54435A"
    stroke-width="0.6"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M10 3h4v2c2 1 4 2 4 4 0 2-2 3-2 5s1 3 1 5H7c0-2 1-3 1-5s-2-3-2-5c0-2 2-3 4-4z" />
    <path d="M12 19v3" />
    <path d="M9 22h6" />
  </svg>
  <svg
    v-else
    aria-hidden="true"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    style="flex: none"
  >
    <template v-if="name === 'scissors'">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.5 8L20 19" />
      <path d="M8.5 16L20 5" />
    </template>
    <template v-else-if="name === 'spool'">
      <path d="M6 4h12" />
      <path d="M6 20h12" />
      <rect x="8" y="4" width="8" height="16" />
      <path d="M8 9h8" />
      <path d="M8 12h8" />
      <path d="M8 15h8" />
    </template>
    <template v-else-if="name === 'needle'">
      <path d="M4 20L17.5 6.5" />
      <circle cx="18.8" cy="5.2" r="1.8" />
      <path d="M18.8 5.2c3.5 3 2 7-2 8s-5.5 4-2.5 7.8" />
    </template>
    <path v-else-if="name === 'back'" d="M15 5l-7 7 7 7" />
    <path v-else-if="name === 'next'" d="M9 5l7 7-7 7" />
    <path v-else-if="name === 'check'" d="M5 12.5l4.5 4.5L19 7.5" />
    <template v-else-if="name === 'lock'">
      <rect x="5" y="11" width="14" height="9" rx="1" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </template>
    <template v-else-if="name === 'unlink'">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      <path d="M4 4l16 16" />
    </template>
    <template v-else-if="name === 'alert'">
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v5" />
      <path d="M12 17.5v.5" />
    </template>
    <path v-else-if="name === 'plus'" d="M12 5v14M5 12h14" />
  </svg>
</template>
