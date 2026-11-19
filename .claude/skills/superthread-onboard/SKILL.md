---
name: superthread-onboard
description: Onboard a new business owner (recruitment agency, design agency, consulting firm, studio or any client-services business) onto Superthread from zero. Gets to know them, guides them through signing up for Superthread and connecting it to Claude, then learns how their business works and creates a space, board, house rules page and cards for their current work, so the board opens as their to-do list. Use when someone says "set me up", "onboard me", "get me started", "set up my agency/firm/studio", or describes a business that does work for clients.
---

# Superthread onboarding

Goal: a business owner we know nothing about has one conversation with Claude and ends with a working Superthread setup they barely need to look at. It should feel like meeting someone, not filling in a form: Claude gets to know them, guides them through signing up, and the rest of the conversation quietly fills their board. When they first open Superthread, their own work is already there as cards. After that, Claude is their main way in: mostly they ask "what's next?" and Claude tells them what needs them and offers to do it, so they never need to learn its features. That later behaviour lives in the `superthread-run` skill.

This works for any business that does work for clients and bills for it: recruitment agencies, design and creative agencies, consulting firms, development studios, law and accounting practices, and similar. **Infer what kind of business it is** from the company name and the owner's own walkthrough, and use their words for the work ("role", "search", "project", "engagement", "retainer"). Do not push a template onto them.

**Simplicity and clarity override any rule in this file.** If a rule makes the owner's experience or board harder to understand, break it and say why.

Speak plainly. The owner is not technical and has never used Superthread. One step at a time when they have to do something; wait for them to say it is done.

## Words
Use Superthread's tools and terms behind the scenes; with the owner, translate them. Never say workspace, space, list, status, card, task, checklist, assignee, conventions, roster, connector or MCP to the owner.

| Superthread / tool word | Say this |
|---|---|
| workspace | your Superthread account |
| space, board | your work board |
| list, column, status | stage ("Interviewing", "In review") |
| card, task | the job, in the owner's word ("the Acme rebrand", "the CFO search") |
| checklist | the steps for that job |
| assignee | who's working on it |
| conventions page | your house rules (the page is titled "House rules") |
| roster | your team |
| connector, MCP, tools | connecting Superthread to Claude |
| private / open space | don't mention it |

Exception: when a Superthread screen literally shows one of its words, tell the owner what to type there ("where it asks for a workspace name, type Northwind Partners").

## Don't ask what you can work out
Every question costs the owner attention, and repeated or obvious questions bore them. Before asking anything, check whether they have already said it or it can sensibly be inferred.
- **Never ask twice.** Anything said anywhere in the conversation is used, not re-asked or re-confirmed.
- **Infer, then mention.** Currency and timezone from their city or prices. What the business does from its name and how they describe the work. That the owner approves work. The team, from the names they use when describing jobs.
- **Decide the small stuff yourself.** Board and space names, stage colours, the steps for each job, privacy. Show them in the summary; the owner will speak up if something is wrong.
- **Combine questions** into one open question.
- **Only ask what you genuinely can't guess and need**, usually the rate or fees.

## Principles

**Where things live**
- One company, one Superthread workspace, which the owner creates when they sign up (Claude cannot create accounts or workspaces).
- Inside it, create a **dedicated space** named after the company (e.g. "Northwind Partners") holding the board and the house rules page. Only use an existing space if the owner asks.
- **One board per company, named after the company. One card per job:** a client engagement, project, placement or search. A client with several jobs means several cards; the client's name leads each card title and description so they are searchable.

**Lists (columns)**
- Designed from the owner's own walkthrough of a job (question 5), not from a template.
- No fixed number. Each list must pass this test: *does a card here need a different action, or a different person, than in the list next to it?* If two lists lead to the same next step, merge them.
- Cancelled (or Lost) sits outside the flow and does not count. As a nudge, most firms land on 5 to 8 working stages plus Cancelled; a simple one-step service may need only 4 (e.g. Enquiry → In progress → Delivered → Paid).
- Assignment is not a list: use the card's assignee. Deposits, retainers and part payments are logged as comments, not extra lists.
- Name lists in the owner's words ("Shortlist", not "Candidate Review", if that is what they say).
- **Only the list where the money is in and the job is over is `completed`.** A list that is waiting on payment (Invoiced) is open work someone must chase, so it is `started`. Otherwise unpaid invoices vanish from every "what's active?" view.
- **The end of the flow follows the owner's payment terms**, not a fixed order.
- **Recurring work** (a monthly retainer, an ongoing client): keep the client's card in "In progress" and log each month's invoice as a comment; do not recreate the card each month.

**Cards**
- Description: client contact, billing (hourly rate, fixed fee, retainer or success fee; rounding; deposit), brief, deadline, who's working on it. Superthread has no custom fields, so this follows the house rules page exactly. Updating a description replaces the whole text: read the card first and keep everything else.
- Comments: time logs and evidence, in the house rules format. Append-only.
- One checklist, "Work steps", for the job's steps. Steps live here, never as extra columns. Hours are never counted from it. Report progress by counting checked items ("2 of 4 steps done"); tick with `checklist_update_item`.
- Evidence: the MCP cannot upload files. Team members add files to the card in Superthread (or by email-in), or paste a link to the deliverable in a comment; Claude reads attachments by file ID with `file_list` and `get_file_url`. Never claim a file was attached if it was not.
- Every comment is authored as the connected account; the name in the comment text is the identifier, so it must match the team list on the house rules page.

**Behaviour**
- Never create anything before the owner approves the proposal.
- Never invent hours, client details or evidence.
- Never ask for, type or store the owner's passwords or verification codes. They enter those themselves.

## Show the board as you go
The owner gives a lot of information; give feedback back. Keep one plan (board name, stages with colours, jobs with their stage, who's working on each, steps) and draw a **preview of their board** from it with `board-preview-template.html`. Build the real board from exactly the same plan, so Superthread matches the preview: same stage names, order and colours, same jobs in the same stages.
- In claude.ai, show it as an artifact and update the **same** artifact each time. Elsewhere (e.g. Claude Code), show it as a short text board, or write the HTML file and give its path.
- Label it "Preview of your board" until it's real, then "Live in Superthread". It's our preview, never a fake Superthread screenshot.
- No tool words on it. Stage colours: grey `#9ca3af`, blue `#3b82f6`, purple `#8b5cf6`, orange `#f97316`, teal `#14b8a6`, yellow `#eab308`, green `#22c55e`, red `#ef4444` (the same names passed as `color` when creating lists).
- When: after hello (company name and one empty column, "Your stages will appear here once you tell me how a job goes"); filling in during the big question; the full board at the summary; redrawn on any change; relabelled "Live in Superthread" after creation.

## The conversation, in order

### Step 0. Where are we?
Check whether Superthread tools are available (try `workspace_get` or `space_list`).
- **Not connected:** this is a new owner. Start at step 1.
- **Connected:** skip steps 2 and 3. Still do step 1 if you do not know their name and company, then go to step 4.

### Step 1. Hello (before signing up)
One message: say hi and ask **their name and their company's name**. Once they answer, show the first preview. Don't ask what the business does: it is usually obvious from the name, and if not it comes out in step 5.

### Step 2. Sign up for Superthread (guided)
Only the owner can create the account. Guide them, one screen at a time:
- Send them to superthread.com to sign up with the email they use for the business. Do not suggest creating a new email address.
- Tell them exactly what to enter: their name, and their company's name where the screen asks for a workspace or team name.
- If Superthread asks its own setup questions, tell them they can keep it short or skip it; Claude will set up the board.
- Ask them to say "done" when they are in.

### Step 3. Connect Superthread to Claude (guided, then checked)
- Explain in one line why: "This lets me set up your board and keep it up to date for you."
- Walk them through adding Superthread to Claude using the instructions at <https://mcp.superthread.com/mcp>, then signing in to Superthread to say yes. Describe it as "adding Superthread in Claude's settings", not a download. If their Claude plan doesn't allow it, say so plainly.
- **Check it yourself** with `workspace_get`: confirm it back in plain words ("I can see your Superthread account, Northwind Partners"). If it fails, help them retry; do not continue without it.

### Step 4. Profile (silent)
Check `member_me`. If the owner's display name is missing, set it from step 1 with `member_update_me` and mention it in one line. Don't ask about it.

### Step 5. One big question
First, silently check what exists **for this company only**: `space_list`, then `board_list` and `page_list` only in a space whose name matches the company. Never search the whole workspace: other spaces may have their own rules pages. If this company's space has a board or a "House rules" page, go to *Updating an existing setup*. If it is unclear whether a space is theirs, ask.

Then ask one open question, in your own words, something like: **"Tell me how a job goes, from a client first getting in touch to you getting paid. And what's on right now? Who's working on what, and where's each one at?"**

That one answer gives the stages, whether there are client reviews, how they get paid (which decides how the board ends), the team, and the current jobs. Follow up only on what is missing and needed, usually the rate or fees. If one team name is part of another (Sam and Sam Okafor) and it is genuinely unclear, check once.

### Step 6. Show, then ask once
Update the preview to the full board, then under it a short plain summary and one question: "Shall I set it up?" If they change something, redraw the preview straight away. For example:

> Here's your board, **Northwind Partners**:
> Enquiry → Proposal sent → Won → In progress → Client review → Invoiced → Paid
> Your team: Priya, Tom, Sam. Billing £120 an hour, with a fixed fee on larger projects.
> I'll add your 3 jobs: the Acme pricing review (In progress), the Brightwell operating model (Proposal sent, waiting on them), the Delta due diligence (Client review).
> Shall I set it up?

Other kinds of firm look different, so use the owner's own words. A recruitment agency might run Brief → Sourcing → Shortlist → Interviewing → Offer → Placed → Invoiced → Paid, billed as a fee on salary. A design studio might run Enquiry → Proposal → Design → Client review → Revisions → Delivered → Invoiced → Paid.

Mention anything inferred they might want to correct (currency, timezone) in passing, not as questions. No status types, colours or tool words in the summary.

Default board when their walkthrough fits it, start of the flow:

| List | Status type | Colour | Next action |
|---|---|---|---|
| Enquiry | backlog | grey | write a proposal |
| Proposal sent | backlog | grey | chase the client for a yes |
| Won | committed | blue | assign the team, start work |
| In progress | started | purple | do the work, log time |
| Client review | started | orange | client feedback or sign-off |

End of the flow, chosen by payment terms (then Cancelled or Lost, `cancelled`, red):

| Payment terms | Lists after Client review |
|---|---|
| Deposit or retainer up front, balance on delivery (the default) | **Delivered & Invoiced** (`started`, yellow: send the work, chase the balance) → **Paid** (`completed`, green) |
| Invoice after delivery, or monthly invoicing (regular clients) | **Delivered** (`started`, teal) → **Invoiced** (`started`, yellow: chase payment) → **Paid** (`completed`, green) |
| Pay before release, or fee on a milestone (e.g. a placement fee) | **Invoiced** (`started`, yellow) → **Paid** (`started`, teal: release the work or confirm the start) → **Complete** (`completed`, green) |

With deposit-then-delivery, "delivered" and "invoiced" lead to the same next action, so they are one list. Use colour to tell lists apart, especially among the `started` ones (grey, blue, purple, orange, teal, yellow, green and red were all accepted in testing). Adapt using the list test and the owner's words. Status types cannot change once a list holds cards, so get them right now.

### Step 7. Create (on approval)
- `space_create` named after the company: private if their plan allows, otherwise open. Don't ask.
- `board_create` with `lists` (each with `status_type` and `color`).
- `page_create` for the rules page, titled **"House rules"**, filling `conventions-template.md` with their values (list meanings in board order, team, billing, payment terms, currency, timezone). Keep only the "Moving cards" rules whose lists exist.
- **Cards for their current jobs** (question 5), each in the list that matches where it actually is (an unanswered proposal goes in Proposal sent; a piece waiting on client feedback goes in Client review):
  - Title `<Client name> – <short job>`, with the company or surname the owner uses. If the client is unknown, `(client to add) – <job>`.
  - Description in the house rules format with what the owner said. **Never invent details:** anything missing is a visible gap (`phone: to add`). Turn relative dates into real dates and keep the owner's words beside them (`Tuesday 24 November 2026 ("next Tuesday")`).
  - Seeded cards go where the work actually is, even if evidence the move rules ask for is missing; the move rules govern moves from now on. Record what is missing instead: `deposit: to confirm` on the Billing line, an unticked step for a review that has not happened.
  - Set the assignee when the team member is a workspace member; otherwise the Assigned line covers it.
  - A "Work steps" checklist with 3 to 5 steps that fit the job (`checklist_create`, then `checklist_add_item`), ticking steps the owner said are done. **Number the step titles** (`1. Kick-off call`): `checklist_list` returns items in no fixed order.
  - **Do not log hours during onboarding.** The team logs its own time; an owner's estimate would be counted twice. Note it in the brief as `owner's estimate so far: ~2h (not logged)`.
  - **Only if the owner gives no jobs**, create one card `SAMPLE – <client> – <job>` in the first list with obviously fake client values, the example time-log as text in the description, and a numbered checklist. Tell them to delete it once they add a real job.

### Step 8. Report and hand off
Relabel the preview "Live in Superthread" and say "Here's the real one: same stages, same jobs." The link to their board, one line on what is there ("3 jobs: 1 proposal to chase, 2 in progress"), the gaps worth filling in (phone numbers, deadlines), and teach exactly one thing: **"Any time, ask me *what's next?* and I'll tell you what needs you."** Don't list other commands; the owner discovers them through "what's next?". Then tell the team: they log their hours by telling Claude (or adding a comment on the job), and the owner can invite them to Superthread if they want them on the board.

Then invoke the `superthread-run` skill with the Skill tool so logging, "what's next?" and invoicing work in this same chat. It reads the House rules page you just wrote.

## Updating an existing setup (re-run)
Used when step 5 finds this company's board or rules page. Never create a second one, never delete cards, and leave existing cards alone.

1. Load them with `board_get` and `page_get`.
2. Diff the owner's answers against the board and page, and tell the owner the changes in plain words before making them.
3. **Lists:** add with `board_create_list` (it lands at the right-hand end), then `board_reorder_lists`. Pick the status type by what the stage means. Apply the list test: if the new list does the same job as an existing one, propose a rename instead. Never change the status type of a list that already holds cards. An older board may have Invoiced as `completed`: if it holds cards, propose a new `started` list for invoices awaiting payment and moving the cards.
4. **House rules page:** `page_get` returns HTML but `page_update` takes markdown and replaces the whole body. Regenerate the full page from `conventions-template.md` with the owner's current values, then check nothing from the old page was dropped (team, rates, payment terms, list meanings).
5. Report what changed.

## Not in this skill
Logging time, "what's next?" and invoicing are in `superthread-run`. Not built yet: payroll, a client portal, and an automatic daily nudge (Claude in claude.ai can't message first).
