# Seamless

Day 14 of 40 for 40, built live on Twitch on Thursday 19 November 2026. The problem is "Unbilled seamstress hours", from Alex. Work is tracked on the Superthread `day14` board and the "Day 14" page.

- **Name:** Seamless. The repo, folder, Worker, database, bucket and subdomain are all still `seamstress`. Brand and voice are in `mockups/README.md`.
- **Form factor:** two web apps and a Worker, at https://seamstress.build40for40.com. The pre-day picks (CLI, WhatsApp, Agents) were dropped for this.
- **Layout:** a pnpm workspace. `apps/studio` is the CEO's app, `apps/workroom` the seamstress app, `packages/shared` the zod schemas, billing and time maths both sides use, and `workers/api` the one Worker that serves both apps, the API and the client's tracking page.
- **Docs:** [docs/PRD.md](docs/PRD.md) is the product: personas, stories, objects, scope and every product decision. [docs/PLAN.md](docs/PLAN.md) is the build plan: data model, API, screens and order of work. `fixtures/` is the shared fake data, and `mockups/` the first sketches of the seamstress screens.

Shared 40 for 40 context lives in `../AGENTS.md`.

## The problem

An atelier handling made-to-order garments and high-value alterations has no tech-automated system to track, manage and invoice work. Orders, seamstress hours and client billing are done manually, so time is lost, hours go unbilled, and payroll is error-prone. Need a system to easily track per-garment orders with photos and descriptions; time-based client invoicing at an hourly rate (optional fixed-price rounding); assign garments to different seamstresses; seamstresses log time and photos; monthly timesheets for hourly pay.

## What we're building

A multi-tenant workshop system. The CEO takes orders with garments, quotes and due dates, assigns garments to remote hourly seamstresses, approves their hours and photos, invoices clients against the quote and runs monthly timesheets. Seamstresses time their work and send photos from their phones through a personal link. Clients follow their order on a link and get emails. Any atelier can sign up and run its own team. The stories and scope are in the PRD.

## Decided

Product decisions are in the PRD, section 7. These are the technical ones.

### Who can see what

- Every row an atelier owns has a `team_id`, and every query function takes it as its first argument. Nothing reads across teams.
- **CEO (studio app):** signs in with WorkOS AuthKit through the shared build40for40 WorkOS application (no new one): `@workos-inc/authkit-js` in the app, `jose` checking the token in the Worker, as `joyo` does. The token's `sub` maps to a `members` row with role `owner`. A signed-in user with no team gets "Set up your atelier" and becomes its owner. The UI has one owner per team and no team switcher, though the schema allows more.
- **Seamstress (workroom app):** a personal link, `https://seamstress.build40for40.com/workroom/#/k/<key>`. The key sits in the URL fragment so it never reaches server logs. The app moves it to `localStorage`, clears it from the address bar and sends it as `X-Member-Key` on every call. The Worker stores only its SHA-256 hash. A new link or removing the member ends the old one. The owner can get a link for herself to log time.
- **Seamstress views** never include client names or contact details, other seamstresses' names or hours, or garments not assigned to her. The API leaves those fields out on the server; hiding them in the browser isn't enough.
- **Client (tracking page):** `/track/<token>`, a random token per order that the CEO can regenerate. It only shows approved hours and photos.

### Time

- A time entry stores the seamstress's local date (`date_local`) and `minutes`. Timer entries also store `started_at` and `ended_at` as UTC. A running timer is a row with `ended_at` empty and `minutes` empty. There is at most one per member, enforced with a partial unique index.
- A timer entry's `date_local` is the date in the member's time zone when it started, even if it runs past midnight.
- Locked means the entry is on a sent invoice, or its member's timesheet for that month has been sent. Locked entries reject edits with `409` and a plain message.
- The studio shows Europe/London. The workroom shows the member's own time zone. The tracking page shows UK time with the viewer's local time beside it.

### Money

- GBP stored as integer pence. The hourly total is billable minutes × the team rate ÷ 60, rounded to the nearest penny, with no rounding of time. The final price is the CEO's call (PRD CEO-5).
- Billing, unbilled, running cost and timesheet maths live only in `packages/shared` and are unit tested there.

### Photos

- R2 bucket `seamstress-photos`, keys `teams/<teamId>/<timestamp>-<id>.jpg`. The garment, label, caption, uploader and review status live on the `photos` row in D1, never in the key.
- The browser shrinks each photo to at most 1600px JPEG on a canvas before upload, which also strips EXIF. A failed upload keeps the shrunk file so it can be retried.
- Photos are served by the Worker after it checks the caller can see that garment: owner, assigned seamstress, or a tracking token for an approved photo.

### Email

- Postmark, from `"<Atelier name> via Seamless" <noreply@build40for40.com>` on the `outbound` (transactional) stream, with `Reply-To` set to the atelier's email. The address is the `EMAIL_FROM` var in `wrangler.jsonc`.
- Templates live in `workers/api/postmark/` and are pushed with `pnpm --filter api postmark:sync` under `seamstress-*` aliases. The Worker sends with `/email/withTemplate`.
- Emails send in `ctx.waitUntil`, never block the change that caused them, and are logged on the order's activity whether they succeed or fail.

### Stack

- Vue 3 with `<script setup lang="ts">`, Vite and vue-router in both apps. Composables, no Pinia. The studio uses HTML5 history; the workroom uses hash history so the key stays in the fragment.
- Hono in the Worker, with `requireOwner` and `requireMember` middleware and zod validation (`@hono/zod-validator`) from `packages/shared`. The tracking page is Hono JSX rendered on the server.
- Each API area is one file in `workers/api/src/routes/`, mounted at `/api` and declaring its full paths (`/orders/:id`, `/me/timer`). Attach middleware per route or with a path-scoped `use('/orders/*', ...)`, never `use('*')`, since every module shares the `/api` mount. `track.tsx` and `photos.ts` are mounted at `/track` and `/photos`.
- API responses are camelCase. Owner routes map rows through `src/serializers/owner.ts` to the shared types; workroom routes use `src/serializers/seamstress.ts`. Bodies and queries go through `validate()` in `src/validate.ts`, which answers 400 with `{ error }` from the first zod issue. Links (tracking, workroom, studio) are built from the request's origin in `src/links.ts`.
- Emails go through the one `sendEmail(env, ctx, alias, email)` in `src/email.ts`. `clientEmail(team, client)` decides whether a client gets one: order received and order ready respect the auto-email toggle; the invoice email goes whenever the client has an address, since sending it is the owner's own act.
- The studio keeps its shared pieces in `apps/studio/src`: `composables/` (`useApi` with `api()`, `uploadGarmentPhoto` and `fetchPhoto`, `useAuth`, `useSession`, `useResource`, `useToast`), `lib/` (London dates and money in `format.ts`, labels and activity sentences in `labels.ts`, `tell-client.ts`, `photos.ts` for shrinking) and `components/`. Photos need the owner's token, so the studio shows them through `AuthPhoto`, never a bare `<img src="/photos/...">`. The owner adds photos with `POST /api/garments/:id/photos`, approved from the start.
- `packages/shared` is consumed as TypeScript source: import `@seamstress/shared` or a module by name, like `@seamstress/shared/billing`. Use extensionless relative imports inside it.
- Raw SQL on the app's own `seamstress` D1 database, migrations in `workers/api/migrations/`, a query module per area. No ORM.
- Vitest. Logic tests in `packages/shared`; Worker tests through `@cloudflare/vitest-plugin` (the renamed `vitest-pool-workers`) for tenant isolation, what a seamstress can see, locking and the timer. Worker tests get the migrations applied to a fresh D1 per file. Tests sit next to their source as `*.test.ts`.
- `pnpm seed` loads `fixtures/*.csv` into local D1 (or a preview with a flag), shifting every date so 19 November 2026 lands on today.
- Dev ports come from the environment: `API_PORT` (8787), `STUDIO_PORT` (5173), `WORKROOM_PORT` (5174), and `API_PROXY_TARGET` for the Vite proxies (defaults to `http://localhost:$API_PORT`). `PERSIST_TO` (`.wrangler/state`) picks the local D1 and R2 folder for `pnpm --filter api dev` and `db:migrate`; pass the same `--persist-to` to any other local wrangler command. The staging WorkOS client only allows port 5173.

### Hosting

- One Worker, `seamstress`, on the `seamstress.build40for40.com` custom domain. `/` is the studio, `/workroom/` the workroom, `/track/*` the tracking page, `/api/*` the API, `/photos/*` photos.
- Bindings: the `seamstress` D1 database, the `seamstress-photos` R2 bucket, static assets from both apps' builds.
- Secrets: `POSTMARK_SERVER_TOKEN`, listed empty in `workers/api/.dev.vars.example`.
- WorkOS: the production client allows `https://seamstress.build40for40.com/` as a redirect URI and origin; the staging client allows localhost and the `*.workers.dev` previews.
- CI tests and builds every push and PR, uploads a preview per PR, and deploys `main`. `CLOUDFLARE_API_TOKEN` comes from the org secrets.

## Still open

See the PRD's open questions.
