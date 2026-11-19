import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const apiTarget = process.env.API_PROXY_TARGET ?? `http://localhost:${process.env.API_PORT ?? 8787}`

export default defineConfig({
  base: '/',
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: Number(process.env.STUDIO_PORT ?? 5173),
    strictPort: true,
    proxy: { '/api': apiTarget, '/photos': apiTarget, '/track': apiTarget },
  },
  build: {
    outDir: fileURLToPath(new URL('../../workers/api/public', import.meta.url)),
    emptyOutDir: true,
  },
})
