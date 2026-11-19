# Conventions (read first)

This page is the contract for how this atelier's board works. Claude reads it before writing to any card.

## The board
- One board. **One card per garment or order.** A client with three garments has three cards.
- Card title: `<Client surname> – <short garment and job>`.
- Lists mean (in board order):
{{LIST_MEANINGS}}

(Fill as sub-bullets indented two spaces, one per list: `  - <List name>: <meaning>`. Remove this line.)

## Seamstresses (roster)
Use exactly these names in every log entry:
{{ROSTER}}

Names are matched exactly. If one name is part of another (e.g. Ana and Ana Sofia), they are different people: always write the longer name in full, and ask when a message could mean either.

## Card description (top of every card)

Use a blank line or a bullet between each item, because single line breaks collapse.

- **Client:** name · email · phone
- **Billing:** `hourly @ {{CURRENCY}}{{RATE}}/h` or `fixed {{CURRENCY}}<amount>`; rounding: {{ROUNDING}}; deposit: `paid <YYYY-MM-DD>` or `to confirm`
- **Brief:** what is being made or altered, deadline
- **Assigned:** seamstress name(s). Also set the card's assignee when the seamstress is a workspace member; this line covers seamstresses who are not.

## Logging time (one comment per entry)

Format: `⏱ <hours>h · <seamstress> · <YYYY-MM-DD> · <task>` (entries from the seamstress app end with `· via app`)

- The seamstress name must match the roster exactly. An unknown name or garment is not logged: the owner adds the person or the card first.
- A future date ("ready tomorrow") is a `📅` note comment with the real date, not a card move.

- Hours are decimals: 2.5h, not 2h30. Quarter hours at most.
- One entry per seamstress per task per day.
- Corrections: add a new comment starting with `✏️ correction:` and the entry it replaces. Do not edit or delete old entries.

## Work steps (checklist)
Each card has one checklist, "Work steps", for the garment's steps, numbered in order (e.g. `1. Measure and pin`, `2. First fitting (photo)`, `3. Hem`, `4. Final press`). Tick steps as they are done. Hours are never counted from the checklist, only from `⏱` comments.

## Payment terms
{{PAYMENT_TERMS}} (for example: 50% deposit before work starts, balance on pickup.)

## Evidence (photos)
- Photos are attached from the seamstress app (or by email-in), or added as an image in a comment.
- Say what the photo shows and which milestone it proves, e.g. `📷 first fitting, bodice pinned`.

## Moving cards
(Keep only the rules whose lists exist on this board, and add one per extra stage.)

- Move to **Accepted** only when the client has agreed the quote (and paid the deposit, if one is taken). Log the deposit as a comment: `💷 deposit <amount> · <YYYY-MM-DD>`.
- Move to **Client Review** when a fitting or approval is booked or happening. Tick the fitting step on the Work steps checklist only with a photo as evidence.
- Move to the invoiced list (e.g. **Ready & Invoiced** or **Invoiced**) only after an invoice has been produced and linked on the card. Cards here are open work: chase them.
- Move to the paid list (e.g. **Paid & Collected** or **Paid**) only when the owner confirms payment. This is the only list that means "done".

## Sample cards
Cards titled `SAMPLE – …` are examples. Ignore them in timesheets, totals and invoices.

## Dates
Dates in log entries use {{TIMEZONE}} local time.

## Invoicing (later)
Total the `⏱` entries on the card, apply the billing line in the description, round as stated, and state the working in the invoice.
