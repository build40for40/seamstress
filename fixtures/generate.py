"""Writes the fake fixture CSVs next to this file. Run: python3 fixtures/generate.py

Everything here is made up. No real client, seamstress or order appears in it.
Edit the lists below and run it again: the invoices and timesheets are worked out
from the time entries, so they can't drift apart.
"""

import csv
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
RATE = 60  # the atelier's one hourly rate, in pounds

CLIENTS = [
    ("C001", "Client One (fake)"),
    ("C002", "Client Two (fake)"),
    ("C003", "Client Three (fake)"),
    ("C004", "Client Four (fake)"),
    ("C005", "Client Five (fake)"),
]

SEAMSTRESSES = [
    # id, name, time zone, active
    ("S01", "Ada Example", "Europe/London", "yes"),
    ("S02", "Bea Example", "Europe/Lisbon", "yes"),
    ("S03", "Cleo Example", "Asia/Kolkata", "yes"),
    ("S04", "Dot Example", "Europe/London", "no"),
]

ORDERS = [
    # order number, client, description, quote, status, created
    ("SE-1001", "C001", "Ivory silk wedding gown, made to order", 2400, "invoiced", "2026-10-02"),
    ("SE-1002", "C002", "Velvet evening coat, reline and new cuffs", 480, "ready", "2026-11-02"),
    ("SE-1003", "C003", "Beaded bridesmaid dress, take in and hem", 300, "open", "2026-11-13"),
    ("SE-1004", "C001", "Wedding veil, hand-rolled edge", 600, "open", "2026-10-23"),
    ("SE-1005", "C004", "Tweed jacket, made to measure", 1500, "open", "2026-11-06"),
    ("SE-1006", "C005", "Linen suit trousers, taper and hem", 120, "open", "2026-11-18"),
]

ASSIGNMENTS = [
    ("SE-1001", "S01"),
    ("SE-1002", "S02"),
    ("SE-1003", "S01"),
    ("SE-1003", "S03"),
    ("SE-1004", "S03"),
    ("SE-1005", "S02"),
    # SE-1006 has nobody yet, for the empty state
]

# order ("" = general time), seamstress, date in her own time zone, hours, kind, review, note
ENTRIES = [
    ("SE-1001", "S01", "2026-10-05", 4, "sewing", "approved", "Cut and tacked the bodice"),
    ("SE-1001", "S01", "2026-10-06", 5, "sewing", "approved", "Bodice seams and boning channels"),
    ("SE-1001", "S01", "2026-10-08", 4.5, "sewing", "approved", "Skirt panels"),
    ("SE-1001", "S01", "2026-10-12", 5, "sewing", "approved", "Joined skirt to bodice"),
    ("SE-1001", "S01", "2026-10-13", 3, "fitting", "approved", "First fitting"),
    ("", "S01", "2026-10-13", 0.5, "waiting", "", "Waited for the fitting to start"),
    ("SE-1001", "S01", "2026-10-19", 5, "sewing", "approved", "Alterations from the fitting"),
    ("SE-1001", "S01", "2026-10-20", 4, "sewing", "approved", "Lining"),
    ("SE-1001", "S01", "2026-10-26", 4, "sewing", "approved", "Buttons and loops"),
    ("SE-1001", "S01", "2026-10-29", 2.5, "sewing", "approved", "Hem"),
    ("SE-1001", "S01", "2026-10-30", 1, "tidying", "approved", "Pressed and packed"),
    ("SE-1004", "S03", "2026-10-26", 2, "sewing", "approved", "Cut the tulle"),
    ("SE-1004", "S03", "2026-10-28", 1.5, "sewing", "approved", "Started the rolled edge"),
    ("SE-1002", "S02", "2026-11-03", 3, "sewing", "approved", "Removed the old lining"),
    ("SE-1002", "S02", "2026-11-04", 2.5, "sewing", "approved", "Cut and set the new lining"),
    ("SE-1004", "S03", "2026-11-05", 2, "sewing", "approved", "Rolled edge, first half"),
    ("", "S03", "2026-11-05", 1, "waiting", "", "Waited for the thread delivery"),
    ("SE-1005", "S02", "2026-11-09", 4, "sewing", "approved", "Cut the tweed"),
    ("SE-1002", "S02", "2026-11-10", 2, "fitting", "approved", "Fitting for the cuffs"),
    ("", "S02", "2026-11-10", 0.5, "waiting", "", "Waited for the fitting to start"),
    ("SE-1002", "S02", "2026-11-11", 1.5, "sewing", "approved", "New cuffs"),
    ("SE-1002", "S02", "2026-11-12", 0.5, "tidying", "approved", "Pressed and packed"),
    ("SE-1004", "S03", "2026-11-13", 1.5, "sewing", "approved", "Rolled edge, second half"),
    ("SE-1005", "S02", "2026-11-13", 5, "sewing", "approved", "Canvas and front panels"),
    ("SE-1003", "S01", "2026-11-16", 1.5, "sewing", "approved", "Took in the side seams"),
    ("SE-1005", "S02", "2026-11-16", 4.5, "sewing", "approved", "Sleeves"),
    ("SE-1003", "S03", "2026-11-17", 1, "sewing", "approved", "Re-stitched loose beading"),
    ("SE-1005", "S02", "2026-11-17", 3, "sewing", "held_back", "Redid a sleeve after a cutting mistake"),
    ("SE-1003", "S01", "2026-11-18", 1, "sewing", "waiting", "Hem"),
    ("SE-1004", "S03", "2026-11-18", 1, "sewing", "waiting", "Attached the comb"),
    ("SE-1005", "S02", "2026-11-18", 4, "sewing", "waiting", "Collar"),
]

PHOTOS = [
    # order, seamstress, date, file, caption, review
    ("SE-1001", "S01", "2026-10-06", "se-1001-bodice.jpg", "Bodice with boning channels", "approved"),
    ("SE-1001", "S01", "2026-10-13", "se-1001-first-fitting.jpg", "On the stand after the first fitting", "approved"),
    ("SE-1001", "S01", "2026-10-30", "se-1001-finished.jpg", "Finished gown", "approved"),
    ("SE-1002", "S02", "2026-11-03", "se-1002-before.jpg", "Old lining, before", "approved"),
    ("SE-1002", "S02", "2026-11-12", "se-1002-finished.jpg", "New lining and cuffs", "approved"),
    ("SE-1003", "S03", "2026-11-17", "se-1003-beading.jpg", "Beading repaired", "approved"),
    ("SE-1004", "S03", "2026-11-13", "se-1004-edge.jpg", "Rolled edge close up", "approved"),
    ("SE-1004", "S03", "2026-11-18", "se-1004-comb.jpg", "Comb attached", "waiting"),
    ("SE-1005", "S02", "2026-11-16", "se-1005-sleeves.jpg", "Sleeves set", "approved"),
    ("SE-1005", "S02", "2026-11-17", "se-1005-miscut.jpg", "The sleeve that was recut", "held_back"),
    ("SE-1005", "S02", "2026-11-18", "se-1005-collar.jpg", "Collar pinned", "waiting"),
]

INVOICES = [
    # id, order, status, final price ("" = not decided), sent date
    ("INV-0001", "SE-1001", "sent", 2400, "2026-11-02"),
    ("INV-0002", "SE-1002", "draft", "", ""),
]

SENT_TIMESHEETS = {("S01", "2026-10"), ("S03", "2026-10")}


def num(x):
    return int(x) if float(x) == int(x) else x


def write(name, header, rows):
    with open(HERE / name, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def main():
    invoice_for = {order: inv for inv, order, *_ in INVOICES}
    write("clients.csv", ["client_id", "name"], CLIENTS)
    write("seamstresses.csv", ["seamstress_id", "name", "time_zone", "active"], SEAMSTRESSES)
    write(
        "orders.csv",
        ["order_number", "client_id", "description", "hourly_rate_gbp", "quote_gbp", "status", "created_date"],
        [(o, c, d, RATE, q, s, created) for o, c, d, q, s, created in ORDERS],
    )
    write("order_assignments.csv", ["order_number", "seamstress_id"], ASSIGNMENTS)

    entries, hours_on_order, hours_in_month = [], defaultdict(float), defaultdict(float)
    for i, (order, who, date, hours, kind, review, note) in enumerate(ENTRIES, 1):
        month = date[:7]
        billable = order and review != "held_back"
        invoice = invoice_for.get(order, "") if billable and review == "approved" else ""
        sheet = f"TS-{who}-{month}"
        entries.append((f"T{i:03d}", order, who, date, num(hours), kind, review, invoice, sheet, note))
        if invoice:
            hours_on_order[order] += hours
        hours_in_month[(who, month)] += hours
    write(
        "time_entries.csv",
        ["entry_id", "order_number", "seamstress_id", "date_local", "hours", "kind", "review_status", "invoice_id", "timesheet_id", "note"],
        entries,
    )
    write(
        "photos.csv",
        ["photo_id", "order_number", "seamstress_id", "date_local", "file_name", "caption", "review_status"],
        [(f"P{i:03d}", *row) for i, row in enumerate(PHOTOS, 1)],
    )
    quote = {o: q for o, _, _, q, _, _ in ORDERS}
    write(
        "invoices.csv",
        ["invoice_id", "order_number", "status", "hours", "hourly_rate_gbp", "hourly_total_gbp", "quote_gbp", "final_price_gbp", "sent_date"],
        [
            (inv, o, status, num(hours_on_order[o]), RATE, num(hours_on_order[o] * RATE), quote[o], final, sent)
            for inv, o, status, final, sent in INVOICES
        ],
    )
    write(
        "timesheets.csv",
        ["timesheet_id", "seamstress_id", "month", "total_hours", "status"],
        [
            (f"TS-{who}-{month}", who, month, num(total), "sent" if (who, month) in SENT_TIMESHEETS else "open")
            for (who, month), total in sorted(hours_in_month.items(), key=lambda kv: (kv[0][1], kv[0][0]))
        ],
    )


if __name__ == "__main__":
    main()
