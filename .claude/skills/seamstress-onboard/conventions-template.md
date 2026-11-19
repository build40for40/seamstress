# Conventions (read first)

This page is the contract for how this atelier's board works. Claude reads it before writing to any card.

## The board
- One board. **One card per garment or order.** A client with three garments has three cards.
- Card title: `<Client surname> – <short garment and job>`.
- Lists mean (one bullet per list, in board order, as `- <List name>: <meaning>`):
{{LIST_MEANINGS}}

## Card description (top of every card)

Use a blank line or a bullet between each item, because single line breaks collapse.

- **Client:** name · email · phone
- **Billing:** `hourly @ {{CURRENCY}}{{RATE}}/h` or `fixed {{CURRENCY}}<amount>`; rounding: {{ROUNDING}}
- **Brief:** what is being made or altered, deadline
- **Assigned:** seamstress name(s). Also set the card's assignee when the seamstress is a workspace member; this line covers seamstresses who are not.

## Logging time (one comment per entry)

Format: `⏱ <hours>h · <seamstress> · <YYYY-MM-DD> · <task>`

- Hours are decimals: 2.5h, not 2h30. Quarter hours at most.
- One entry per seamstress per task per day.
- Corrections: add a new comment starting with `✏️ correction:` and the entry it replaces. Do not edit or delete old entries.

## Payment terms
{{PAYMENT_TERMS}} (for example: 50% deposit before work starts, balance on pickup.)

## Evidence (photos)
- Photos arrive by email-in to the card, or as an image in a comment.
- Say what the photo shows and which milestone it proves, e.g. `📷 first fitting, bodice pinned`.

## Moving cards
(Keep only the rules whose lists exist on this board, and add one per extra stage.)

- Move to **Accepted** only when the client has agreed the quote (and paid the deposit, if one is taken). Log the deposit as a comment: `💷 deposit <amount> · <YYYY-MM-DD>`.
- Move to **Client Review** only with a photo as evidence.
- Move to **Invoiced** only after an invoice has been produced and linked on the card.
- Move to **Paid** only when the owner confirms payment.

## Sample cards
Cards titled `SAMPLE – …` are examples. Ignore them in timesheets, totals and invoices.

## Dates
Dates in log entries use {{TIMEZONE}} local time.

## Invoicing (later)
Total the `⏱` entries on the card, apply the billing line in the description, round as stated, and state the working in the invoice.
