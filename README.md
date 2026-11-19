# Seamstress

Describe your atelier in a minute. Claude sets up Superthread for you: a space for your atelier, a board for garment orders, a conventions page, and a sample card. Hours and photo evidence then live in each garment's comments, and you ask Claude instead of reading the board.

Day 14 of 40 for 40. Problem: unbilled seamstress hours.

## Setup (once)

1. Have a Superthread workspace for your company (one company, one workspace). Claude cannot create the workspace for you.
2. Connect the Superthread MCP to Claude using the official instructions at <https://mcp.superthread.com/mcp> (the page links to the setup steps for each client). Authorize when prompted.
3. In Claude Code, open this repo and run the skill:

   ```
   /seamstress-onboard
   ```

   or just say "set up my atelier" and describe your business.

## What you get
- A space named after your atelier.
- A board with one card per garment. Default lists: Inquiry, Quoted, Accepted, In Progress, Client Review, Ready for Pickup, Invoiced, Paid, plus Cancelled. Claude adapts them to your interview: every list has to mean a different next action, so a simple alterations shop may end up with four.
- Page **Conventions (read first)**: the rules Claude follows when it logs time and evidence.
- One sample garment card.

## Known limits (tested 2026-11-19)
- The MCP cannot upload files. Photos arrive via Superthread email-in or as image URLs in comments.
- Superthread has no custom fields: rate, price and client contact go in the card description.
- Not built yet: invoice generation, payroll, client portal.

See [DECISIONS.md](DECISIONS.md) for why it works this way.

## Layout
- `.claude/skills/seamstress-onboard/SKILL.md`: the onboarding skill
- `.claude/skills/seamstress-onboard/conventions-template.md`: template for the conventions page
- `DECISIONS.md`: decisions made while building
