# Decisions

Made on Day 14 (19 November 2026) while building the onboarding. The newest decision wins if two conflict.

## Scope
- **Onboarding first.** The owner (CEO of an atelier) describes the business and Claude sets up Superthread. Invoicing, monthly timesheets and payroll come later.
- **Atelier and seamstress first.** When unsure, default to the atelier. Other milestone-and-evidence businesses (film production, design agencies) are a stretch goal, not a design input.
- **No per-industry templates.** Claude designs the board from the owner's description instead.
- **Simplicity and clarity override any rule**, including the ones below.

## Onboarding conversation
- **Start from zero.** We know nothing about a new owner, so the conversation opens by getting to know them: name, company name, what it does. Board questions come later.
- **The order:** (0) start in Claude, (1) get to know you, (2) sign up for Superthread, guided, (3) connect Superthread to Claude, guided, then Claude checks it can see the workspace, (4) profile, (5) how the business works, (6) proposal, (7) create, (8) send seamstresses their links.
- **Sign up early, after three easy questions.** The signup needs the name and company, and a long chat followed by "now go and fill in a form" is where people drop off. After connecting, every answer goes straight onto the board.
- **Two asks, not six questions.** (1) Your name and your atelier's name, before signup. (2) One open question after connecting: how an order goes from first contact to getting paid, and what's on the rail right now (who's making what, where it's at). Team, stages, payment terms and orders all come from that answer. Follow-ups only for what can't be guessed, usually the rate.
- **Don't ask what Claude can work out.** Never ask twice; infer currency, timezone, what the business does, the approver and the team, then mention them in the summary; decide names, colours, steps and privacy without asking. One summary, one "Shall I set it up?".
- **Show the board as it's built.** The owner gives a lot of information, so Claude draws a preview of their board from step 1 (an artifact in claude.ai), fills it in as they talk, and redraws it on any change. The real board is built from the same plan, so it matches the preview. The preview is in Seamless's style, labelled as a preview, never a fake Superthread screenshot. Creating the real board early was rejected: it breaks "nothing before your yes" and status types can't be undone once orders are in.
- **Plain words, no Superthread jargon.** The owner never hears workspace, space, list, status, card, checklist, assignee, conventions, roster, connector or MCP: it's "your Superthread account", "your order board", "stage", "order", "steps", "who's making it", "house rules", "your team". The rules page is titled "House rules". The only exception is telling the owner what to type when a Superthread screen shows its own word.
- **The board is designed from the owner's own walkthrough of an order**, not from a template.
- **Claude guides, the owner acts.** Claude cannot create accounts and never handles passwords or verification codes. It tells the owner what to enter, one screen at a time, and waits for "done".
- **The owner's experience is claude.ai, not Claude Code.** Claude Code is our build and test tool; moving the skill to claude.ai (an uploaded skill or a Claude project) is still to do.
- **Not checked yet:** what Superthread's signup asks (and whether its own onboarding overlaps ours), whether connecting Superthread in claude.ai needs a paid Claude plan, whether `member_update_me` can set the owner's profile. One real signup from scratch, done by a person, answers all three.

## After setup
- **"What's next?" is the one habit.** Owners won't guess what Claude can do, so the end of onboarding teaches one line ("ask me what's next?") and Claude offers each capability inside its answer: ready to invoice, waiting to be paid, quotes going cold, coming up, gone quiet, month-end timesheets, gaps. After any task, Claude adds the most urgent next thing.
- **Invoice details are collected just in time**, at the first invoice, on a private "Invoice details" page. The owner types bank details there themselves, never in the chat. Invoice numbers come from that page and every invoice is logged there.
- **Invoices:** totalled from `⏱` comments, deposit subtracted, draft shown first, then a downloadable document plus a copy as a Superthread page linked from the order with a `🧾` comment.
- **Country rules:** Claude says plainly that some countries (e.g. Portugal) require certified invoicing software; there the invoice is a draft or pro-forma. It never claims compliance.
- **No automatic nudge yet:** Claude in claude.ai can't message first; a Superthread agent or scheduled reminder is untested.

## Superthread as the brain
- **One company, one workspace.** The owner creates it when signing up, guided by Claude; the MCP cannot create one.
- **A dedicated space per atelier**, holding the board and the conventions page. A space is also the boundary for a client view later, since clients can only see one board or page.
- **One board per atelier, one card per garment or order.** Client details lead the card description; several garments for one client means several cards.
- **Description = client and billing details.** Superthread has no custom fields.
- **Comments = time logs and photo evidence.** Append-only; nothing is counted from anywhere else.
- **One "Work steps" checklist per card** for the garment's own steps (measure, cut, fitting, hem, press). It keeps detailed steps on the card instead of adding columns. Step titles are numbered, because the MCP returns checklist items in no fixed order.

## Lists
- **No fixed number.** A list stays only if a card there needs a different action or person than in the neighbouring list.
- **Cancelled does not count**; it sits outside the flow. Most ateliers land on 5 to 8 working stages.
- **Assignment is not a list**: use the card's assignee (the description's Assigned line covers seamstresses who are not workspace members).
- **Deposits and part payments are comments**, not lists.
- **Invoiced is open work, not done.** A list waiting on payment is `started`, because someone must chase it. Only the list where the money is in and the job is over is `completed`.
- **The end of the flow follows payment terms.** Deposit then balance on pickup (the default): Ready & Invoiced → Paid & Collected. Invoice after delivery: Delivered → Invoiced → Paid. Pay before release: Invoiced → Paid → Collected.
- **Default atelier board:** Inquiry, Quoted, Accepted, In Progress, Client Review, Ready & Invoiced, Paid & Collected, plus Cancelled.
- **Colour the lists** so lists that share a status type still read differently (e.g. Ready & Invoiced yellow, Paid & Collected green).

## Claude's role
- **Claude is the owner's main interface**: they ask Claude instead of reading the board.
- **Conventions page = the contract.** Claude reads it before writing anything to a card.
- **Translator:** Claude normalises messy input to the convention format (`⏱ 2.5h · Maria · 2026-11-19 · hem`) and asks rather than guesses. Names match the roster exactly (Ana is not Ana Sofia). An unknown person or garment is never logged until the owner adds them (tested 2026-11-19: Michael's boots entry was held until he and the card were added). "Ready tomorrow" is a dated note, not a card move.
- **Client Review / Fitting** means a fitting is booked or happening; the photo is required to tick the fitting step, not to enter the list.
- **Onboarding fills the board.** The interview asks about two or three garments in progress, and they become real cards in the right lists, so the owner never lands on an empty board. Missing details are left as visible gaps (`phone: to add`), never invented. A SAMPLE card only if the owner gives none.
- **Seeded cards go where the work actually is.** The move rules govern moves after onboarding; anything missing (deposit, fitting photo) is recorded on the card as `to confirm` or an unticked step.
- **No hours logged at onboarding.** The seamstress logs her own time from the app; the owner's estimate goes in the brief as "not logged", so nothing is counted twice.
- **Step 1 only looks in this atelier's space**, never the whole workspace, so other spaces' conventions pages are not mistaken for this one.
- **Propose before creating.** Nothing is created without the owner's approval. Re-runs update the existing setup instead of duplicating it.

## Seamstress logging (web app, Ben)
- **No WhatsApp.** Seamstresses log through a simple mobile web app (text, voice, photo) that writes to Superthread.
- **A personal link per seamstress is her identity.** No login or password. The owner sends it once (text message or printed QR), she adds it to her home screen, and the owner reissues it if it is lost. The link also sets her language.
- **Logging in about four taps:** pick the garment from photo thumbnails of her assigned cards, take a photo, set hours with +½h / −½h, send. Voice note optional.
- **Names come from a roster** on the conventions page, one canonical name each (e.g. "Maria L."), so payroll totals never split one person into several. Entries from the app end with `· via app`.
- **The owner approving the monthly timesheet is the control**, not authentication.
- **Comments are authored as the connected account**; the name in the comment text is the identifier.
- **Photos:** the app attaches them; Claude reads them by file ID with `get_file_url`.

## Language
- **Claude handles non-English text with no extra build**: understanding, translating to the conventions format, and confirming back in the seamstress's language.
- **Voice needs a speech-to-text step** before Claude: Claude's API takes text, images and PDFs, not audio. Use the phone browser's speech recognition or a transcription service.
- **The app's own buttons need translating** too; keep them icon-first so there is little text to translate.

## Constraints found by testing (19 November 2026)
- The MCP cannot upload files. Photos come in from the seamstress app (or Superthread email-in) and Claude reads them by file ID; invoices will be a linked page or comment, not an attachment.
- A list's status type is fixed once it holds cards. Several lists can share a status type.
- Single line breaks collapse in card descriptions; use bullets.
- `page_get` returns HTML but `page_update` takes markdown and replaces the whole page.
- List colours are set at board creation; grey, blue, purple, orange, teal, yellow, green and red were accepted (not yet checked visually in the app).
- Checklists work through the MCP (create, add, tick, list), but `checklist_list` returns items in no fixed order with no position field.
- Not verified yet: reading a real attached photo by file ID end to end; the MCP setup path for a brand-new customer.
