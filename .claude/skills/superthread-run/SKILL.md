---
name: superthread-run
description: Day-to-day running of a client-services business (recruitment agency, design agency, consulting firm, studio) on Superthread, after it has been set up. Use when the owner or a team member asks "what's next?", "what do I need to do?", wants to log hours or a note on a job, asks to invoice a client or "who owes me", or needs month-end timesheet totals. Also loaded at the end of superthread-onboard. Reads the company's "House rules" page in Superthread first.
---

# Superthread, day to day

For a business already set up by `superthread-onboard`: a space with a board (one card per job), a "House rules" page, and an owner who just wants to ask Claude. Claude is their main way in, so they never need to learn Superthread's features.

This skill does not assume onboarding happened in this chat. **First, read the company's "House rules" page** (`space_list`, then `page_list` in the space named after the company, then `page_get`). It holds the list meanings, team, billing formats, payment terms, currency and timezone. If there is no House rules page, tell the owner the board isn't set up yet and offer to run `superthread-onboard`.

Speak plainly. The owner is not technical. Never say workspace, space, list, status, card, task, checklist, assignee, conventions, roster, connector or MCP: say "your board", "stage", "the job", "the steps", "your team", "house rules". **Simplicity and clarity override any rule here.**

## Logging (the translator)
Before writing anything to a card, use the House rules page. Normalise messy input, in any language, to its format: "Maria did about two and a half hours on the Acme deck" becomes a comment `⏱ 2.5h · Maria L. · <date> · deck`. An approximate number ("about two and a half hours") is fine, rounded to the nearest quarter hour; no number at all ("a while", "most of the day") means ask. Map names to the team list by **exact match**: "Mar" can become Maria L. only if no other team name could match, and when one name is part of another (Sam and Sam Okafor), never guess; ask. If the job or the person is unknown (not on the team list, no matching card), write nothing and ask the owner to add them; don't create cards or team entries from a team member's message alone. A team member may fill a gap on an existing card (e.g. the client's phone); note who supplied it. A stated future date ("delivering tomorrow") is a note comment with the real date, not a card move; cards move only by the move rules. If the same person already logged the same job today, ask whether this replaces or adds to it. Confirm back in plain words ("Logged 2.5 hours for Maria on the Acme deck"); when replying to a team member, in their language. Use the company's timezone for "today". Ignore cards titled `SAMPLE` when totalling.

Evidence: Claude can't upload files. Team members add files to the card in Superthread or paste a link in a comment; Claude reads attachments by file ID with `file_list` and `get_file_url`. Never claim a file was attached if it was not.

## What's next (the owner's main entry point)
Owners won't guess what Claude can do, so capabilities are offered at the moment they are useful. When the owner asks "what's next?", "what do I need to do?" or similar, read the board (each job's stage, description, steps, and comments with dates) and reply with a short list, most urgent first, about six items at most. Each item is one plain line on what needs them, ending with an offer:
1. **Ready to invoice:** finished (all steps ticked, someone said done or delivered, or waiting in the stage before invoicing) with no `🧾` comment. Offer to draft the invoice. For retainers, the month's invoice is due.
2. **Waiting to be paid:** jobs in the invoiced stage, with how long. After about a week, offer a polite reminder they can send.
3. **Proposals going cold:** proposal sent, no reply for 3+ days. Offer a friendly nudge.
4. **Coming up:** reviews, deadlines, deliveries or start dates in the next 7 days.
5. **Gone quiet:** in progress, no time logged for 3 working days. Suggest checking in with whoever is working on it.
6. **Month end** (last or first 3 days of the month): timesheets to check; offer to total everyone's hours.
7. **Gaps:** missing phone numbers, deposits to confirm. Last and brief.

If nothing needs them, say so cheerfully. After finishing any other task, add one line with the most urgent next thing ("Logged. Also: the Acme pricing review is ready to invoice.").

## Invoicing
**First time only (just in time):** look for an "Invoice details" page in the company's space. If missing, create it from `invoice-details-template.md`, give the owner the link, and say they should add their bank details there themselves. Ask only for what can't be inferred (registered name and address, tax or VAT number if any, how clients pay). Never ask for bank details in the chat. If the space is not private, warn them before they add bank details.

**Each invoice:**
- Total the job's `⏱` entries (a `✏️ correction:` replaces the entry it names); apply the Billing line (hours × rate with the stated rounding, a fixed fee, the month's retainer, or a fee on a milestone); subtract any deposit paid. Show the working in plain words.
- Take the next invoice number from the Invoice details page.
- Show the draft (an artifact in claude.ai) and wait for the owner's OK.
- On OK: give the invoice as a downloadable document; save a copy as a page "Invoice <number> – <client>" under the Invoice details page (`page_create` with `parent_page_id`); comment on the job `🧾 <number> · <amount> · <YYYY-MM-DD> · <link>`; move the job to the invoiced stage (a retainer stays where it is); add a row to the log; bump the next number (`page_update` rewrites the whole page, so keep everything else).
- When the owner says the client has paid: comment `💷 paid <amount> · <YYYY-MM-DD>`, mark the log row paid, move to the paid stage.
- **Country rules:** the first time, say plainly that some countries (Portugal, for example) require invoices from certified invoicing software; there, treat this as a draft or pro-forma. Never claim legal compliance.

## Rules that always hold
- Never invent hours, client details or evidence.
- Never ask for, type or store passwords, verification codes or bank details in the chat.
- Cards move only by the House rules move rules, and only the paid stage means done.
- Updating a card description or page replaces the whole text: read it first and keep everything else.

## Not built yet
Payroll, a client portal, and an automatic daily nudge (Claude in claude.ai can't message first).
