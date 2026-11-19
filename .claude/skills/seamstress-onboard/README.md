# Superthread onboarding skill

Two skills: `seamstress-onboard` (this folder) sets everything up; `seamstress-run` handles logging, "what's next?" and invoicing afterwards. Onboarding invokes it at the end, and it also triggers on its own in later chats. Upload both to claude.ai.

A separate track from the Seamless app: onboarding an atelier owner onto Superthread through one conversation with Claude, using the Superthread MCP.

Have one conversation with Claude and get a working system for your atelier. Claude gets to know you, walks you through signing up for Superthread and connecting it, then learns how your business works and sets up your board: a space for your company, a board for orders, a conventions page, and cards for the jobs you're working on right now. Your board opens as your to-do list instead of an empty page. Hours and photo evidence then live on each garment's card, and you ask Claude instead of reading the board.

Day 14 of 40 for 40. Problem: unbilled seamstress hours.

## How onboarding goes (for an owner)

All of it happens in one chat with Claude. You only leave the chat to sign up and connect.

| Step | What happens | Who |
|---|---|---|
| 0. Start | Open Claude (claude.ai) and say "set up my atelier" | You |
| 1. Hello | Your name and your atelier's name | Claude asks |
| 2. Sign up for Superthread | Claude sends you to superthread.com and tells you exactly what to type | You, guided |
| 3. Connect Superthread to Claude | Add Superthread in Claude's settings and sign in to say yes. Claude checks it can see your account | You, guided, then Claude checks |
| 4. Profile | Claude quietly fills in your name if it's missing | Claude |
| 5. One big question | How an order goes, from first message to getting paid, and what's on the rail right now. Claude works out the rest | Claude asks |
| 6. Preview and summary | A preview of your board fills up as you talk (from step 1). At the end Claude shows the full preview and asks once | Claude, you approve |
| 7. Your board appears | The real board in Superthread, exactly as previewed, with your house rules and current orders | Claude |
| 8. Your team | Send each seamstress her personal link to the logging app. They don't sign up for anything | You |

## For the build team
The skill lives in this repo and is tested from Claude Code:

```
/seamstress-onboard
```

For a real owner it needs to run in claude.ai (as an uploaded skill or a Claude project), since an atelier owner won't use a terminal. That move is not done yet.

## After setup: "what's next?"
The owner only needs one habit: ask Claude **"what's next?"** Claude reads the board and lists what needs them today, most urgent first, each with an offer: draft the invoice for a finished order, nudge a client who hasn't answered a quote, remind someone about an unpaid invoice, total the timesheets at month end. The first time they invoice, Claude sets up a private Invoice details page (they add their bank details there themselves) and numbers every invoice from it.

## What you get
- A space named after your company.
- A board with one card per garment. Lists come from your own description of how an order flows; for most ateliers that's Inquiry, Quoted, Accepted, In Progress, Client Review, then an ending that follows how you get paid (by default Ready & Invoiced → Paid & Collected), plus Cancelled. Every list has to mean a different next action, so a simple alterations shop may end up with four. Invoices awaiting payment stay open work, never "done".
- A **House rules** page: the rules Claude follows when it logs time and evidence, including your team list.
- Cards for the jobs you mention, each with a numbered Work steps checklist. (A sample card only if you mention none.)

## Known limits (tested 2026-11-19)
- Claude can't create accounts: you sign up for Superthread and connect it yourself, with Claude guiding you.
- The MCP cannot upload files. Photos are attached by the seamstress logging app (personal link per seamstress, no login), and Claude reads them by file ID.
- Superthread has no custom fields: rate, price and client contact go in the card description.
- Not built yet: payroll, client portal, an automatic daily nudge.
- Not checked yet: what Superthread's signup asks for, whether connecting Superthread in claude.ai needs a paid Claude plan, and whether Claude can update your Superthread profile.

See [DECISIONS.md](DECISIONS.md) for why it works this way.

## Layout (this folder)
- `SKILL.md`: the onboarding skill
- `conventions-template.md`: template for the house rules page
- `board-preview-template.html`: the board preview Claude draws during the conversation
- `../seamstress-run/`: the day-to-day skill and the invoice details template
- `DECISIONS.md`: decisions made while building
