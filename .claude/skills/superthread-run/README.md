# Superthread run skill

The day-to-day half of the Superthread onboarding. `superthread-onboard` sets up the space, board and House rules page; this skill runs the business on it.

The owner has one habit: ask Claude **"what's next?"** Claude reads the board and lists what needs them today, most urgent first, each with an offer: draft the invoice for a finished job, nudge a client who hasn't answered a proposal, remind someone about an unpaid invoice, total the timesheets at month end. The first time they invoice, Claude sets up a private Invoice details page (they add their bank details there themselves) and numbers every invoice from it.

## How it gets loaded
- `superthread-onboard` invokes it at the end of onboarding, so it works in the same chat.
- In any later chat it triggers on its own from its description ("what's next?", log hours, invoice, who owes me).
- It never relies on onboarding context: it reads the "House rules" page from Superthread first.

## Layout
- `SKILL.md`: logging, what's next, invoicing
- `invoice-details-template.md`: the private Invoice details page, created at the first invoice

Upload it to claude.ai together with `superthread-onboard`.
