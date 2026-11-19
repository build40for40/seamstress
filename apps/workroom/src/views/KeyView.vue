<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { setMemberKey } from '@/composables/useMemberKey'
import { me, timer } from '@/composables/useWorkroom'

const route = useRoute()
const router = useRouter()

setMemberKey(String(route.params.key))
me.value = null
timer.value = null
router.replace({ name: 'my-orders' })
</script>

<template>
  <div class="tape" aria-hidden="true" />
  <main class="page">
    <span class="brand">Seamless</span>
    <p class="aside">Letting you in…</p>
  </main>
</template>
