import { createApp } from 'vue'
import App from './App.vue'
import { getAuth } from './composables/useAuth'
import { router } from './router'
import './styles.css'

getAuth()
  .catch((error: unknown) => console.error('WorkOS did not start', error))
  .finally(() => createApp(App).use(router).mount('#app'))
