# House rules

Not sure what to do? Ask Claude "what's next?"

How this company's board works. Claude reads this before writing anything to a job.

## The board
- One board. **One card per job** (an engagement, project, placement or search). A client with three jobs has three cards.
- Card title: `<Client> – <short job>`.
- Lists mean (in board order):
{{LIST_MEANINGS}}

(Fill as sub-bullets indented two spaces, one per list: `  - <List name>: <meaning>`. Remove this line.)

## Team
Use exactly these names in every log entry:
{{TEAM}}

Names are matched exactly. If one name is part of another (e.g. Sam and Sam Okafor), they are different people: always write the longer name in full, and ask when a message could mean either.

## Card description (top of every card)

Use a blank line or a bullet between each item, because single line breaks collapse.

- **Client:** name · email · phone
- **Billing:** `hourly @ {{CURRENCY}}{{RATE}}/h`, `fixed {{CURRENCY}}<amount>`, `retainer {{CURRENCY}}<amount>/month` or `fee {{CURRENCY}}<amount> on <milestone>`; rounding: {{ROUNDING}}; deposit: `paid <YYYY-MM-DD>` or `to confirm`
- **Brief:** what the job is, deadline
- **Assigned:** team member name(s). Also set the card's assignee when the person is a workspace member; this line covers people who are not.

## Logging time (one comment per entry)

Format: `⏱ <hours>h · <team member> · <YYYY-MM-DD> · <task>`

- The team member name must match the team list exactly. An unknown name or job is not logged: the owner adds the person or the card first.
- A future date ("delivering tomorrow") is a `📅` note comment with the real date, not a card move.
- Hours are decimals: 2.5h, not 2h30. Quarter hours at most.
- One entry per team member per task per day.
- Corrections: add a new comment starting with `✏️ correction:` and the entry it replaces. Do not edit or delete old entries.

## Work steps (checklist)
Each card has one checklist, "Work steps", for the job's own steps, numbered in order (e.g. `1. Kick-off call`, `2. First draft (client review)`, `3. Revisions`, `4. Final delivery`). Tick steps as they are done. Hours are never counted from the checklist, only from `⏱` comments.

## Payment terms
{{PAYMENT_TERMS}} (for example: 50% deposit before work starts, balance on delivery.)

## Evidence
- Files are added to the card in Superthread (or by email-in), or linked in a comment.
- Say what it shows and which milestone it proves, e.g. `📎 first draft sent to client`.

## Moving cards
(Keep only the rules whose lists exist on this board, and add one per extra stage.)

- Move to **Won** only when the client has agreed the proposal (and paid the deposit, if one is taken). Log the deposit as a comment: `💷 deposit <amount> · <YYYY-MM-DD>`.
- Move to **Client review** when work has been sent to the client for feedback or sign-off. Tick the review step on the Work steps checklist only with evidence.
- Move to the invoiced list (e.g. **Delivered & Invoiced** or **Invoiced**) only after an invoice has been produced and linked on the job (`🧾` comment). Jobs here are open work: chase them. To invoice, ask Claude: "invoice <job>".
- Move to the paid list (e.g. **Paid** or **Complete**) only when the owner confirms payment. This is the only list that means "done".

## Sample cards
Cards titled `SAMPLE – …` are examples. Ignore them in timesheets, totals and invoices.

## Dates
Dates in log entries use {{TIMEZONE}} local time.

## Invoicing
Total the `⏱` entries on the card, apply the billing line in the description, round as stated, and state the working in the invoice.
