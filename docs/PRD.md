# Seamstress PRD

Day 14 of 40 for 40. Status: draft, for the team to argue with.

Anything marked **(assumed)** is a guess that the problem owner hasn't confirmed yet. What's still open is listed under [Open questions](#7-open-questions).

## 1. Problem

An atelier makes garments to order and does high-value alterations. Orders, seamstress hours and client billing are all tracked by hand. Time gets lost, hours go unbilled, and the monthly pay run is error-prone.

## 2. Goal and success measure

Every hour a seamstress works on a garment ends up in two places without anyone retyping it: on the client's invoice and on her monthly timesheet.

At 5pm this worked if, in the demo:

1. The CEO creates a garment order and assigns it to a seamstress.
2. The seamstress logs time and a photo against it from her phone.
3. The CEO turns that order into an invoice whose hours match what was logged.
4. The CEO pulls a monthly timesheet for that seamstress with the same hours on it.
5. The client follows the hours and photos as they come in, then gets an invoice that matches what they watched.

## 3. Personas

**CEO.** Runs the atelier, and is the only person who takes orders, decides who sews what, bills the clients and pays the seamstresses. She also checks every hour and photo before a client sees it. Today she is the system: everything goes through her notes and her memory. She wants to stop chasing hours and stop guessing at invoices. Works from a laptop **(assumed, to be reviewed with the CEO stories)**.

**Seamstress.** Works remotely, from her own home or studio, not in the atelier, and possibly in a different time zone from it. Paid by the hour. She knows each order by its order number and what the garment needs, not by the client's name. She has several client orders on the go at once, and they overlap: one garment might take three days, another might run for two months with gaps in between, so in any week she is moving between orders that started and will finish at different times. She uses her phone, through a mobile web app that opens from a link, with nothing to install. She uses it for two things: sending photos and sending her time. She wants logging time to take less effort than not logging it, and she wants her pay to be right. Because nobody can walk past her bench, what she sends is the only way the CEO and the client see the work.

**Client.** Has ordered a made-to-order garment or an alteration, often an expensive one, and has agreed a quote for it. Wants to be part of the journey: to watch the hours and the photos build up as the garment is made, once the CEO has checked them, so the final bill is no surprise. Never logs in to anything. Gets links. The stretch goal is a client web app that shows the journey visually and a visualisation of the finished dress.

## 4. User stories

Priorities are for today's build: **Must** is in the 5pm demo, **Should** is next if there's time, **Could** is later or a stretch goal.

### Seamstress

All of these happen in the mobile web app, on her phone.

#### SEAM-1: See all my orders · Must · Mobile web

As a seamstress, I want to see every order I'm working on in one place, so that I can move between clients without losing track.

- Given several orders are assigned to me, when I open the app, then I see all of them, each with its order number, garment, what needs doing and my hours on it so far.
- Given any screen in my app, then it shows the order number and never the client's name or contact details.
- Given another seamstress is also on one of my orders, then I see my own hours on it, not hers.
- Given my orders started at different times, then the ones I worked on most recently are at the top, and an order I haven't touched for weeks is still there until it's finished.
- Given I open one order, then I get the full brief and its photos, because I can't ask across the room.
- Given an order is assigned to someone else, then I don't see it.

#### SEAM-2: Log time on an order · Must · Mobile web

As a seamstress, I want to log my time against an order in a couple of taps, so that my hours are recorded while I'm still at the bench.

- Given I'm on an order, when I enter hours and save, then a time entry is saved against that order with today's date and my name.
- Given I worked on three different orders today, then I can log time on each one, and each entry sits on its own order.
- Given I forgot to log yesterday, when I pick an earlier date, then the entry is saved on that date.
- Given I'm in a different time zone from the atelier, then "today" is today where I am.
- Given an entry is saved, then I see the order, the hours and the date straight away so I can catch a mistake.
- Given I spent time tidying up, then I log it on the order it was for. It counts as paid work and is billed to that order.
- Given I spent time on a fitting, then I log it on that client's order. It counts as paid work and is billed to that order.
- Given I spent time waiting, when I log it as general time with no order, then it goes on my timesheet as paid work and never on a client's invoice.

#### SEAM-3: Send a photo of the work · Must · Mobile web

As a seamstress, I want to take or upload a photo against an order, so that the CEO and the client can see work they can't come and look at.

- Given I'm on an order, when I take a photo with my phone's camera or pick one from my gallery, then it's saved against that order with the date.
- Given I've just logged time, then I'm offered the chance to add a photo to the same order.
- Given my signal is poor, when the upload fails, then I'm told and can try again without retaking the photo.

#### SEAM-4: Fix a mistake · Should · Mobile web

As a seamstress, I want to correct an entry I got wrong, so that I'm not paid, or the client billed, for the wrong hours.

- Given I logged time, when I edit that entry, then the hours or the date change and I see the new value.
- Given the entry is already on a sent invoice or a sent timesheet, when I try to change it, then I'm told to ask the CEO and nothing changes.

#### SEAM-5: Check and send my timesheet · Should · Mobile web

As a seamstress, I want to see my hours for the month across all my orders and send them in, so that my pay is right and I'm not chased for it.

- Given I have entries this month, when I open my timesheet, then I get the monthly total, broken down by order and by day, with general time shown on its own line.
- Given an order runs across two months, then each month's timesheet shows only the hours worked in that month.
- Given I'm happy with the month, when I send my timesheet, then the CEO is told and those entries are locked.
- Given I look at my timesheet, then I only ever see my own hours.

#### SEAM-6: Start and stop a timer · Could · Mobile web

As a seamstress, I want to tap start and stop on an order, so that I don't have to work out the time myself.

- Given I've started an order, when I tap stop, then an entry is saved for the time between the two taps.
- Given I start a second order without stopping the first, then the first is stopped at that moment.
- Given a timer has run past the end of the working day, then I'm asked what the real finish time was instead of it being saved.

#### SEAM-7: Say an order is finished · Should · Mobile web

As a seamstress, I want to mark an order as done, so that the CEO knows it's ready to bill and hand over.

- Given an order is assigned to me, when I mark it finished, then its status changes to ready and the CEO is told.
- Given an order is finished, then it leaves my list of open orders, and its hours stay on my timesheet.

### CEO

Not yet reviewed. The WhatsApp channel has been removed here too, but nothing else has changed.

#### CEO-1: Create a garment order · Must · Web or CLI

As the CEO, I want to create an order with its details, so that every garment is in the system from the moment it's taken in.

- Given I enter a client name, a description, the quote agreed with the client and optionally a photo, then a garment order is created and I see its details.
- Given an order is created, then it gets a unique order number, and that number is what seamstresses see in place of the client's name.
- Given any order, then it's billed at the atelier's one hourly rate. Choosing between a low, medium and high rate per order is a stretch goal (CEO-10).
- Given the client is new, then a client record is created with the order.
- Given I leave out something needed to bill it, such as the quote, then I'm asked for it.

#### CEO-2: Assign a garment to seamstresses · Must · Web or CLI

As the CEO, I want to assign each garment to one or more seamstresses, so that everyone knows whose work it is.

- Given an order exists, when I choose who it's for, then it appears in that seamstress's app with the order number, the full brief and photos, since she works remotely.
- Given a garment needs more than one seamstress, then I can assign several, and each one's hours are kept under her own name.
- Given two seamstresses are on one garment, then both can log time on it in the same week, or on the same day.
- Given I take a seamstress off an order, then it leaves her list, and the hours she already logged stay on the garment under her name.

#### CEO-3: See what's happening on an order · Must · Web or CLI

As the CEO, I want to look up any garment, so that I can answer a client without chasing a seamstress I can't see.

- Given a garment has time and photos, when I open it, then I see its status, who has it, total hours so far, the running cost at the hourly rate next to the quote, and the latest photo.
- Given a garment's running cost passes its quote, then I'm told without having to look.
- Given I ask for what's open, then I get every unfinished garment with hours so far, oldest first.

#### CEO-4: Invoice a client · Must · Web or CLI

As the CEO, I want to turn a garment's logged hours into an invoice, so that no hour goes unbilled.

- Given a garment has time entries, when I ask for its invoice, then I get a draft listing the garment, the hours, the hourly rate, the total at that rate and the quote beside it.
- Given a draft, then nothing reaches the client until I approve it.
- Given an invoice has been sent, then its time entries are locked and can't be billed twice.
- Given hours are logged after an invoice was sent, then they show up as unbilled on that garment.

#### CEO-5: Decide the final price against the quote · Must · Web or CLI

As the CEO, I want to see the hours total next to the quote and choose the final price, so that I can honour the quote, round it or charge the real hours.

- Given a draft invoice, then I'm shown the quote, the total at the hourly rate and the difference between them.
- Given a draft invoice, when I set the final price, then the invoice uses it, and the hours total and the difference are kept on record.
- Given I set no final price, then the invoice uses the total at the hourly rate.
- Given any final price, then the seamstress's timesheet still shows the hours she really worked.

#### CEO-6: Run monthly timesheets · Must · Web or CLI

As the CEO, I want a timesheet per seamstress for the month, so that hourly pay is right first time.

- Given a month, when I run timesheets, then I get a spreadsheet with one sheet per seamstress: her hours by day and by order, her general time on its own line, and a monthly total.
- Given a seamstress in another time zone, then her month is counted in her own local dates, and the spreadsheet says which time zone that is.
- Given a seamstress has corrected an entry, then the timesheet shows the corrected value.
- Given the same month is run twice with no changes in between, then the totals are identical.

#### CEO-7: Catch unbilled hours · Should · Web or CLI

As the CEO, I want to see hours that aren't on any invoice, so that I can find the money that's being missed.

- Given there are time entries on orders with no invoice, when I ask for what's unbilled, then I get them grouped by client and garment with their value at the hourly rate.
- Given general time such as waiting, then it's shown separately as paid but not billable, and never counted as missed money.

#### CEO-8: Add and remove seamstresses · Should · Web or CLI

As the CEO, I want to control who counts as a seamstress, so that only my team can log time.

- Given I add a seamstress, then I get a personal link to send her, and that link opens her app with no password.
- Given her link fell into the wrong hands, then it would show order numbers and briefs but no client names or contact details.
- Given someone without a valid link, then they can't log time or see any order.
- Given I remove a seamstress, then her link stops working, and her past hours stay on the garments and timesheets.

#### CEO-9: Check hours and photos before the client sees them · Must · Web or CLI

As the CEO, I want to approve what a seamstress sends before it reaches the client, so that the client only ever sees work I'm happy to stand behind.

- Given a seamstress logs time or sends a photo, then it waits for me and the client can't see it yet.
- Given items are waiting, when I open my review list, then I see them grouped by order, newest first, and can approve or hold back each one.
- Given I approve an item, then it appears on the client's link.
- Given I hold back an item, then the client never sees it, and the hours still count for the seamstress's pay.
- Given a held-back time entry, then I decide at invoice time whether it's billed.

#### CEO-10: Choose a rate for an order · Could, stretch goal · Web or CLI

As the CEO, I want to pick a low, medium or high hourly rate for each order, so that harder work is billed at more than simple work.

- Given the atelier has low, medium and high rates set, when I create an order, then I pick one, and medium is used if I don't.
- Given an order's rate, then its running cost and its invoice use that rate.
- Given any client rate, then what a seamstress is paid per hour doesn't change.

### Client

#### CLI-1: Get my invoice · Must · Link

As a client, I want to receive my invoice with the work spelled out, so that I understand what I'm paying for.

- Given the CEO has approved an invoice, then I receive it with the garment, a description of the work, the hours, the quote I agreed and the final total.
- Given the final total differs from the hours at the hourly rate, then I still see the hours, so the invoice matches what I watched build up.

#### CLI-2: Follow my garment as it's made · Must · Link

As a client, I want to watch the hours and photos build up on my garment, so that I'm part of the journey and the bill is no surprise.

- Given an order is mine, when I open its link, then I see the order number, the description, the status, the quote, the hours so far and the photos in date order.
- Given a seamstress logs time or adds a photo, then I see it once the CEO has approved it, and not before.
- Given the approved hours take the running cost past my quote, then my link shows that plainly, with the quote and the running cost side by side, so I don't first learn it from the invoice.
- Given the link, then I see only my own order, with no login, and nothing about seamstress pay or other clients.
- Given times and dates on my link, then they're in UK time with my own local time beside them.

#### CLI-3: Know when it's ready · Could · Link

As a client, I want to be told when my garment is ready, so that I don't have to chase.

- Given a garment is marked ready and the CEO confirms, then I'm told, and my link shows it as ready.

#### CLI-4: Ask about my bill · Could · Link

As a client, I want to ask a question about my invoice, so that I get an answer without a phone call.

- Given I send a question from my invoice, then it goes to the CEO with the order attached. Nothing answers on her behalf.

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
| Client | Who the garment is for | Name, how to reach them |
| Garment order | One garment, made or altered. Can run for days or months, alongside other orders | Order number (unique, shown in place of the client's name), client, description, photos, hourly rate, quote, assigned seamstresses, status (open, ready, invoiced) |
| Seamstress | Someone who logs time | Name, personal link, time zone, active or not |
| Time entry | Hours one seamstress spent on one day. Either on an order (sewing, tidying up, fittings), which is billable, or general (waiting), which is paid but never billed | Order or general, seamstress, date in her time zone, hours, review status (waiting, approved, held back), invoice it's on (if any), timesheet it's on (if any) |
| Photo | A picture of a garment | Order, who sent it, date, review status (waiting, approved, held back) |
| Invoice | What a client is asked to pay for one garment | Order, time entries, hourly total, quote, final price, status (draft, sent) |
| Timesheet | One seamstress's hours for one month, across all her orders plus general time. Comes out as a spreadsheet | Seamstress, month, entries, total, sent or not. Worked out from time entries, never typed in |

## 6. Scope

**Today (Must):** SEAM-1, SEAM-2, SEAM-3, CEO-1, CEO-2, CEO-3, CEO-4, CEO-5, CEO-6, CEO-9, CLI-1, CLI-2.

**Next (Should):** SEAM-4, SEAM-5, SEAM-7, CEO-7, CEO-8.

**Later (Could):** SEAM-6, CLI-3, CLI-4.

**Stretch goals:** CEO-10, low, medium and high rates. CLI-5, the client web app with the dress and its journey.

**Out:** WhatsApp or any chat integration, native phone apps, taking payment, accounting or payroll software exports, tax, client logins, stock and fabric tracking, scheduling and deadlines, getting garments to and from remote seamstresses.

## 7. Open questions

For the problem owner:

1. Does the CEO work from a laptop, a phone or both? This decides what her side of the app looks like, and the CEO stories haven't been reviewed yet.

Settled so far:

- **Going over the quote:** the CEO hears first, because she approves every entry. The client then sees it on their link, not only on the invoice.
- **Final dress visualisation:** a gallery, a before and after, then a generated version, in that order.
- **Two seamstresses on one garment:** both can work on it in the same week.
- **Fittings:** paid, and billed to that client's order.

- **Who runs it:** the CEO only.
- **Hourly rate:** one rate for now. Low, medium and high rates are a stretch goal.
- **Several seamstresses on one garment:** yes.
- **Waiting:** paid as general time, not billed to any client.
- **Checking before clients see:** the CEO approves hours and photos first.
- **Timesheet format:** a spreadsheet.
- **Seamstress links:** a personal link with no password is fine, as long as she sees an order number and never the client's details.
- **Time zones:** seamstresses can be in different ones.

- **Quote and rounding:** a quote is agreed up front and recorded on the order. The CEO decides the final price at the end, with the hours total beside it.
- **What clients see:** hours and progress as they happen, plus a description and a total.
- **Where seamstresses work:** remotely, on several client orders at once, over different time periods.
- **How seamstresses use it:** a mobile web app on their phone, for photos and time. No WhatsApp.
- **Tidying up:** counts as paid work, always on an order, so it's billed to that order.
- **Client stretch goal:** a web app with visualisations of the final dress and its journey.
