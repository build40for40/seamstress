import { ref } from 'vue'

export type Toast = { id: number; message: string; tone: 'info' | 'error' }

const toasts = ref<Toast[]>([])
let nextId = 1

export function toast(message: string, { tone = 'info', ms = 5000 }: { tone?: Toast['tone']; ms?: number } = {}) {
  const id = nextId++
  toasts.value = [...toasts.value, { id, message, tone }]
  window.setTimeout(() => dismiss(id), ms)
}

export function dismiss(id: number) {
  toasts.value = toasts.value.filter((item) => item.id !== id)
}

export function useToast() {
  return { toasts, toast, dismiss }
}
