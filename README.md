# Seamless

Day 14 of [40 for 40](https://build40for40.com): a workshop system for ateliers that make garments to order. Built live on Twitch on 19 November 2026, for the problem "Unbilled seamstress hours".

Live at https://seamstress.build40for40.com.

## What it is

- **Studio** (`/`): the atelier owner signs in, sets up her atelier, takes orders with garments, quotes and due dates, and assigns each garment to her seamstresses. She approves hours and photos before a client sees them, turns an order into an invoice against its quote, runs the monthly timesheets and watches three numbers: unbilled work, what this month's invoices earned per hour against her rate, and the billable share of paid hours.
- **Workroom** (`/workroom/`): each seamstress opens a personal link on her phone, with no password. She sees only her own garments, starts and stops a timer, types in time she forgot, sends photos, moves garments along and sends her timesheet.
- **Tracking page** (`/track/<token>`): the client follows her order, with approved hours and photos only, and gets emails when it's in, ready and invoiced.

- **Superthread onboarding skill** (`.claude/skills/seamstress-onboard/`): a separate track that onboards an atelier owner onto Superthread through one conversation with Claude. See its [README](.claude/skills/seamstress-onboard/README.md).

Any atelier can sign up and run its own team. [docs/PRD.md](docs/PRD.md) has the stories and product decisions, [docs/PLAN.md](docs/PLAN.md) the build plan, and [AGENTS.md](AGENTS.md) the technical decisions.

## Layout

```
apps/studio/        Vue app for the owner, served at /
apps/workroom/      Vue app for seamstresses, served at /workroom/
packages/shared/    zod schemas, types, billing, time and timesheet maths
workers/api/        Hono Worker: API, tracking page, photos and both app builds
  migrations/       D1 migrations
  postmark/         email templates and the sync script
  scripts/seed.ts   loads fixtures/*.csv
fixtures/           fake demo data
mockups/            the first sketches of the seamstress screens
```

## Develop

You need Node (see `.node-version`), pnpm (pinned in `package.json`) and the `40for40` wrangler profile.

```sh
pnpm install
cp workers/api/.dev.vars.example workers/api/.dev.vars   # fill in the Postmark token and the staging WorkOS client id
pnpm --filter api db:migrate                             # local D1
pnpm seed                                                # the fake atelier, dated around today
pnpm dev
```

`pnpm dev` runs the Worker on 8787, the studio on http://localhost:5173 and the workroom on http://localhost:5174/workroom/. Both Vite servers proxy `/api`, `/photos` and `/track` to the Worker. Override the ports with `API_PORT`, `STUDIO_PORT` and `WORKROOM_PORT`, and the local D1 and R2 folder with `PERSIST_TO`. Only port 5173 is allowed by the staging WorkOS client, so sign in there.

The seed prints each seamstress's workroom link. The seeded owner has no WorkOS user unless you run `SEED_OWNER_WORKOS_USER_ID=<your token's sub> pnpm seed`; without it your first sign in sets up a fresh atelier instead. Seeded clients have no email address, so nothing gets sent.

Run wrangler through the repo script, never bare `npx wrangler`: `pnpm --filter api wrangler <args>`.

## Check

```sh
pnpm test        # shared maths, Worker tests on a fresh local D1 per file, and the apps
pnpm typecheck
pnpm build       # the studio into workers/api/public, then the workroom into public/workroom
```

Always build from the root: building the studio on its own empties `workers/api/public`, workroom included.

## Deploy

CI (`.github/workflows/ci.yml`) typechecks, tests and builds every push and PR. Each PR gets a preview at `https://<branch>-seamstress.40for40.workers.dev`, and merging to `main` applies the D1 migrations and deploys the `seamstress` Worker to the custom domain.

Previews share the production D1 database and R2 bucket, so never seed them or run destructive tests against them. `pnpm seed --remote` writes to production: don't.

Emails are Postmark templates under `seamstress-*` aliases. After editing `workers/api/postmark/*.json`, push them with `pnpm --filter api postmark:sync`. The Worker's `POSTMARK_SERVER_TOKEN` is a Cloudflare secret, set once with `pnpm --filter api wrangler secret put POSTMARK_SERVER_TOKEN`.

Sign in goes through the shared build40for40 WorkOS application. The production client allows `https://seamstress.build40for40.com/`, and the staging client allows `http://localhost:5173/` and `https://*seamstress.40for40.workers.dev/`, as redirect URIs and web origins.
