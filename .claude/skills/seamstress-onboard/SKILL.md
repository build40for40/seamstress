---
name: seamstress-onboard
description: Onboard a new business owner (an atelier: made-to-order garments, alterations) from zero. Gets to know them, guides them through signing up for Superthread and connecting it to Claude, then learns how their business works and creates a space, board, conventions page and cards for their current work, so the board opens as their to-do list. Use when someone says "set up my atelier", "onboard me", "get me started", or describes a sewing, tailoring or alterations business.
---

# Seamstress onboarding

Goal: a business owner we know nothing about has one conversation with Claude and ends with a working Superthread setup they barely need to look at. It should feel like meeting someone, not filling in a form: Claude gets to know them, guides them through signing up, and the rest of the conversation quietly fills their board. When they first open Superthread, their own work is already there as cards. After that, Claude is their main way in: they ask Claude ("what's unbilled?", "where's the Dubois gown?") rather than reading the board.

Always design for the **atelier and seamstress** first. When in doubt, default to the atelier. Do not generalise to other industries (film, design, agencies) unless the owner's business is one.

**Simplicity and clarity override any rule in this file.** If a rule makes the owner's experience or board harder to understand, break it and say why.

Speak plainly. The owner is not technical: say "connect Superthread to Claude", not "install the MCP server". One step at a time; wait for them to say it is done before moving on.

## Principles

**Where things live**
- One company, one Superthread workspace, which the owner creates when they sign up (Claude cannot create accounts or workspaces).
- Inside it, create a **dedicated space** named after the company (e.g. "Atelier Rosa") holding the board and the conventions page. Only use an existing space if the owner asks.
- **One board per atelier, named after the company. One card per garment or order.** Several garments for one client means several cards; the client's name leads each card title and description so they are searchable.

**Lists (columns)**
- Designed from the owner's own walkthrough of an order (question 4), not from a template.
- No fixed number. Each list must pass this test: *does a card here need a different action, or a different person, than in the list next to it?* If two lists lead to the same next step, merge them.
- Cancelled sits outside the flow and does not count. As a nudge, most ateliers land on 5 to 8 working stages plus Cancelled; a simple alterations shop may need only 4 (e.g. Inquiry → In Progress → Ready → Paid).
- Assignment is not a list: use the card's assignee. Deposits and part payments are logged as comments, not extra lists.
- Name lists in the owner's words ("Fitting", not "Client Review", if that is what they say).
- **Only the list where the money is in and the job is over is `completed`.** A list that is waiting on payment (Invoiced) is open work someone must chase, so it is `started`. Otherwise unpaid invoices vanish from every "what's active?" view.
- **The end of the flow follows the owner's payment terms**, not a fixed order.

**Cards**
- Description: client contact, billing (rate or fixed price, rounding, deposit), brief, assignee. Superthread has no custom fields, so this follows the conventions page exactly. Updating a description replaces the whole text: read the card first and keep everything else.
- Comments: time logs and photo evidence, in the conventions format. Append-only.
- One checklist, "Work steps", for the garment's steps (measure, cut, fitting, hem, press). Steps live here, never as extra columns. Hours are never counted from it. Report progress by counting checked items ("2 of 4 steps done"); tick with `checklist_update_item`.
- Photos: the MCP cannot upload files. Seamstresses attach them from their web app (or Superthread email-in); Claude reads them by file ID with `file_list` and `get_file_url`. Never claim a photo was attached if it was not.
- Seamstresses log from a web app opened by a personal link (no login); the name in the comment text is the identifier, so it must match the roster on the conventions page. Every comment is authored as the connected account.

**Behaviour**
- Never create anything before the owner approves the proposal.
- Never invent hours, client details or evidence.
- Never ask for, type or store the owner's passwords or verification codes. They enter those themselves.

## The conversation, in order

### Step 0. Where are we?
Check whether Superthread tools are available (try `workspace_get` or `space_list`).
- **Not connected:** this is a new owner. Start at step 1.
- **Connected:** skip steps 2 and 3. Still do step 1 if you do not know their name and company, then go to step 4.

### Step 1. Get to know you (before signing up)
Ask, one or two at a time, warmly:
1. **What's your name?**
2. **What's your company called?**
3. **What does it do?**

From these: how to address them, who approves work (assume the owner unless they say otherwise), the space and board name, and what one "job" is (usually a garment). If question 3 shows the business is not an atelier, carry on with the same questions; they still work.

### Step 2. Sign up for Superthread (guided)
Only the owner can create the account. Guide them, one screen at a time:
- Send them to superthread.com to sign up with the email they use for the business. Do not suggest creating a new email address.
- Tell them exactly what to enter where you know it: their name (from question 1) and the workspace name (the company name from question 2).
- If Superthread asks its own setup questions, tell them they can keep it short or skip it; Claude will set up the board.
- Ask them to say "done" when they are in their new workspace.

### Step 3. Connect Superthread to Claude (guided, then checked)
- Explain in one line why: "This lets me set up and update your board for you."
- Walk them through adding Superthread to Claude using the instructions at <https://mcp.superthread.com/mcp>, then signing in to Superthread to approve access. In claude.ai this is adding a connector, not downloading anything.
- **Check it yourself** with `workspace_get`: confirm the workspace name back to them ("I can see your workspace, Atelier Rosa"). If it fails, help them retry; do not continue without it.

### Step 4. Your profile
Use `workspace_get` and `member_me` to see what is already filled in. If the owner's display name is missing or different from what they told you, offer to update it with `member_update_me`. Do not change anything they did not agree to. Keep this to one exchange.

### Step 5. How your business works
Then check what exists **for this company only**: `space_list`, then `board_list` and `page_list` only in a space whose name matches the company. Do not search the whole workspace: other spaces may have their own conventions pages. If this company's space has a board or a "Conventions (read first)" page, go to *Updating an existing setup*. If it is unclear whether a space is theirs, ask.

Ask, in plain words:

4. **"How does it work? Walk me through a typical order, from a client first getting in touch to getting paid."** This designs the board: the stages, whether there are fittings, how quoting works, and how and when they get paid (which decides how the board ends).
5. **"Who's on your team?"** Becomes the roster, one canonical name each. If one name is part of another (Ana and Ana Sofia), confirm they are different people.
6. **"What are you working on right now? Tell me about two or three jobs: the client, what it is, who's on it and where it's at."** Becomes the first real cards.

Follow up only where something essential is missing: the hourly rate or fixed price if question 4 did not cover it, or who is on a job. Infer currency and timezone from what they said ("55 euros", "Lisbon") and state it in the proposal. If the owner is talking freely, take what they give and skip questions already answered.

### Step 6. Propose
Show, in plain words: the space and board name, the lists with a one-line "what happens here" each, the conventions summary (team, rate, rounding, payment terms, currency, timezone), and the cards you will create (title, list, who is on it). Ask whether the space should be open to their whole workspace or private.

Default atelier board when their walkthrough fits it, start of the flow:

| List | Status type | Colour | Next action |
|---|---|---|---|
| Inquiry | backlog | grey | write a quote |
| Quoted | backlog | grey | chase the client for a yes |
| Accepted | committed | blue | assign a seamstress, start work |
| In Progress | started | purple | sew, log time |
| Client Review | started | orange | fitting or approval |

End of the flow, chosen by payment terms (then Cancelled, `cancelled`, red):

| Payment terms | Lists after Client Review |
|---|---|
| Deposit, balance on pickup (most ateliers; the default) | **Ready & Invoiced** (`started`, yellow: notify client, chase balance) → **Paid & Collected** (`completed`, green) |
| Invoice after delivery (regular clients, monthly account) | **Delivered** (`started`, teal) → **Invoiced** (`started`, yellow: chase payment) → **Paid** (`completed`, green) |
| Pay before release (high-value pieces) | **Invoiced** (`started`, yellow) → **Paid** (`started`, teal: arrange collection) → **Collected** (`completed`, green) |

With deposit-then-pickup, "ready" and "invoiced" lead to the same next action, so they are one list. Use colour to tell lists apart, especially among the `started` ones (grey, blue, purple, orange, teal, yellow, green and red were all accepted in testing). Adapt using the list test and the owner's words. Status types cannot change once a list holds cards, so get them right now.

### Step 7. Create (on approval)
- `space_create` for the company's space. If private fails on their plan, fall back to open and say so.
- `board_create` with `lists` (each with `status_type` and `color`).
- `page_create` for the conventions page, filling `conventions-template.md` with their values (list meanings in board order, roster, rate, rounding, payment terms, currency, timezone). Keep only the "Moving cards" rules whose lists exist.
- **Cards for their current jobs** (question 6), each in the list that matches where it actually is (an unanswered quote goes in Quoted; a garment awaiting a fitting goes in Client Review):
  - Title `<Client surname> – <garment and job>`, surname without honorific ("Almeida", with "Mrs Almeida" kept in the description). If the client is unknown, `(client to add) – <garment>`.
  - Description in the conventions format with what the owner said. **Never invent details:** anything missing is a visible gap (`phone: to add`). Turn relative dates into real dates and keep the owner's words beside them (`Tuesday 24 November 2026 ("next Tuesday")`).
  - Seeded cards go where the work actually is, even if evidence the move rules ask for is missing; the move rules govern moves from now on. Record what is missing instead: `deposit: to confirm` on the Billing line, an unticked photo step for a fitting that has not happened.
  - Set the assignee when the seamstress is a workspace member; otherwise the Assigned line covers it.
  - A "Work steps" checklist with 3 to 5 steps that fit the garment (`checklist_create`, then `checklist_add_item`), ticking steps the owner said are done. **Number the step titles** (`1. Measure and pin`): `checklist_list` returns items in no fixed order.
  - **Do not log hours during onboarding.** The seamstress logs her own time from the app; an owner's estimate would be counted twice. Note it in the brief as `owner's estimate so far: ~2h (not logged)`.
  - **Only if the owner gives no jobs**, create one card `SAMPLE – <surname> – <garment>` in the first list with obviously fake client values, the example time-log as text in the description, and a numbered checklist. Tell them to delete it once they add a real job.

### Step 8. Report and invite the team
Links to the space, board and conventions page; a one-line summary of their board ("3 garments: 1 quote to chase, 2 in progress"); the gaps to fill (`phone: to add`); and the last step: send each seamstress her personal link to the logging app. Seamstresses do not sign up for anything.

## Updating an existing setup (re-run)
Used when step 5 finds this company's board or conventions page. Never create a second one, never delete cards, and leave existing cards alone.

1. Load them with `board_get` and `page_get`.
2. Diff the owner's answers against the board and page, and tell the owner the exact changes before making them.
3. **Lists:** add with `board_create_list` (it lands at the right-hand end), then `board_reorder_lists`. Pick the status type by what the stage means. Apply the list test: if the new list does the same job as an existing one, propose a rename instead. Never change the status type of a list that already holds cards. An older board may have Invoiced as `completed`: if it holds cards, propose a new `started` list for invoices awaiting payment and moving the cards.
4. **Conventions page:** `page_get` returns HTML but `page_update` takes markdown and replaces the whole body. Regenerate the full page from `conventions-template.md` with the owner's current values, then check nothing from the old page was dropped (roster, rate, rounding, payment terms, list meanings).
5. Report what changed.

## Logging after onboarding (the translator)
Before writing anything to a card, read the conventions page. Normalise messy input, in any language, to the conventions format: "Maria did about two and a half hours on the Dubois hem" becomes a comment `⏱ 2.5h · Maria L. · <date> · hem`. An approximate number ("about two and a half hours") is fine, rounded to the nearest quarter hour; no number at all ("a while", "most of the day") means ask. Map names to the roster by **exact match**: "Mar" can become Maria L. only if no other roster name could match, and when one name is part of another (Ana and Ana Sofia), never guess; ask. If the garment or the person is unknown (not on the roster, no matching card), write nothing and ask the owner to add them; don't create cards or roster entries from a seamstress message alone. A seamstress may fill a gap on an existing card (e.g. the client's name); note who supplied it. A stated future date ("ready tomorrow") is a note comment with the real date, not a card move; cards move only by the move rules. If the same seamstress already logged the same garment today, ask whether this replaces or adds to it. When replying to a seamstress, confirm in her language. Use the atelier's timezone for "today". Ignore cards titled `SAMPLE` when totalling.

## Not in this skill yet
Invoicing (Claude totals `⏱` entries, applies the billing line, produces the invoice and links it on the card; the MCP cannot attach files, so it goes in as a linked page or comment), monthly timesheets and payroll, client portal.
