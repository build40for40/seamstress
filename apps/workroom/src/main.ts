import { createApp } from 'vue'
import App from './App.vue'
import { onUnauthorized } from './composables/useApi'
import { me, timer } from './composables/useWorkroom'
import { router } from './router'
import './styles.css'

onUnauthorized(() => {
  me.value = null
  timer.value = null
  router.replace({ name: 'no-key', query: { gone: '1' } })
})

createApp(App).use(router).mount('#app')
