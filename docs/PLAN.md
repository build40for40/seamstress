# Seamless build plan

The handoff for building Seamless in one go. The product is Seamless; it lives at `seamless.build40for40.com`, and every other technical name (repo, Worker, D1, R2) stays `seamstress`. Read these first, in this order: `../AGENTS.md` (shared 40 for 40 rules), `AGENTS.md` (this repo's technical decisions), `docs/PRD.md` (what to build and why), `fixtures/README.md` (the demo data). Where this plan and those disagree, the PRD wins on product and `AGENTS.md` on tech; fix this plan when you spot a gap.

Everything below has been decided with the team. Don't reopen it. Make routine calls yourself, record anything worth keeping under "Decided" in `AGENTS.md`, and only stop for the things listed under [When to ask a human](#when-to-ask-a-human).

## Already done

- The GitHub repo `build40for40/seamstress` exists, and `main` holds the PRD, this plan, the fixtures and the mockups.
- R2 is enabled on the Cloudflare account. No bucket exists yet.
- A Postmark server token is in `.dev.vars` at the repo root (gitignored). Move it to `workers/api/.dev.vars`. The sender domain `build40for40.com` is verified, and there are no templates yet.
- `CLOUDFLARE_API_TOKEN` is an org secret on GitHub, so CI can deploy.
- WorkOS: the shared build40for40 application has a production and a staging client. Their ids, and how to pick between them by hostname, are in `../day01-joyo/src/onboarding/workos.ts`; token checking is in `../day01-joyo/worker/auth.ts`.

## Ground rules

- Work on the branch `seamstress-mvp` in the worktree `.claude/worktrees/seamstress-mvp`. Commit in the chunks of the build order below, push as you go, and open one PR early so CI and previews run. Enable auto-merge (`gh pr merge --auto --squash`) and keep going until CI is green.
- pnpm workspace, as `../templates/mobile-app` lays it out: root `pnpm-workspace.yaml`, one `pnpm-lock.yaml`, `packageManager` pinned. No npm, yarn or `package-lock.json`.
- Run wrangler as the repo script (`pnpm --filter api wrangler <args>`), never `npx wrangler`. Copy the script from `../site/package.json`.
- Never commit secrets, real data or `/Users/...` paths. Never bypass the pre-commit hooks.
- No comments in code unless the code can't say it. Tests sit next to the file they test.
- Copy is informal and friendly, with no dashes mid-sentence. Every public screen works at 390px with no sideways scroll.

## Repo layout

```
apps/studio/          Vue app for the CEO, built to be served at /
apps/workroom/        Vue app for seamstresses, served at /workroom/
packages/shared/      zod schemas, types, billing, time and timesheet maths
workers/api/          Hono Worker: API, tracking page, photos, static assets
  migrations/         D1 migrations
  postmark/           email templates and the sync script
  scripts/seed.ts     loads fixtures/*.csv
fixtures/             fake data (exists)
mockups/              first sketches (exist)
docs/                 PRD and this plan (exist)
.github/workflows/    CI
```

Builds: `apps/studio` builds to `workers/api/public/`, and `apps/workroom` to `workers/api/public/workroom/` (gitignored). The Worker's `assets` points there, with `not_found_handling: "single-page-application"` and `run_worker_first` for `/api/*`, `/track/*` and `/photos/*`. The workroom uses hash routing, so it only ever needs its own `index.html`.

Dev: `pnpm dev` at the root runs `wrangler dev` on 8787, the studio on 5173 (base `/`) and the workroom on 5174 (base `/workroom/`). Both Vite servers proxy `/api`, `/photos` and `/track` to 8787. `wrangler dev` sees the production hostname, so the Worker takes a `WORKOS_CLIENT_ID` override from `.dev.vars`, as `joyo` does.

## Data model

D1, one migration to start (`0001_init.sql`). Ids are random text (`crypto.randomUUID()`). Times are UTC ISO strings, money is integer pence, local dates are `YYYY-MM-DD`. Every table below except `teams` has `team_id` and an index on it.

| Table | Columns | Notes |
| --- | --- | --- |
| `teams` | id, name, reply_to_email, hourly_rate_pence, auto_email_clients (1), show_pay_estimate (1), next_order_number (1001), next_invoice_number (1), created_at | One per atelier |
| `members` | id, team_id, role (`owner`, `seamstress`), name, time_zone, workos_user_id (owners), key_hash, removed_at, created_at | Unique on `workos_user_id`. `key_hash` is the SHA-256 of the personal link key |
| `pay_rates` | id, team_id, member_id, rate_pence, effective_from (local date) | The rate for an entry is the latest one on or before its `date_local` |
| `clients` | id, team_id, name, phone, email, notes, created_at | |
| `price_items` | id, team_id, name, price_pence, archived_at | Quote shortcuts only |
| `orders` | id, team_id, number (`SE-1001`), client_id, description, quote_pence, due_date, express, status (`open`, `ready`, `collected`, `cancelled`), tracking_token, created_at, updated_at | Unique on (team_id, number) and on tracking_token |
| `garments` | id, team_id, order_id, ref (`SE-1001-A`), position, description, status (`todo`, `in_progress`, `fitting`, `done`), created_at, updated_at | |
| `garment_assignments` | id, team_id, garment_id, member_id, assigned_at, removed_at | Unique on (garment_id, member_id) while not removed |
| `time_entries` | id, team_id, member_id, garment_id (null for general time), kind (`sewing`, `tidying`, `fitting`, `waiting`), date_local, minutes (null while running), started_at, ended_at, note, review_status (`waiting`, `approved`, `held_back`, null for general), invoice_id, created_by, created_at, updated_at | Partial unique index on member_id where `ended_at is null and started_at is not null`. `waiting` kind means `garment_id` is null and the other way round |
| `photos` | id, team_id, garment_id, member_id, r2_key, caption, label (`before`, `progress`, `after`, null), review_status, taken_on (local date), created_at | |
| `invoices` | id, team_id, order_id, number (`INV-0001`), status (`draft`, `sent`, `paid`), final_price_pence (null means the hourly total), included_held_back (JSON array of entry ids), snapshot (JSON, set on send), sent_at, paid_at, created_at | One draft per order at a time |
| `timesheets` | id, team_id, member_id, month (`YYYY-MM`), status (`sent`), sent_at, reopened_at | A row exists only once she sends. Reopening deletes the row and logs it |
| `activity` | id, team_id, order_id, garment_id, member_id, kind, detail (JSON), created_at | The order's history: created, assigned, stage moves, reviews, invoices, emails sent or failed, client told |

Order numbers and invoice numbers come from the team's counters, incremented in the same `db.batch` as the insert.

## Shared logic (`packages/shared`)

Pure functions, each with a focused test file. Test cases come straight from the fixtures' "What each order is there to show" table.

- `localDate(instant, timeZone)` and `monthOf(dateLocal)`.
- `isBillable(entry)`: on a garment, not `waiting` kind, and approved, or held back but listed in the draft's `included_held_back`.
- `hourlyTotal(minutes, ratePence)`: rounded to the nearest penny.
- `runningCost(entries, rate, viewer)`: the CEO counts waiting and approved entries, the client counts approved only. Held-back entries never count.
- `unbilled(entries, rate)`: billable-kind entries with no `invoice_id` that aren't held back, grouped by client and order.
- `invoiceDraft(order, garments, entries, rate, includedHeldBack)`: lines per garment, the hourly total, the quote, the difference, waiting entries left out with a count, held-back entries listed.
- `timesheet(member, month, entries, payRates)`: billable, general and total minutes, by day and by order, pay using the rate in force on each entry's date.
- `isLocked(entry, sentMonths)`.
- `dueFlag(order, today)`: `overdue`, `due_soon` (within 2 days and not all done) or none.
- `workroomOrder(a, b)`: express first, then due date, then most recently worked.
- `dashboard(entries, invoices, orders, rate, month)`: unbilled pence; earned per hour on invoices sent this month against the rate, plus open orders over quote; billable share of paid minutes this month.
- zod schemas for every request body, shared by the Worker's validators and the apps' forms.

## API

All under `/api`, JSON, validated with the shared zod schemas. `requireOwner` checks the WorkOS token and loads the owner's member and team. `requireMember` accepts `X-Member-Key` (any active member) or an owner token. Seamstress responses go through serializers that drop client details and other people.

**Setup and team (owner)**

- `GET /api/session`: the signed-in owner, the team and the counts for badges (waiting reviews, sent timesheets, orders with all garments done), or `{ team: null }`.
- `POST /api/teams`: set up an atelier and become its owner.
- `PATCH /api/team`: name, reply-to, rate, the two toggles.
- `GET/POST/PATCH/DELETE /api/price-items`.
- `GET /api/members`, `POST /api/members` (name, time zone, pay rate; returns the link once), `PATCH /api/members/:id`, `POST /api/members/:id/link` (new key, returns the link once), `DELETE /api/members/:id` (marks removed).
- `POST /api/members/:id/pay-rates` (rate, effective from).

**Orders (owner)**

- `GET /api/orders?status=`: the list with garments, assignees, minutes, running cost, flags.
- `POST /api/orders`: client (an existing id, or a new one inline), description, quote, due date, express, garments with descriptions and assignees.
- `GET /api/orders/:id`: everything on the order, including activity.
- `PATCH /api/orders/:id`: fields and status (`ready` only when every garment is done).
- `POST /api/orders/:id/garments`, `PATCH /api/garments/:id`, `PUT /api/garments/:id/assignees`.
- `POST /api/orders/:id/tracking-token`: regenerate.
- `POST /api/orders/:id/told`: log a "Tell the client" tap.
- `GET/POST/PATCH /api/clients`.

**Review (owner)**

- `GET /api/review`: waiting entries and photos, grouped by order.
- `POST /api/review`: `{ entries: [{ id, status }], photos: [{ id, status }] }`, and approving a whole order at once.

**Invoices (owner)**

- `POST /api/orders/:id/invoices`: create or return the draft.
- `GET /api/invoices/:id`: the draft worked out live, or the snapshot once sent.
- `PATCH /api/invoices/:id`: final price, included held-back entries.
- `POST /api/invoices/:id/send`: snapshot, number, set `invoice_id` on its entries, email the client.
- `POST /api/invoices/:id/paid`.

**Timesheets and dashboard (owner)**

- `GET /api/timesheets?month=`: rows per member, with day and order breakdowns.
- `GET /api/timesheets/export?month=&type=summary|detail`: CSV.
- `DELETE /api/timesheets/:memberId/:month`: reopen.
- `GET /api/dashboard`.

**Workroom (any member)**

- `GET /api/me`: the member, the team's name, `show_pay_estimate`, the running timer.
- `GET /api/me/orders`: open orders with only her garments, her minutes and the "+N other garments" count, sorted.
- `GET /api/me/garments/:id`: the brief, photos, her entries.
- `POST /api/me/timer`: `{ garmentId | null, kind }`. Stops any running timer first, and moves a `todo` garment to `in_progress`.
- `POST /api/me/timer/stop`: `{ endedAt? }`. Under a minute deletes it and says so.
- `PATCH /api/me/timer`: change the running timer's kind.
- `POST/PATCH/DELETE /api/me/entries`: typed time and fixes, refused when locked.
- `PATCH /api/me/garments/:id/status`.
- `POST /api/me/garments/:id/photos`: the JPEG body with caption and label, stored in R2.
- `GET /api/me/timesheet?month=` and `POST /api/me/timesheet/:month/send`.

**Public**

- `GET /track/:token`: the client's page, server-rendered.
- `GET /photos/:id`: the image, after checking an owner token, a member key with an assignment, or `?t=<tracking token>` for an approved photo.

## Screens

### Workroom (phone first, follow `mockups/` for look and feel)

1. **First open:** the `#/k/<key>` route stores the key and goes home. With no key, or a dead one: "Ask your atelier for your link."
2. **My orders:** a card per order with its number, due date, express and due flags, her garments with their stage, and a big Start on each. A "General time" card with its own Start. Her hours this month at the bottom, which opens the timesheet.
3. **Timer bar:** fixed to the bottom of every screen while running. It shows the garment ref, a ticking time, a kind chip that cycles sewing, fitting and tidying, and Stop. Stop saves, then a toast for about 6 seconds: "Saved 1h 25m on SE-1003-A" with Add photo and Undo. No modals.
4. **Forgotten timer:** if the timer has run past 8 hours or past her midnight when the app opens, the bar turns amber with "Still going? Started 9:05 yesterday" and two actions, Stop now and "I stopped at…", which picks a time.
5. **Garment:** the brief, photos, a stage picker, her entries for it (editable unless locked), "Add time" (the typed fallback: an hours stepper in quarters, a date defaulting to her today, a kind and a note) and "Add photo" (camera or gallery, caption, label, with retry on failure).
6. **My timesheet:** month picker, total, by day and by order, general time on its own line, estimated pay when shown, and Send.

### Studio (laptop first, usable at 390px)

1. **Set up your atelier:** name, reply-to email, hourly rate.
2. **Home:** the three dashboard tiles on top, then the orders list with filters for open, ready, collected and all. Each row shows number, client, due date, flags (express, overdue, due soon, over quote, waiting reviews), garments with stage and assignee initials, hours and running cost against the quote.
3. **New order:** pick or add a client, description, due date, express, quote with price list chips that add to it, garments with a description, assignees and optional before photos.
4. **Order:** garments with stage and assignees (editable), time entries, photos, activity, the client link with copy and regenerate, "Tell the client" (WhatsApp and email), status buttons, and the invoices.
5. **Review:** waiting entries and photos grouped by order, with approve, hold back, and approve all.
6. **Invoice:** the draft with lines, hourly total, quote, difference, held-back entries to tick, a final price field, Send, Mark paid. A print stylesheet makes it a clean A4 page.
7. **Timesheets:** month picker, a row per seamstress with sent status, expand for detail, reopen, and the two CSV downloads.
8. **Team:** members with time zone, pay rate history, copy link, WhatsApp link, new link, remove. "Open my workroom" for the owner.
9. **Settings:** atelier details, rate, price list, the two toggles.

### Tracking page

The atelier's name, the order number, due date, status, each garment with a stage timeline, quote against the approved running cost (with a plain warning when over), approved photos in date order, the invoice once sent, and "Ask about this" as a `mailto:` to the atelier. Dates in UK time with local time beside them, done with a few lines of inline JS. No client JS framework.

## Emails

Templates in `workers/api/postmark/<alias>.json` (subject, HTML, text), pushed by `pnpm --filter api postmark:sync`, which creates or updates each one by alias using the token in `.dev.vars`. Run it once yourself; the token works.

| Alias | To | When |
| --- | --- | --- |
| `seamstress-order-received` | Client | Order created, when auto-email is on and the client has an email |
| `seamstress-order-ready` | Client | Order marked ready |
| `seamstress-invoice` | Client | Invoice sent, with the lines, the final price and the link |
| `seamstress-garments-done` | Atelier | The last garment on an order is done |
| `seamstress-timesheet-sent` | Atelier | A seamstress sends her timesheet |
| `seamstress-bank-details-changed` | Atelier | The bank details on the invoices change |

From `"<Atelier name> via Seamless" <noreply@build40for40.com>`, read from the `EMAIL_FROM` var in `wrangler.jsonc`, `MessageStream: outbound`, `ReplyTo` the atelier's email. Links use the request's origin. Seeded clients have no email address, so the seed never sends anything. Test real sends with a client whose email is a team address.

## Build order

Each step ends with a commit. Push after each one.

1. **Docs on the branch.** Make sure the branch has this plan, the PRD, `AGENTS.md` and the fixtures as they stand on `main`.
2. **Scaffold.** The workspace, two Vite apps saying hello, `packages/shared`, the Hono Worker serving both builds, CI adapted from `../templates/web-app/.github/workflows/ci.yml` and the `build40for40/actions` composite actions (setup, deploy-worker, preview-worker). Create the D1 database and the R2 bucket with the repo's wrangler script, add the custom domain route, and set `POSTMARK_SERVER_TOKEN` as a Worker secret from `.dev.vars`. Push and check a preview deploys.
3. **Shared logic and tests.**
4. **Schema, auth and scoping.** The migration, query modules, `requireOwner` and `requireMember`, and the Worker tests for tenant isolation and what a seamstress can see.
5. **API.** The endpoints above, with Worker tests for the timer (one at a time, under a minute, stop with a time), locking and review.
6. **Seed.** `pnpm seed` loads the fixtures with dates shifted to today, prints the owner sign-in note and each seamstress's link, and uses generated placeholder images for the photos.
7. **Workroom.** Timer first. Follow the mockups' brand and voice (`mockups/README.md`), and check it at 390px against them.
8. **Studio: set up, orders, order page, assigning, review.**
9. **Invoices and print.**
10. **Timesheets and CSV.**
11. **Tracking page and photos for clients.**
12. **Emails and Postmark templates.**
13. **Dashboard.**
14. **Polish and ship.** Empty and error states, the README (what it is, develop, check, deploy), and the PR description per the user's rules. Get CI green and let auto-merge land it.

Then the Should and Could items in PRD order, then the stretch goals: CEO-10 rates, the "say it or type it" box tested against `fixtures/seamstress_scripts.csv`, and CLI-5.

## Done means

On the production URL, with the seeded atelier and a fresh one you set up yourself:

1. The PRD's five demo steps work end to end, on a phone for the seamstress and a laptop for the CEO.
2. A seamstress link never shows a client's name, another seamstress or an unassigned garment, checked against the raw API responses as well as the screens.
3. The fixture cases come out right: `SE-1001` invoice £2,400 against £2,280 of hours; `SE-1002` draft £570 against a £480 quote, flagged over; `SE-1005`'s held-back sleeve isn't on the client's link but is on Bea's timesheet; `SE-1004`'s hours split across October and November.
4. A second atelier sees none of the first one's data.
5. `pnpm test` and `pnpm build` pass, and CI is green.

## When to ask a human

- **WorkOS redirects.** The production client needs `https://seamless.build40for40.com/` as a redirect URI and allowed origin, and staging needs `http://localhost:5173/` and the preview origins. Try the WorkOS MCP or the `workos` CLI. If neither is signed in, ask the user to do it and give them the exact values.
- A pre-commit hook blocks something you think is a false positive.
- Anything that would send real email to a real client, or touch another repo's resources.
