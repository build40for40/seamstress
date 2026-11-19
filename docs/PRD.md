# Seamless PRD

Day 14 of 40 for 40. Status: agreed by the team on build day, and the brief the build follows. How it gets built is in [PLAN.md](PLAN.md).

Anything marked **(assumed)** is a guess that the problem owner hasn't confirmed yet. What's still open is listed under [Open questions](#8-open-questions).

## 1. Problem

An atelier makes garments to order and does high-value alterations. Orders, seamstress hours and client billing are all tracked by hand. Time gets lost, hours go unbilled, and the monthly pay run is error-prone.

## 2. Goal and success measure

Every hour a seamstress works on a garment ends up in two places without anyone retyping it: on the client's invoice and on her monthly timesheet.

At 5pm this worked if, in the demo:

1. The CEO creates an order with its garments, a quote and a due date, and assigns each garment to one or more seamstresses.
2. A seamstress starts a timer on a garment from her phone, stops it, and sends a photo.
3. The CEO approves the hours and photo, and turns the order into an invoice whose hours match what was logged.
4. The CEO pulls the month's timesheets with the same hours on them.
5. The client follows the approved hours and photos on a link, gets emailed when it's ready, then gets an invoice that matches what they watched.

## 3. Personas

**CEO.** Runs the atelier, and is the only person who takes orders, decides who sews what, bills the clients and pays the seamstresses. She also checks every hour and photo before a client sees it. Today she is the system: everything goes through her notes and her memory. She wants to stop chasing hours and stop guessing at invoices. Works from a laptop **(assumed)**, though her app also works on a phone.

**Seamstress.** Works remotely, from her own home or studio, not in the atelier, and possibly in a different time zone from it. Paid by the hour. She knows each order by its order number and what the garment needs, not by the client's name. She has several client orders on the go at once, and they overlap: one garment might take three days, another might run for two months with gaps in between. She uses her phone, through a mobile web app that opens from a personal link, with nothing to install and no password. She uses it for two things: sending her time and sending photos. She wants logging time to take less effort than not logging it, and she wants her pay to be right. Because nobody can walk past her bench, what she sends is the only way the CEO and the client see the work.

**Client.** Has ordered a made-to-order garment or an alteration, often an expensive one, and has agreed a quote for it. Wants to be part of the journey: to watch the hours and the photos build up as the garment is made, once the CEO has checked them, so the final bill is no surprise. Never logs in to anything. Gets links and emails.

**Other ateliers.** Seamless is built so any atelier with the same shape (one CEO, remote hourly seamstresses, made-to-order clients) can sign up and run its own team. Nothing one atelier enters is visible to another.

## 4. User stories

Priorities are for today's build: **Must** is in the 5pm demo, **Should** is next if there's time, **Could** is later or a stretch goal.

### Seamstress

All of these happen in the workroom app, on her phone.

#### SEAM-1: See all my orders · Must

As a seamstress, I want to see every order I'm working on in one place, so that I can move between clients without losing track.

- Given several orders have garments assigned to me, when I open the app, then I see each order with its order number, due date, my garments on it, what needs doing and my hours so far.
- Given an order has garments assigned to someone else too, then I only see my own garments, with a quiet note such as "+1 other garment". I never see who else is on the order or their hours.
- Given any screen in my app, then it shows order and garment numbers and never the client's name or contact details.
- Given an order is marked express, then it's at the top and clearly marked. After that, orders are sorted by due date, then by the one I worked on most recently.
- Given an order is overdue, or due within 2 days with my garments not done, then it's flagged.
- Given I open one order, then I get the full brief and its photos, because I can't ask across the room.
- Given all my garments on an order are done, then it leaves my list, and its hours stay on my timesheet.

#### SEAM-6: Start and stop a timer · Must

As a seamstress, I want to tap start and stop on a garment, so that I don't have to work out the time myself, and the timer never gets in my way.

- Given a garment in my list, when I tap Start, then a timer starts straight away, with no form or confirmation.
- Given a timer is running, then every screen shows a small bar with the garment, the time so far and a Stop button, and I can still do everything else.
- Given I tap Stop, then the entry is saved at once as sewing, and a short message offers to change it to fitting or tidying, add a photo, or undo. Nothing blocks the screen.
- Given I start a second garment without stopping the first, then the first is stopped and saved at that moment.
- Given I close the app or lose signal, then the timer keeps going, because it lives on the server.
- Given I stop a timer within a minute of starting it, then nothing is saved, because it was probably a mis-tap.
- Given a timer has run for more than 8 hours or past midnight where I am, when I next open the app, then I'm asked when I really stopped, instead of the long time being saved.
- Given I want to log general time such as waiting, then I can start the timer on "General time", which has no order.

#### SEAM-2: Type in time instead · Must

As a seamstress, I want to type in hours I forgot to time, so that every hour still gets recorded.

- Given I'm on a garment, when I enter hours and save, then a time entry is saved against it with today's date and my name.
- Given I forgot to log yesterday, when I pick an earlier date, then the entry is saved on that date.
- Given I'm in a different time zone from the atelier, then "today" is today where I am.
- Given an entry is saved, then I see the garment, the hours and the date straight away so I can catch a mistake.
- Given I spent time tidying up or on a fitting, then I log it on that garment. It counts as paid work and is billed to that order.
- Given I spent time waiting, when I log it as general time with no order, then it goes on my timesheet as paid work and never on a client's invoice.

#### SEAM-3: Send a photo of the work · Must

As a seamstress, I want to take or upload a photo against a garment, so that the CEO and the client can see work they can't come and look at.

- Given I'm on a garment, when I take a photo with my phone's camera or pick one from my gallery, then it's saved against that garment with the date and an optional caption.
- Given I've just stopped a timer or saved time, then I'm offered the chance to add a photo to the same garment.
- Given my signal is poor, when the upload fails, then I'm told and can try again without retaking the photo.

#### SEAM-7: Move a garment along · Must

As a seamstress, I want to say where a garment is up to, so that the CEO knows without asking.

- Given a garment assigned to me, then I can move it through to do, in progress, fitting and done. Fitting can go back to in progress.
- Given I start a timer on a garment that's still to do, then it moves to in progress by itself.
- Given every garment on an order is done, then the CEO is told the order is ready to check.

#### SEAM-4: Fix a mistake · Should

As a seamstress, I want to correct an entry I got wrong, so that I'm not paid, or the client billed, for the wrong hours.

- Given I logged time, when I edit that entry, then the hours, date or kind change and I see the new value.
- Given the entry is already on a sent invoice or a sent timesheet, when I try to change it, then I'm told to ask the CEO and nothing changes.

#### SEAM-5: Check and send my timesheet · Should

As a seamstress, I want to see my hours for the month across all my orders and send them in, so that my pay is right and I'm not chased for it.

- Given I have entries this month, when I open my timesheet, then I get the monthly total, broken down by order and by day, with general time shown on its own line, and my estimated pay if the atelier shows it.
- Given an order runs across two months, then each month's timesheet shows only the hours worked in that month, in my own time zone.
- Given I'm happy with the month, when I send my timesheet, then the CEO is told and those entries are locked.
- Given I look at my timesheet, then I only ever see my own hours.

### CEO

All of these happen in the studio app.

#### CEO-0: Set up my atelier · Must

As the CEO, I want to sign up and set up my atelier, so that my team can start using it today.

- Given I sign in for the first time, then I'm asked for the atelier's name, the email clients' replies should go to, and the hourly rate.
- Given I've set up, then I can add a price list of known work (hem £25, replace zip £18) to fill in quotes quickly.
- Given settings, then I can choose whether clients are emailed automatically and whether seamstresses see their estimated pay. Both are on by default.

#### CEO-1: Create an order · Must

As the CEO, I want to create an order with its garments, so that everything is in the system from the moment it's taken in.

- Given I enter a client, a quote, a due date and one or more garments each with a description and optional photos, then an order is created and I see its details.
- Given an order is created, then it gets a unique order number such as SE-1001, and each garment a number such as SE-1001-A. Those numbers are what seamstresses see in place of the client's name.
- Given the work is on the price list, then I can tap an item to add its price to the quote, and still change the quote by hand.
- Given the client is in a hurry, then I can mark the order express, and it's flagged and sorted first everywhere.
- Given any order, then it's billed at the atelier's one hourly rate. A low, medium and high rate per order is a stretch goal (CEO-10).
- Given the client is new, then a client record is created with the order, with a name, phone, optional email and notes.
- Given I leave out the quote or the due date, then I'm asked for it.

#### CEO-2: Assign garments to seamstresses · Must

As the CEO, I want to assign each garment to one or more seamstresses, so that everyone knows whose work it is.

- Given an order exists, when I choose who a garment is for, then it appears in that seamstress's app with the order number, the full brief and photos, since she works remotely.
- Given a garment needs more than one seamstress, then I can assign several, and each one's hours are kept under her own name.
- Given two seamstresses are on one garment, then both can log time on it in the same week, or on the same day.
- Given an order has several garments, then each can go to a different seamstress.
- Given I take a seamstress off a garment, then it leaves her list, and the hours she already logged stay on the garment under her name.

#### CEO-3: See what's happening · Must

As the CEO, I want to see every order at a glance and look up any one, so that I can answer a client without chasing a seamstress I can't see.

- Given I open the studio, then I see every open order with its client, due date, express flag, garments and their stages, assignees, hours so far and running cost against the quote.
- Given an order is overdue, or due within 2 days and not done, then it's flagged.
- Given an order's running cost passes its quote, then it's flagged without me having to look.
- Given I open an order, then I see its garments, who has each, every time entry and photo, the emails sent, and the activity in date order.
- Given every garment on an order is done, then I can mark the order ready for collection, then collected. I can also cancel an order.

#### CEO-9: Check hours and photos before the client sees them · Must

As the CEO, I want to approve what a seamstress sends before it reaches the client, so that the client only ever sees work I'm happy to stand behind.

- Given a seamstress logs time or sends a photo, then it waits for me and the client can't see it yet. General time has nothing to approve.
- Given items are waiting, when I open my review list, then I see them grouped by order, newest first, and can approve or hold back each one, or approve everything on an order at once.
- Given I approve an item, then it appears on the client's link.
- Given I hold back an item, then the client never sees it, and the hours still count for the seamstress's pay.
- Given a held-back time entry, then I decide at invoice time whether it's billed.
- Given I log time or add a photo myself, then it's approved already.

#### CEO-4: Invoice a client · Must

As the CEO, I want to turn an order's logged hours into an invoice, so that no hour goes unbilled.

- Given an order has time entries, when I start its invoice, then I get a draft listing each garment, its approved hours, the hourly rate, the total at that rate and the quote beside it.
- Given entries are still waiting for review, then the draft says so and leaves them out until I approve them.
- Given held-back entries, then the draft lists them unticked, and I can tick any to bill it.
- Given a draft, then nothing reaches the client until I send it. Sending emails it to the client and shows it on their link.
- Given an invoice has been sent, then its time entries are locked and can't be billed twice.
- Given hours are logged after an invoice was sent, then they show up as unbilled on that order, and I can raise another invoice for them.
- Given an invoice, then it's a printable page with its number, the atelier, the client, the lines and the total, and I can mark it paid when the money arrives.

#### CEO-5: Decide the final price against the quote · Must

As the CEO, I want to see the hours total next to the quote and choose the final price, so that I can honour the quote, round it or charge the real hours.

- Given a draft invoice, then I'm shown the quote, the total at the hourly rate and the difference between them.
- Given a draft invoice, when I set the final price, then the invoice uses it, and the hours total and the difference are kept on record.
- Given I set no final price, then the invoice uses the total at the hourly rate.
- Given any final price, then the seamstress's timesheet still shows the hours she really worked.

#### CEO-6: Run monthly timesheets · Must

As the CEO, I want a timesheet per seamstress for the month, so that hourly pay is right first time.

- Given a month, when I open timesheets, then I see a row per seamstress with billable hours, general hours, total hours, her pay rate, pay and whether she has sent it, and each row opens to her hours by day and by order.
- Given a seamstress in another time zone, then her month is counted in her own local dates, and the timesheet says which time zone that is.
- Given I download the month, then I get two CSV files: a summary with one row per seamstress, and a detail with one row per entry.
- Given a seamstress has corrected an entry, then the timesheet shows the corrected value.
- Given the same month is run twice with no changes in between, then the totals are identical.
- Given a seamstress has sent her timesheet and needs to fix something, then I can reopen it.
- Given a seamstress's pay rate changes, then the change applies from a date I choose, and earlier months keep the old rate.

#### CEO-7: Catch unbilled hours · Must

As the CEO, I want to see the three numbers that matter most, so that I can find the money that's being missed.

- Given there are billable time entries on no sent invoice, then the dashboard shows their value at the hourly rate as "unbilled work", and opening it lists them by client and order.
- Given general time such as waiting, then it's never counted as missed money.
- Given invoices sent this month, then the dashboard shows what the final prices earned per hour worked, against the hourly rate, and how many open orders are over their quote.
- Given this month's hours, then the dashboard shows what share of the hours paid to seamstresses were billed to clients.

#### CEO-8: Add and remove seamstresses · Must

As the CEO, I want to control who counts as a seamstress, so that only my team can log time.

- Given I add a seamstress with her name, time zone and pay rate, then I get a personal link to send her, and that link opens her app with no password.
- Given her link fell into the wrong hands, then it would show order numbers and briefs but no client names or contact details.
- Given someone without a valid link, then they can't log time or see any order.
- Given I make a new link for her, then the old one stops working.
- Given I remove a seamstress, then her link stops working, and her past hours stay on the garments and timesheets.
- Given I sew too, then I can get a personal link for myself and log time like anyone else.

#### CEO-11: Tell the client · Should

As the CEO, I want to send a client an update in one tap, so that they hear from me without me writing it from scratch.

- Given an order is created, ready for collection or invoiced, then the studio offers "Tell the client", which opens WhatsApp or email on my own phone or laptop with a message and the client's link already written.
- Given I use it, then it's noted on the order's activity.

#### CEO-10: Choose a rate for an order · Could, stretch goal

As the CEO, I want to pick a low, medium or high hourly rate for each order, so that harder work is billed at more than simple work.

- Given the atelier has low, medium and high rates set, when I create an order, then I pick one, and medium is used if I don't.
- Given an order's rate, then its running cost and its invoice use that rate.
- Given any client rate, then what a seamstress is paid per hour doesn't change.

### Client

#### CLI-2: Follow my order as it's made · Must · Link

As a client, I want to watch the hours and photos build up on my order, so that I'm part of the journey and the bill is no surprise.

- Given an order is mine, when I open its link, then I see the atelier's name, the order number, the due date, each garment with its stage, the quote, the approved hours so far and the approved photos in date order.
- Given a seamstress logs time or adds a photo, then I see it once the CEO has approved it, and not before.
- Given the approved hours take the running cost past my quote, then my link shows that plainly, with the quote and the running cost side by side, so I don't first learn it from the invoice.
- Given the link, then I see only my own order, with no login, and nothing about seamstresses, their pay or other clients.
- Given times and dates on my link, then they're in UK time with my own local time beside them.

#### CLI-1: Get my invoice · Must · Email and link

As a client, I want to receive my invoice with the work spelled out, so that I understand what I'm paying for.

- Given the CEO sends an invoice, then I'm emailed it with each garment, a description of the work, the hours, the quote I agreed and the final total, and it's on my link.
- Given the final total differs from the hours at the hourly rate, then I still see the hours, so the invoice matches what I watched build up.

#### CLI-3: Know what's happening · Should · Email

As a client, I want to be told when my order is taken in and when it's ready, so that I don't have to chase.

- Given an order is created and I have an email address, then I'm emailed my link.
- Given the CEO marks my order ready for collection, then I'm emailed, and my link shows it as ready.
- Given any of these emails, then it comes from the atelier's name and my reply goes to the atelier.

#### CLI-4: Ask about my bill · Could · Link

As a client, I want to ask a question about my invoice, so that I get an answer without a phone call.

- Given I tap "Ask about this" on my link, then my email app opens addressed to the atelier with the order number filled in. Nothing answers on her behalf.

#### CLI-5: See my dress and its journey · Could, stretch goal · Client web app

As a client, I want a web app that shows my dress and how it came together, so that the making of it is part of what I've bought.

- Given my order has photos and hours, when I open the app, then I see its journey as a visual timeline, from first photo to latest, with the hours alongside.
- Given my order is finished, then I see the final dress as a gallery of the finished photos and a before and after.
- Given the gallery and the before and after exist, then a generated visualisation of the dress is added on top. Photos come first and the generated version last.
- Given the app, then it shows the same order, hours and photos as my link in CLI-2, never different numbers.

## 5. Core objects

The stories above all use these words to mean the same thing.

| Object | What it is | Key fields |
| --- | --- | --- |
| Atelier | One business using Seamless. Everything else belongs to exactly one | Name, reply-to email, hourly rate, price list, auto-email on or off, show pay on or off |
| Member | A person in an atelier: the CEO (owner) or a seamstress | Name, role, time zone, pay rates with the date each applies from, personal link, active or removed. The CEO also signs in with her email |
| Client | Who the order is for | Name, phone, email (optional), notes |
| Order | What a client asked for, taken in at once. Can run for days or months, alongside other orders | Order number (unique in the atelier, shown in place of the client's name), client, description, quote, due date, express, status (open, ready, collected, cancelled), client link |
| Garment | One piece of work on an order | Garment number (order number plus a letter), description, photos, assigned seamstresses, stage (to do, in progress, fitting, done) |
| Time entry | Time one seamstress spent on one day. Either on a garment (sewing, tidying up, fittings), which is billable, or general (waiting), which is paid but never billed | Garment or general, seamstress, kind, date in her time zone, minutes, timer start and stop (if timed), review status (waiting, approved, held back), invoice it's on (if any) |
| Photo | A picture of a garment | Garment, who sent it, date, caption, label (before, progress, after, optional), review status |
| Invoice | What a client is asked to pay for an order. Usually one per order, and another can follow for hours logged after it | Number, order, the time entries on it, hourly total, quote, final price, status (draft, sent, paid) |
| Timesheet | One seamstress's hours for one month in her time zone, across all her orders plus general time | Seamstress, month, entries, total, pay, open or sent. Worked out from time entries, never typed in |

## 6. Scope

**Today (Must):** SEAM-1, SEAM-2, SEAM-3, SEAM-6, SEAM-7, CEO-0, CEO-1, CEO-2, CEO-3, CEO-4, CEO-5, CEO-6, CEO-7, CEO-8, CEO-9, CLI-1, CLI-2.

**Next (Should):** SEAM-4, SEAM-5, CEO-11, CLI-3.

**Later (Could):** CLI-4.

**Stretch goals:** CEO-10, low, medium and high rates. CLI-5, the client web app with the dress and its journey. A "say it or type it" box for seamstresses, tested against `fixtures/seamstress_scripts.csv`.

**Out:** WhatsApp or any chat integration (the "Tell the client" button only opens the CEO's own WhatsApp), native phone apps, taking payment, payroll or accounting software integrations (the CSV is the hand-off), tax and VAT, client logins, a team switcher for people in more than one atelier, stock and fabric tracking, client measurements, getting garments to and from remote seamstresses.

## 7. Decisions

- **Orders and garments:** an order holds one or more garments. Each garment has one or more seamstresses.
- **Quote:** every order has one, agreed up front. The CEO decides the final price at invoice time, with the hours total beside it. That is the "fixed-price rounding".
- **Hourly rate:** one per atelier, no rounding of hours. Low, medium and high rates are a stretch goal.
- **Timer first:** the timer is the main way to log time and typed hours are the fallback. The timer never asks anything when it starts or stops.
- **Stages:** garments go to do, in progress, fitting, done. Orders go open, ready, collected, or cancelled. Invoices go draft, sent, paid.
- **Due dates and express:** every order has a due date, and can be marked express.
- **Checking before clients see:** the CEO approves hours and photos first.
- **Time zones:** seamstresses can be in different ones. Their dates and months are their own; the CEO's app shows UK time.
- **Seamstress links:** a personal link with no password, as long as she sees order numbers and never the client's details. The CEO signs in properly.
- **Timesheet:** the seamstress sends it, which locks it. The CEO downloads it as CSV.
- **Pay:** each seamstress has an hourly pay rate, and sees her estimated pay unless the atelier turns that off.
- **Emails:** clients are emailed when an order is taken in, when it's ready and when it's invoiced. The CEO is emailed when an order's garments are all done and when a timesheet is sent.
- **Fittings and tidying up:** paid, and billed to that client's order.
- **Waiting:** paid as general time, never billed.
- **Going over the quote:** the CEO sees it first, because she approves every entry. The client then sees it on their link, not only on the invoice.
- **Final dress visualisation:** a gallery, a before and after, then a generated version, in that order.

## 8. Open questions

For the problem owner:

1. Does the CEO work from a laptop, a phone or both? The studio is built for a laptop and works on a phone.
2. Is 8 hours the right point to ask a seamstress whether a timer was forgotten?
