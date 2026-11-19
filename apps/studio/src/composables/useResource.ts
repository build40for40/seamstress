import { ref, shallowRef, watch, type WatchSource } from 'vue'
import { errorMessage } from './useApi'

export function useResource<T>(load: () => Promise<T>, { watch: source }: { watch?: WatchSource } = {}) {
  const data = shallowRef<T | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)
  let latest = 0

  async function reload() {
    const call = ++latest
    loading.value = true
    error.value = null
    try {
      const result = await load()
      if (call === latest) data.value = result
    } catch (caught) {
      if (call === latest) error.value = errorMessage(caught)
    } finally {
      if (call === latest) loading.value = false
    }
  }

  if (source) watch(source, reload)
  void reload()

  return { data, error, loading, reload }
}
