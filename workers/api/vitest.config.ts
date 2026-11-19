import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { exportJWK, generateKeyPair } from 'jose'
import { defineConfig } from 'vitest/config'

const migrations = await readD1Migrations(new URL('./migrations', import.meta.url).pathname)

const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
const workosJwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'RS256' }

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          POSTMARK_SERVER_TOKEN: 'fake-postmark-token',
          WORKOS_CLIENT_ID: 'client_fake',
          TEST_MIGRATIONS: migrations,
          TEST_WORKOS_JWKS: { keys: [workosJwk] },
          TEST_WORKOS_PRIVATE_JWK: { ...(await exportJWK(privateKey)), kid: 'test', alg: 'RS256' },
        },
      },
    }),
  ],
  test: {
    setupFiles: ['./src/test/apply-migrations.ts', './src/test/workos-keys.ts'],
  },
})
