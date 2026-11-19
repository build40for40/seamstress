# Fake data

Made-up data that matches the objects in [docs/PRD.md](../docs/PRD.md), so everyone builds and demos against the same atelier. The app's seed (`pnpm seed`) loads these files. Nothing here is real: no real client, seamstress or order.

To change it, edit the lists in `generate.py` and run `python3 fixtures/generate.py`. Invoices and timesheets are worked out from the time entries, so don't edit those two CSVs by hand.

## Files

| File | Rows | What it is |
| --- | --- | --- |
| `atelier.csv` | 1 | The fake atelier: name, reply-to email and the one hourly rate of £60 |
| `price_list.csv` | 4 | Known work with a set price, for filling in quotes |
| `clients.csv` | 5 | Who the orders are for. Seamstresses never see these names |
| `seamstresses.csv` | 4 | Three active, in three time zones, and one removed, each with a pay rate |
| `orders.csv` | 6 | Orders, each with an order number, a quote, a due date and an express flag |
| `garments.csv` | 7 | The garments on each order, with their stage |
| `garment_assignments.csv` | 7 | Which seamstress is on which garment |
| `time_entries.csv` | 31 | Hours logged, on a garment or as general time |
| `photos.csv` | 11 | Photo records. File names only, there are no image files |
| `invoices.csv` | 2 | One sent, one draft |
| `timesheets.csv` | 5 | One per seamstress per month, with pay |
| `seamstress_scripts.csv` | 146 | The conversation, line by line, that would produce every time entry and photo |
| `order_notes.json` | 21 | Notes a CEO might type or dictate to add an order, each with the draft it should give, for `pnpm --filter api eval:order-draft`. It brings its own small team, clients and price list, since the names in the CSVs are too alike to test matching |

## Seamstress scripts

`seamstress_scripts.csv` is what each seamstress says or types, day by day, and what the app says back. It's there for the stretch goal of a "say it or type it" box: feed in the `seamstress` lines for a day and you should end up with the rows named in `creates`. The app itself logs time with a timer, so these lines don't describe its screens.

- `speaker` is `seamstress` or `app`. `time_local` is her own clock.
- `creates` is the `entry_id` or `photo_id` that line produces. Every row in `time_entries.csv` and `photos.csv` is created by exactly one line, and the generator fails if that stops being true.
- Each day opens with her asking what's on her list.
- She names an order by its number or by the garment ("the veil"), never by the client.
- A line starting `[sends file.jpg]` is a photo with a spoken caption.

Days worth trying first:

| Seamstress and day | What happens |
| --- | --- |
| `S01`, 13 Oct | A fitting on an order, a photo, then waiting logged as general time |
| `S01`, 29 Oct | She says two hours, then corrects it to two and a half |
| `S01`, 30 Oct | Tidying up on an order, a photo, and "it's finished" |
| `S02`, 10 Nov | "Two hours on a fitting" with two orders open, so the app asks which one |
| `S02`, 17 Nov | She explains a mistake. The CEO later holds that entry and photo back |

## Values

- `orders.status`: `open`, `ready`, `collected`, `cancelled`. `orders.express`: `yes` or `no`
- `garments.status`: `todo`, `in_progress`, `fitting`, `done`
- `garment_ref` is the order number plus a letter, such as `SE-1003-B`
- `time_entries.kind`: `sewing`, `tidying`, `fitting` (all billed to the order) and `waiting` (general time, paid but never billed, so `order_number` and `garment_ref` are empty)
- `review_status`: `waiting`, `approved`, `held_back`. Empty on general time, which no client ever sees
- `date_local`: the date where the seamstress is, not UK time
- `invoices.status`: `draft`, `sent`, `paid`. `timesheets.status`: `open`, `sent`
- Money is in whole pounds here. The app stores pence

The fixtures describe the state on Thursday 19 November 2026, so due dates are relative to that day. The seed shifts every date by the same number of days so the demo always looks current.

## What each order is there to show

| Order | Case it covers |
| --- | --- |
| `SE-1001` | Finished, collected and invoiced. 38 hours is £2,280 at the rate, and the CEO honoured the £2,400 quote. Entries are locked on a sent invoice and a sent October timesheet |
| `SE-1002` | Ready, due tomorrow, with a draft invoice. 9.5 hours is £570, which is over the £480 quote, and no final price is set yet |
| `SE-1003` | Express, due tomorrow, with two garments. `SE-1003-A` has two seamstresses on it in the same week, `SE-1003-B` has one entry waiting for the CEO. `S03` sees `SE-1003-A` and "+1 other garment" |
| `SE-1004` | Runs across October and November, so its hours split over two timesheets. Has a photo waiting for the CEO |
| `SE-1005` | Overdue, at fitting. Has a held-back entry and photo that the client must never see, but the hours still count for pay |
| `SE-1006` | New, nobody assigned and no hours, for empty states |

Client `C001` has two orders. Seamstress `S04` is removed and has no garments. `S01` works on two orders plus general time.
