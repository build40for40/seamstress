declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
    TEST_WORKOS_JWKS: import('jose').JSONWebKeySet
    TEST_WORKOS_PRIVATE_JWK: import('jose').JWK
  }
}
