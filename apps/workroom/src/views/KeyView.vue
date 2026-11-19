<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { setMemberKey } from '@/composables/useMemberKey'

const route = useRoute()
const router = useRouter()

setMemberKey(String(route.params.key))
router.replace({ name: 'my-orders' })
</script>

<template>
  <p>Letting you in…</p>
</template>
