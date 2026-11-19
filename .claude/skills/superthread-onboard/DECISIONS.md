# Decisions

Adapted from the seamstress onboarding (Day 14, 19 November 2026) for any client-services business. The newest decision wins if two conflict.

## Scope
- **Any client-services business.** Recruitment agencies, design agencies, consulting firms, studios and similar. Claude infers the kind of business from the name and the owner's walkthrough and uses their words for the work.
- **No per-industry templates.** Claude designs the board from the owner's description instead.
- **Two skills.** `superthread-onboard` sets things up; `superthread-run` handles logging, "what's next?" and invoicing. They are separate so each can be uploaded and triggered on its own. Onboarding invokes `superthread-run` at the end, and `superthread-run` reads the House rules page from Superthread, so it works in any later chat.
- **Simplicity and clarity override any rule**, including the ones below.

## Onboarding conversation
- **Start from zero.** We know nothing about a new owner, so the conversation opens by getting to know them: name and company name. Board questions come later.
- **The order:** (0) start in Claude, (1) get to know you, (2) sign up for Superthread, guided, (3) connect Superthread to Claude, guided, then Claude checks it can see the workspace, (4) profile, (5) how the business works, (6) proposal, (7) create, (8) hand off.
- **Sign up early, after three easy questions.** A long chat followed by "now go and fill in a form" is where people drop off. After connecting, every answer goes straight onto the board.
- **Two asks, not six questions.** (1) Your name and your company's name. (2) One open question after connecting: how a job goes from first contact to getting paid, and what's on right now. Team, stages, payment terms and jobs all come from that answer. Follow-ups only for what can't be guessed, usually the rate or fees.
- **Don't ask what Claude can work out.** Never ask twice; infer currency, timezone, what the business does, the approver and the team, then mention them in the summary; decide names, colours, steps and privacy without asking. One summary, one "Shall I set it up?".
- **Show the board as it's built.** Claude draws a preview of the board from step 1 (an artifact in claude.ai), fills it in as the owner talks, and redraws it on any change. The real board is built from the same plan. The preview is labelled as a preview, never a fake Superthread screenshot. Creating the real board early was rejected: it breaks "nothing before your yes" and status types can't be undone once jobs are in.
- **Plain words, no Superthread jargon.** The owner never hears workspace, space, list, status, card, checklist, assignee, conventions, roster, connector or MCP. The rules page is titled "House rules". The only exception is telling the owner what to type when a Superthread screen shows its own word.
- **The board is designed from the owner's own walkthrough of a job**, not from a template.
- **Claude guides, the owner acts.** Claude cannot create accounts and never handles passwords or verification codes.
- **The owner's experience is claude.ai, not Claude Code.** Claude Code is our build and test tool; moving both skills to claude.ai is still to do.
- **Not checked yet:** what Superthread's signup asks, whether connecting Superthread in claude.ai needs a paid Claude plan, whether `member_update_me` can set the owner's profile.

## Superthread as the brain
- **One company, one workspace.** The owner creates it when signing up; the MCP cannot.
- **A dedicated space per company**, holding the board and the House rules page.
- **One board per company, one card per job.** Client details lead the card description; several jobs for one client means several cards. Ongoing retainers stay as one card, with each month's invoice logged as a comment.
- **Description = client and billing details.** Superthread has no custom fields. Billing covers hourly, fixed fee, retainer and fee-on-milestone (for example a placement fee).
- **Comments = time logs and evidence.** Append-only; nothing is counted from anywhere else.
- **One "Work steps" checklist per card**, with numbered step titles because the MCP returns checklist items in no fixed order.

## Lists
- **No fixed number.** A list stays only if a card there needs a different action or person than in the neighbouring list.
- **Cancelled does not count**; it sits outside the flow. Most firms land on 5 to 8 working stages.
- **Assignment is not a list**: use the card's assignee.
- **Deposits, retainers and part payments are comments**, not lists.
- **Invoiced is open work, not done.** A list waiting on payment is `started`. Only the list where the money is in and the job is over is `completed`.
- **The end of the flow follows payment terms.** Deposit then balance on delivery (default): Delivered & Invoiced → Paid. Invoice after delivery: Delivered → Invoiced → Paid. Pay before release or fee on a milestone: Invoiced → Paid → Complete.
- **Default board:** Enquiry, Proposal sent, Won, In progress, Client review, Delivered & Invoiced, Paid, plus Cancelled.
- **Colour the lists** so lists that share a status type still read differently.

## Claude's role
- **Claude is the owner's main interface**: they ask Claude instead of reading the board.
- **House rules page = the contract.** Claude reads it before writing anything to a card.
- **Onboarding fills the board.** The interview asks about two or three jobs in progress, and they become real cards in the right lists. Missing details are left as visible gaps, never invented. A SAMPLE card only if the owner gives none.
- **No hours logged at onboarding.** The team logs its own time; the owner's estimate goes in the brief as "not logged", so nothing is counted twice.
- **Step 5 only looks in this company's space**, never the whole workspace.
- **Propose before creating.** Re-runs update the existing setup instead of duplicating it.

## Constraints found by testing (19 November 2026, carried over)
- The MCP cannot upload files. Claude reads attachments by file ID.
- A list's status type is fixed once it holds cards. Several lists can share a status type.
- Single line breaks collapse in card descriptions; use bullets.
- `page_get` returns HTML but `page_update` takes markdown and replaces the whole page.
- List colours are set at board creation; grey, blue, purple, orange, teal, yellow, green and red were accepted.
- Checklists work through the MCP, but `checklist_list` returns items in no fixed order.
