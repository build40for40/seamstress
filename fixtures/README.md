# Fake data

Made-up data that matches the objects in [docs/PRD.md](../docs/PRD.md), so everyone builds and demos against the same orders. Nothing here is real: no real client, seamstress or order.

To change it, edit the lists in `generate.py` and run `python3 fixtures/generate.py`. Invoices and timesheets are worked out from the time entries, so don't edit those two CSVs by hand.

## Files

| File | Rows | What it is |
| --- | --- | --- |
| `clients.csv` | 5 | Who the garments are for. Seamstresses never see these names |
| `seamstresses.csv` | 4 | Three active, in three time zones, and one removed |
| `orders.csv` | 6 | Garment orders, each with an order number, a quote and the one hourly rate of £60 |
| `order_assignments.csv` | 6 | Which seamstress is on which order |
| `time_entries.csv` | 31 | Hours logged, on an order or as general time |
| `photos.csv` | 11 | Photo records. File names only, there are no image files |
| `invoices.csv` | 2 | One sent, one draft |
| `timesheets.csv` | 5 | One per seamstress per month |

## Values

- `orders.status`: `open`, `ready`, `invoiced`
- `time_entries.kind`: `sewing`, `tidying`, `fitting` (all billed to the order) and `waiting` (general time, paid but never billed, so `order_number` is empty)
- `review_status`: `waiting`, `approved`, `held_back`. Empty on general time, which no client ever sees
- `date_local`: the date where the seamstress is, not UK time
- `invoices.status`: `draft`, `sent`. `timesheets.status`: `open`, `sent`

## What each order is there to show

| Order | Case it covers |
| --- | --- |
| `SE-1001` | Finished and invoiced. 38 hours is £2,280 at the rate, and the CEO honoured the £2,400 quote. Entries are locked on a sent invoice and a sent October timesheet |
| `SE-1002` | Ready, with a draft invoice. 9.5 hours is £570, which is over the £480 quote, and no final price is set yet |
| `SE-1003` | Two seamstresses on one garment in the same week, with one entry waiting for the CEO |
| `SE-1004` | Runs across October and November, so its hours split over two timesheets. Has a photo waiting for the CEO |
| `SE-1005` | Has a held-back entry and photo that the client must never see, but the hours still count for pay |
| `SE-1006` | New, nobody assigned and no hours, for empty states |

Client `C001` has two orders. Seamstress `S04` is removed and has no orders. `S01` works on two orders plus general time.
