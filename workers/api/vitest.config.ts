import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

const migrations = await readD1Migrations(new URL('./migrations', import.meta.url).pathname)

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          POSTMARK_SERVER_TOKEN: 'fake-postmark-token',
          WORKOS_CLIENT_ID: 'client_fake',
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
  test: {
    setupFiles: ['./src/test/apply-migrations.ts'],
  },
})
