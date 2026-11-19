# Superthread onboarding skill

Onboards the owner of a client-services business (recruitment agency, design agency, consulting firm, studio) onto Superthread through one conversation with Claude, using the Superthread MCP. It is the first of two skills:

- **`superthread-onboard`** (this one): sign up, connect, set up the board.
- **`superthread-run`**: day-to-day after setup: logging time, "what's next?", invoicing. Onboarding hands off to it at the end, and it also triggers on its own in later chats.

Have one conversation with Claude and get a working system for your business. Claude gets to know you, walks you through signing up for Superthread and connecting it, then learns how your business works and sets up your board: a space for your company, a board for your jobs, a house rules page, and cards for the work you have on right now. Your board opens as your to-do list instead of an empty page.

## How onboarding goes (for an owner)

All of it happens in one chat with Claude. You only leave the chat to sign up and connect.

| Step | What happens | Who |
|---|---|---|
| 0. Start | Open Claude (claude.ai) and say "set me up" | You |
| 1. Hello | Your name and your company's name | Claude asks |
| 2. Sign up for Superthread | Claude sends you to superthread.com and tells you exactly what to type | You, guided |
| 3. Connect Superthread to Claude | Add Superthread in Claude's settings and sign in to say yes. Claude checks it can see your account | You, guided, then Claude checks |
| 4. Profile | Claude quietly fills in your name if it's missing | Claude |
| 5. One big question | How a job goes, from first contact to getting paid, and what's on right now. Claude works out the rest | Claude asks |
| 6. Preview and summary | A preview of your board fills up as you talk (from step 1). At the end Claude shows the full preview and asks once | Claude, you approve |
| 7. Your board appears | The real board in Superthread, exactly as previewed, with your house rules and current jobs | Claude |
| 8. Hand off | Claude teaches one habit, "what's next?", and loads `superthread-run` | Claude |

## For the build team
Test from Claude Code:

```
/superthread-onboard
```

For a real owner it needs to run in claude.ai (as uploaded skills or a Claude project), since they won't use a terminal. Upload both skills: `superthread-onboard` and `superthread-run`.

## What you get
- A space named after your company.
- A board with one card per job. Lists come from your own description of how a job flows; for most firms that's Enquiry, Proposal sent, Won, In progress, Client review, then an ending that follows how you get paid, plus Cancelled. Every list has to mean a different next action, so a simple service may end up with four. Invoices awaiting payment stay open work, never "done".
- A **House rules** page: the rules Claude follows when it logs time and evidence, including your team list.
- Cards for the jobs you mention, each with a numbered Work steps checklist. (A sample card only if you mention none.)

## Known limits
- Claude can't create accounts: you sign up for Superthread and connect it yourself, with Claude guiding you.
- The MCP cannot upload files: evidence is added in Superthread or linked in a comment.
- Superthread has no custom fields: rates, fees and client contact go in the card description.
- Not built yet: payroll, a client portal, an automatic daily nudge.
- Not checked yet: what Superthread's signup asks for, whether connecting Superthread in claude.ai needs a paid Claude plan, and whether Claude can update your Superthread profile.

See [DECISIONS.md](DECISIONS.md) for why it works this way.

## Layout (this folder)
- `SKILL.md`: the onboarding skill
- `conventions-template.md`: template for the house rules page
- `board-preview-template.html`: the board preview Claude draws during the conversation
- `DECISIONS.md`: design decisions
