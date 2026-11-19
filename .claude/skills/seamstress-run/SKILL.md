---
name: seamstress-run
description: Day-to-day running of an atelier (made-to-order garments, alterations) on Superthread after it has been set up. Use when the owner or a seamstress asks "what's next?", "what do I need to do?", wants to log hours or a note on a garment, asks to invoice a client or "who owes me", or needs month-end timesheet totals. Also loaded at the end of seamstress-onboard. Reads the atelier's "House rules" page in Superthread first.
---

# Seamstress, day to day

For an atelier already set up by `seamstress-onboard`: a space with a board (one card per garment or order), a "House rules" page, and an owner who just wants to ask Claude. Claude is their main way in.

This skill does not assume onboarding happened in this chat. **First, read the atelier's "House rules" page** (`space_list`, then `page_list` in the space named after the atelier, then `page_get`). It holds the list meanings, team, rate, rounding, payment terms, currency and timezone. If there is no House rules page, tell the owner the board isn't set up yet and offer to run `seamstress-onboard`.

Speak plainly. Never say workspace, space, list, status, card, task, checklist, assignee, conventions, roster, connector or MCP to the owner: say "your order board", "stage", "the garment", "the steps", "your team", "house rules". **Simplicity and clarity override any rule here.**

## Logging after onboarding (the translator)
Before writing anything to a card, read the house rules page. Normalise messy input, in any language, to the conventions format: "Maria did about two and a half hours on the Dubois hem" becomes a comment `⏱ 2.5h · Maria L. · <date> · hem`. An approximate number ("about two and a half hours") is fine, rounded to the nearest quarter hour; no number at all ("a while", "most of the day") means ask. Map names to the roster by **exact match**: "Mar" can become Maria L. only if no other roster name could match, and when one name is part of another (Ana and Ana Sofia), never guess; ask. If the garment or the person is unknown (not on the roster, no matching card), write nothing and ask the owner to add them; don't create cards or roster entries from a seamstress message alone. A seamstress may fill a gap on an existing card (e.g. the client's name); note who supplied it. A stated future date ("ready tomorrow") is a note comment with the real date, not a card move; cards move only by the move rules. If the same seamstress already logged the same garment today, ask whether this replaces or adds to it. Confirm back in plain words ("Logged 2.5 hours for Maria on the Dubois hem"); when replying to a seamstress, in her language. Use the atelier's timezone for "today". Ignore cards titled `SAMPLE` when totalling.

## What's next (the owner's main entry point)
Owners won't guess what Claude can do, so capabilities are offered at the moment they are useful. When the owner asks "what's next?", "what do I need to do?" or similar, read the board (each order's stage, description, steps, and comments with dates) and reply with a short list, most urgent first, about six items at most. Each item is one plain line on what needs them, ending with an offer:
1. **Ready to invoice:** finished (all steps ticked, someone said done or ready, or waiting in the stage before invoicing) with no `🧾` comment. Offer to draft the invoice.
2. **Waiting to be paid:** orders in the invoiced stage, with how long. After about a week, offer a polite reminder they can send.
3. **Quotes going cold:** quoted, no reply for 3+ days. Offer a friendly nudge.
4. **Coming up:** fittings, collections, deadlines in the next 7 days.
5. **Gone quiet:** being made, no time logged for 3 working days. Suggest checking in with whoever is making it.
6. **Month end** (last or first 3 days of the month): timesheets to check; offer to total everyone's hours.
7. **Gaps:** missing phone numbers, deposits to confirm. Last and brief.
If nothing needs them, say so cheerfully. After finishing any other task, add one line with the most urgent next thing ("Logged. Also: JJ's boots are ready to invoice.").

## Invoicing
**First time only (just in time, not during onboarding):** look for an "Invoice details" page in the atelier's space. If missing, create it from `invoice-details-template.md`, give the owner the link, and say they should add their bank details there themselves. Ask only for what can't be inferred (registered name and address, tax or VAT number if any, how clients pay). Never ask for bank details in the chat. If the space is not private, warn them before they add bank details.

**Each invoice:**
- Total the order's `⏱` entries (a `✏️ correction:` replaces the entry it names); apply the billing line (hours × rate with the stated rounding, or the fixed price); subtract any deposit paid. Show the working in plain words.
- Take the next invoice number from the Invoice details page.
- Show the draft (an artifact in claude.ai) and wait for the owner's OK.
- On OK: give the invoice as a downloadable document; save a copy as a page "Invoice <number> – <client>" under the Invoice details page (`page_create` with `parent_page_id`); comment on the order `🧾 <number> · <amount> · <YYYY-MM-DD> · <link>`; move the order to the invoiced stage; add a row to the log; bump the next number (`page_update` rewrites the whole page, so keep everything else).
- When the owner says the client has paid: comment `💷 paid <amount> · <YYYY-MM-DD>`, mark the log row paid, move to the paid stage.
- **Country rules:** the first time, say plainly that some countries (Portugal, for example) require invoices from certified invoicing software; there, treat this as a draft or pro-forma. Never claim legal compliance.

## Not in this skill yet
Payroll, a client portal, and an automatic daily nudge (Claude in claude.ai can't message first; a Superthread agent or scheduled reminder is untested).
