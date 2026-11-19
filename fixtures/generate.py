"""Writes the fake fixture CSVs next to this file. Run: python3 fixtures/generate.py

Everything here is made up. No real client, seamstress or order appears in it.
Edit the lists below and run it again: the invoices and timesheets are worked out
from the time entries, so they can't drift apart.
"""

import csv
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
ATELIER = ("Example Atelier (fake)", "atelier@example.com", 60)  # name, reply-to email, hourly rate in pounds

PRICE_LIST = [
    # name, price in pounds
    ("Hem", 25),
    ("Replace zip", 18),
    ("Take in waist", 40),
    ("Reline coat", 300),
]
RATE = ATELIER[2]

CLIENTS = [
    ("C001", "Client One (fake)"),
    ("C002", "Client Two (fake)"),
    ("C003", "Client Three (fake)"),
    ("C004", "Client Four (fake)"),
    ("C005", "Client Five (fake)"),
]

SEAMSTRESSES = [
    # id, name, time zone, pay rate in pounds an hour, active
    ("S01", "Ada Example", "Europe/London", 18, "yes"),
    ("S02", "Bea Example", "Europe/Lisbon", 17, "yes"),
    ("S03", "Cleo Example", "Asia/Kolkata", 16, "yes"),
    ("S04", "Dot Example", "Europe/London", 15, "no"),
]

ORDERS = [
    # order number, client, description, quote, status, created, due, express
    ("SE-1001", "C001", "Ivory silk wedding gown, made to order", 2400, "collected", "2026-10-02", "2026-11-01", "no"),
    ("SE-1002", "C002", "Velvet evening coat, reline and new cuffs", 480, "ready", "2026-11-02", "2026-11-20", "no"),
    ("SE-1003", "C003", "Two bridesmaid dresses for a wedding on Saturday", 300, "open", "2026-11-13", "2026-11-20", "yes"),
    ("SE-1004", "C001", "Wedding veil, hand-rolled edge", 600, "open", "2026-10-23", "2026-12-12", "no"),
    ("SE-1005", "C004", "Tweed jacket, made to measure", 1500, "open", "2026-11-06", "2026-11-18", "no"),
    ("SE-1006", "C005", "Linen suit trousers, taper and hem", 120, "open", "2026-11-18", "2026-11-27", "no"),
]

GARMENTS = [
    # garment ref, order, description, status
    ("SE-1001-A", "SE-1001", "Ivory silk wedding gown", "done"),
    ("SE-1002-A", "SE-1002", "Velvet evening coat: reline and new cuffs", "done"),
    ("SE-1003-A", "SE-1003", "Beaded bridesmaid dress: take in and repair beading", "in_progress"),
    ("SE-1003-B", "SE-1003", "Plain bridesmaid dress: hem", "in_progress"),
    ("SE-1004-A", "SE-1004", "Wedding veil: hand-rolled edge and comb", "in_progress"),
    ("SE-1005-A", "SE-1005", "Tweed jacket, made to measure", "fitting"),
    ("SE-1006-A", "SE-1006", "Linen suit trousers: taper and hem", "todo"),
]

ASSIGNMENTS = [
    # garment ref, seamstress
    ("SE-1001-A", "S01"),
    ("SE-1002-A", "S02"),
    ("SE-1003-A", "S01"),
    ("SE-1003-A", "S03"),
    ("SE-1003-B", "S01"),
    ("SE-1004-A", "S03"),
    ("SE-1005-A", "S02"),
    # SE-1006-A has nobody yet, for the empty state
]

# Entries and photos land on their order's first garment unless listed here (entry or photo number: garment ref)
ENTRY_GARMENT = {29: "SE-1003-B"}
PHOTO_GARMENT = {}

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

# What the seamstress says or types to produce each row of ENTRIES, in the same order.
# She names an order by its number or by the garment, never by the client.
ENTRY_SAID = [
    "Four hours on SE-1001 today, cut and tacked the bodice.",
    "Five hours on the wedding gown, bodice seams and boning channels.",
    "4.5 hours on SE-1001, skirt panels.",
    "Five hours on the gown, joined the skirt to the bodice.",
    "Three hours for the first fitting on SE-1001.",
    "And half an hour waiting for the fitting to start. That's not on an order.",
    "Five hours on SE-1001, alterations from the fitting.",
    "Four hours on the gown, lining.",
    "Four hours on SE-1001, buttons and loops.",
    "Two hours on the gown, hem.",
    "One hour tidying up on SE-1001, pressed and packed. It's finished.",
    "Two hours on the veil, cut the tulle.",
    "An hour and a half on SE-1004, started the rolled edge.",
    "Three hours on the velvet coat, took out the old lining.",
    "2.5 hours on SE-1002, cut and set the new lining.",
    "Two hours on the veil, first half of the rolled edge.",
    "One hour waiting for the thread delivery, no order.",
    "Four hours on the tweed jacket, cut the tweed.",
    "Two hours on a fitting.",
    "Half an hour waiting for that fitting to start.",
    "An hour and a half on the coat, new cuffs.",
    "Half an hour tidying up on SE-1002, pressed and packed. It's finished.",
    "1.5 hours on SE-1004, second half of the rolled edge.",
    "Five hours on SE-1005, canvas and front panels.",
    "An hour and a half on the bridesmaid dress, took in the side seams.",
    "4.5 hours on the jacket, sleeves.",
    "One hour on SE-1003, re-stitched the loose beading.",
    "Three hours on SE-1005. I had to redo a sleeve after a cutting mistake.",
    "One hour on SE-1003, hem.",
    "One hour on the veil, attached the comb.",
    "Four hours on the jacket, collar.",
]

# What she says with each photo in PHOTOS, in the same order.
PHOTO_SAID = [
    "Photo of the bodice with the boning channels.",
    "Here it is on the stand after the first fitting.",
    "Photo of the finished gown.",
    "Photo of the old lining before I start.",
    "Photo of the new lining and cuffs.",
    "Photo of the beading, repaired.",
    "Close up of the rolled edge.",
    "Photo with the comb attached.",
    "Photo of the sleeves, set.",
    "Photo of the sleeve I had to recut.",
    "Photo of the collar, pinned.",
]

CORRECTED = {10: (2, "Sorry, make that two and a half.")}  # entry number: (hours first said, the correction)
UNCLEAR = {19: "The coat."}  # entry number: her answer when the app asks which order
FINISHED = {11, 22}  # entries where she also says the garment is done
ORDER_DONE = {"SE-1001": "2026-10-30", "SE-1002": "2026-11-12"}


def num(x):
    return int(x) if float(x) == int(x) else x


def write(name, header, rows):
    with open(HERE / name, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def clock(minutes):
    return f"{int(minutes // 60):02d}:{int(minutes % 60):02d}"


def hours_text(h):
    return f"{num(h)} hour" + ("" if h == 1 else "s")


def garment_order(ref):
    return next(o for g, o, _, _ in GARMENTS if g == ref)


def first_garment(order):
    return next(g for g, o, _, _ in GARMENTS if o == order)


def entry_garment(i, order):
    return ENTRY_GARMENT.get(i, first_garment(order)) if order else ""


def photo_garment(i, order):
    return PHOTO_GARMENT.get(i, first_garment(order))


def open_orders(who, date):
    """Orders this seamstress has on the go on a given day, as (number, description)."""
    mine = {garment_order(g) for g, s in ASSIGNMENTS if s == who}
    return [
        (o, d)
        for o, _, d, _, _, created, _, _ in ORDERS
        if o in mine and created <= date and date <= ORDER_DONE.get(o, "9999")
    ]


def scripts():
    """The conversation, line by line, that would produce time_entries.csv and photos.csv."""
    names = {s: n.split()[0] for s, n, _, _, _ in SEAMSTRESSES}
    desc = {g: d for g, _, d, _ in GARMENTS}
    rows, days = [], defaultdict(list)
    for i, e in enumerate(ENTRIES, 1):
        days[(e[1], e[2])].append((i, e))

    def say(who, date, t, speaker, text, order="", creates=""):
        rows.append([f"L{len(rows) + 1:03d}", who, date, clock(t), speaker, text, order, creates])

    for (who, date), items in sorted(days.items()):
        t = 9 * 60
        mine = open_orders(who, date)
        say(who, date, t, "seamstress", "Morning. What's on my list today?")
        say(who, date, t, "app", f"Morning {names[who]}. You have {len(mine)} open: " + "; ".join(f"{o}, {d}" for o, d in mine) + ".")
        for i, (order, _, _, hours, kind, review, note) in items:
            t += hours * 60
            entry = f"T{i:03d}"
            where = order or "general time"
            said_hours = CORRECTED[i][0] if i in CORRECTED else hours
            say(who, date, t, "seamstress", ENTRY_SAID[i - 1], "" if i in UNCLEAR else order)
            if i in UNCLEAR:
                say(who, date, t, "app", "Which order is that for? " + " or ".join(f"{o}, {d}" for o, d in mine) + ".")
                say(who, date, t, "seamstress", UNCLEAR[i], order)
            tail = " Paid, and not billed to any client." if not order else " Want to add a photo?"
            say(who, date, t, "app", f"Saved: {hours_text(said_hours)} of {kind} on {where}, {date}.{tail}", order, "" if i in CORRECTED else entry)
            if i in CORRECTED:
                say(who, date, t + 1, "seamstress", CORRECTED[i][1], order)
                say(who, date, t + 1, "app", f"Changed to {hours_text(hours)} of {kind} on {order}, {date}.", order, entry)
            for p, (p_order, p_who, p_date, file, _, _) in enumerate(PHOTOS, 1):
                if (p_order, p_who, p_date) == (order, who, date):
                    say(who, date, t + 2, "seamstress", f"[sends {file}] {PHOTO_SAID[p - 1]}", order)
                    say(who, date, t + 2, "app", f"Photo saved on {order}. The atelier checks it before the client sees it.", order, f"P{p:03d}")
            if i in FINISHED:
                garment = entry_garment(i, order)
                say(who, date, t + 3, "app", f"Marked {garment}, {desc[garment]}, as done. The atelier has been told.", order)
    write(
        "seamstress_scripts.csv",
        ["line_id", "seamstress_id", "date_local", "time_local", "speaker", "text", "order_number", "creates"],
        rows,
    )
    made = {r[7] for r in rows if r[7]}
    expected = {f"T{i:03d}" for i in range(1, len(ENTRIES) + 1)} | {f"P{i:03d}" for i in range(1, len(PHOTOS) + 1)}
    assert made == expected, f"scripts and data disagree: {sorted(made ^ expected)}"


def main():
    scripts()
    invoice_for = {order: inv for inv, order, *_ in INVOICES}
    pay = {s: rate for s, _, _, rate, _ in SEAMSTRESSES}
    write("atelier.csv", ["name", "reply_to_email", "hourly_rate_gbp"], [ATELIER])
    write("price_list.csv", ["name", "price_gbp"], PRICE_LIST)
    write("clients.csv", ["client_id", "name"], CLIENTS)
    write("seamstresses.csv", ["seamstress_id", "name", "time_zone", "pay_rate_gbp", "active"], SEAMSTRESSES)
    write(
        "orders.csv",
        ["order_number", "client_id", "description", "quote_gbp", "status", "created_date", "due_date", "express"],
        ORDERS,
    )
    write("garments.csv", ["garment_ref", "order_number", "description", "status"], GARMENTS)
    write("garment_assignments.csv", ["garment_ref", "seamstress_id"], ASSIGNMENTS)

    entries, hours_on_order, hours_in_month = [], defaultdict(float), defaultdict(float)
    for i, (order, who, date, hours, kind, review, note) in enumerate(ENTRIES, 1):
        month = date[:7]
        billable = order and review != "held_back"
        invoice = invoice_for.get(order, "") if billable and review == "approved" else ""
        sheet = f"TS-{who}-{month}"
        entries.append((f"T{i:03d}", order, entry_garment(i, order), who, date, num(hours), kind, review, invoice, sheet, note))
        if invoice:
            hours_on_order[order] += hours
        hours_in_month[(who, month)] += hours
    write(
        "time_entries.csv",
        ["entry_id", "order_number", "garment_ref", "seamstress_id", "date_local", "hours", "kind", "review_status", "invoice_id", "timesheet_id", "note"],
        entries,
    )
    write(
        "photos.csv",
        ["photo_id", "order_number", "garment_ref", "seamstress_id", "date_local", "file_name", "caption", "review_status"],
        [(f"P{i:03d}", order, photo_garment(i, order), *rest) for i, (order, *rest) in enumerate(PHOTOS, 1)],
    )
    quote = {o: q for o, _, _, q, *_ in ORDERS}
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
        ["timesheet_id", "seamstress_id", "month", "total_hours", "pay_gbp", "status"],
        [
            (f"TS-{who}-{month}", who, month, num(total), num(total * pay[who]), "sent" if (who, month) in SENT_TIMESHEETS else "open")
            for (who, month), total in sorted(hours_in_month.items(), key=lambda kv: (kv[0][1], kv[0][0]))
        ],
    )


if __name__ == "__main__":
    main()
