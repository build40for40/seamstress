---
name: seamstress-onboard
description: Onboard an atelier (made-to-order garments, alterations) onto Superthread. Interviews the owner for about a minute, proposes a board, then creates a space, board, conventions page and a sample garment card through the Superthread MCP. Use when someone says "set up my atelier", "onboard me", or describes a sewing/tailoring/alterations business.
---

# Seamstress onboarding

Goal: the owner talks or types about their business for a minute, and ends with a working Superthread setup they barely need to look at. Claude is the owner's main way in: they ask Claude ("what's unbilled?", "where's the Dubois gown?") rather than reading the board.

Always design for the **atelier and seamstress** first. When in doubt, default to the atelier. Do not generalise to other industries (film, design, agencies) unless the owner's business is one.

Requires the Superthread MCP to be connected (see README). If no Superthread tools are available, stop and point the owner to the README.

**Simplicity and clarity override any rule in this file.** If a rule makes the owner's board harder to understand, break it and say why.

## Principles

**Where things live**
- One company, one Superthread workspace. The owner already has it; Claude cannot create workspaces.
- Inside it, create a **dedicated space** named after the atelier (e.g. "Atelier Sofia") holding the board and the conventions page. Only use an existing space if the owner asks.
- **One board per atelier. One card per garment or order.** Several garments for one client means several cards; the client's name leads each card title and description so they are searchable.

**Lists (columns)**
- No fixed number. Each list must pass this test: *does a card here need a different action, or a different person, than in the list next to it?* If two lists lead to the same next step, merge them.
- Cancelled sits outside the flow and does not count. As a nudge, most ateliers land on 5 to 8 working stages plus Cancelled; a simple alterations shop may need only 4 (e.g. Inquiry → In Progress → Ready → Paid).
- Assignment is not a list: use the card's assignee. Deposits and part payments are logged as comments, not extra lists.
- Name lists in the owner's words ("Fitting", not "Client Review", if that is what they say).

**Cards**
- Description: client contact, billing (rate or fixed price, rounding), brief, assignee. Superthread has no custom fields, so this follows the conventions page exactly.
- Comments: time logs and photo evidence, in the conventions format.
- Photos: the MCP cannot upload files. Photos arrive by Superthread email-in (attached natively to the card) or as an image URL in a comment (`![alt](url)`). Never claim a photo was attached if it was not.

**Behaviour**
- Never create anything before the owner approves the proposal.
- Never invent hours, client details or evidence.

## Steps

1. **Check what exists.** `space_list`, then `board_list` / `find_pages` in any space that looks like the atelier's. If an atelier board or a "Conventions (read first)" page exists, go to *Updating an existing setup* instead.
2. **Interview.** At most 6 questions; skip anything already answered.
   1. Who does the work (how many seamstresses, names)?
   2. Do clients review work before it is finished (fittings)? Who approves? If unanswered, assume the owner and say so.
   3. How do you quote and bill: hourly, fixed price, or hourly rounded to a fixed price? What rate?
   4. How do you get paid: deposit up front, on pickup, monthly?
   5. How do seamstresses report: email, message, in person?
   6. Currency and timezone (log dates use the atelier's local date, not the machine's).
3. **Propose.** Show the space name, the lists with status types and a one-line reason each, the conventions summary and the sample card. Default atelier board:

   | List | Status type | Next action |
   |---|---|---|
   | Inquiry | backlog | write a quote |
   | Quoted | backlog | chase the client for a yes |
   | Accepted | committed | assign a seamstress, start work |
   | In Progress | started | sew, log time |
   | Client Review | started | fitting or approval, needs a photo |
   | Ready for Pickup | started | client collects |
   | Invoiced | completed | chase payment |
   | Paid | completed | nothing, done |
   | Cancelled | cancelled | nothing, out of the flow |

   Adapt using the list test: rename to the owner's words (e.g. "Deposit Received" for Accepted), drop stages that do not apply, add one only if it needs a different action. Status types cannot change once a list holds cards, so get them right now.
4. **On approval, create:**
   - `space_create` for the atelier's space. Ask whether it should be open to the whole workspace or private; if private fails on the owner's plan, fall back to open and say so.
   - `board_create` with `lists`.
   - `page_create` for the conventions page, filling `conventions-template.md` with the owner's values (list meanings in board order, rate, rounding, payment terms, currency, timezone). Keep only the "Moving cards" rules whose lists exist.
5. **Sample card.** One card titled `SAMPLE – <surname> – <garment>` in the first list (backlog, so it never looks like active work). Obviously fake client values (`Sample Client · sample@example.com · 000`), a one-line brief, and the example time-log as plain text in the description under "Example log entry", not as a comment. Tell the owner to delete it once they add a real garment.
6. **Report.** Links to the space, board and conventions page, and what to do next (add a real garment; seamstresses start logging). Photos go in by Superthread email-in; do not state an address, because the MCP does not expose it. Tell the owner to find the email-in option in Superthread and send one test photo to confirm it lands on a card.

## Updating an existing setup (re-run)
Used when step 1 finds a board or conventions page. Never create a second one, never delete cards, and leave existing cards and the sample card alone.

1. Find them: `board_list` and `page_list` on the space (or `find_pages` / `search` if the space is unknown). Load with `board_get` and `page_get`.
2. Diff the owner's answers against the board and page, and tell the owner the exact changes before making them.
3. **Lists:** add with `board_create_list` (it lands at the right-hand end), then `board_reorder_lists`. Pick the status type by what the stage means. Apply the list test: if the new list does the same job as an existing one, propose a rename instead. Never change the status type of a list that already holds cards.
4. **Conventions page:** `page_get` returns HTML but `page_update` takes markdown and replaces the whole body. Regenerate the full page from `conventions-template.md` with the owner's current values, then check nothing from the old page was dropped (rate, rounding, payment terms, list meanings).
5. Report what changed.

## Logging after onboarding (the translator)
Before writing anything to a card, read the conventions page. Normalise messy input to the conventions format: "Maria did about two and a half hours on the Dubois hem" becomes a comment `⏱ 2.5h · Maria · <date> · hem`. If the garment or hours are ambiguous, ask instead of guessing. Use the atelier's timezone for "today". Ignore cards titled `SAMPLE` when totalling.

## Not in this skill yet
Invoicing (Claude totals `⏱` entries, applies the billing line, produces the invoice and links it on the card; the MCP cannot attach files, so it goes in as a linked page or comment), monthly timesheets and payroll, client portal.
