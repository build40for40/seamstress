# Seamless: seamstress app mockups

Eleven clickable screens for the seamstress's phone, covering the seamstress stories in [docs/PRD.md](../docs/PRD.md). They are plain HTML with no build step and no backend: every number on them is typed in, taken from the fake data in [fixtures](../fixtures) for seamstress `S02` on Tuesday 10 November.

To look at them, open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 4173 --directory mockups
```

Then open `http://localhost:4173` at phone width.

| File | Screen | Stories |
| --- | --- | --- |
| `index.html` | My orders: her open orders, general time, her timesheet, and a "say it or type it" box | SEAM-1 |
| `order.html` | Order detail: what needs doing, photos, her hours | SEAM-1, SEAM-7 |
| `log-time.html` | Log time: hours, what it was, when, a note | SEAM-2 |
| `saved.html` | Saved: repeats back what went in, with a way to fix it | SEAM-2, SEAM-4 |
| `photo.html` | Add a photo: camera or gallery, and a caption | SEAM-3 |
| `timesheet.html` | My timesheet: the month by order and by day | SEAM-5 |
| `general-time.html` | General time: hours with no order, for waiting. Paid, and no client is billed | SEAM-2 |
| `which-order.html` | Which order?: shown when she says or types something that could mean two orders. Nothing is saved until she picks | SEAM-2 |
| `general-saved.html` | General time saved: repeats back what went in, and says it's paid and not billed | SEAM-2 |
| `photo-failed.html` | Photo didn't send: the photo and caption are kept, with try again or send it later | SEAM-3 |
| `link-expired.html` | Link not working: what she sees if her personal link was replaced or switched off | CEO-8 |

`photo-failed.html` and `link-expired.html` are error states, so no other screen links to them. Open them directly.

The mic button on `index.html` leads to `which-order.html`, as if she had said "two hours on a fitting" with two orders open.

## Where the app has moved on

These were drawn before the team settled the PRD, so the real workroom app differs in a few places. Where they disagree, the PRD wins.

- **The timer comes first.** Each garment gets a one-tap Start, and a running timer shows as a bar on every screen. The log time screen here becomes the fallback for typed hours.
- **Orders hold garments.** The list shows orders with her garments on each, as `SE-1003-A`, and a note when the order has other garments she isn't on.
- **Due dates and express.** Orders are sorted express first, then by due date, and flagged when overdue or due within 2 days.
- **Garment stages.** She moves a garment through to do, in progress, fitting and done.
- **No "say it or type it" box.** That's a stretch goal.

The brand, voice, cards and the saved screen's "repeat it back" pattern still stand.

## Mood boards

Two other directions for the brand, to compare with the dressmaker look the screens use now. Neither is applied to any screen.

| File | Direction |
| --- | --- |
| `moodboard-godmother.html` | The godmother: midnight blue and stardust gold, a needle for a wand, a clock before midnight for due dates and the timer |
| `moodboard-designer.html` | The designer: black, white and signal red, pattern pieces as cards, pins as flags, technical drawings |

## Things these are not

- Not the real app. Nothing is saved, and only the hours steppers and the three choices on `log-time.html` respond.
- Not final design. See the brand notes below.
- Not complete. There are no screens yet for changing the date, marking an order finished, or the timer in SEAM-6.

No client names appear on any screen, only order numbers and garments.

## Brand and voice

The product is called **Seamless**. It talks like a Regency society dressmaker: sharp, sassy, sure of herself and discreet about her clients.

- **Voice:** plain English with attitude. "Go on, tell me everything." "Noted. Not a minute missed." "I'm not saving a thing until you pick." No French.
- **Where the sass goes:** headings and asides. Labels, buttons, hours and money stay plain and exact.
- **Tailoring details:** a tape measure across the top of every screen, pinstripe cloth as the ground, order numbers as sewn-in labels, running stitch for dividers and round the main button, a sewing machine on the home screen, a needle and thread by the say-or-type box, scissors on "fix it", a spool on the timesheet and a dress form where a photo will go. All drawn in code, with no image files and no real maker's name or logo.
- **Look:** aubergine text on a powder ground, claret for the main button, a high-contrast serif for headings and her asides (in italics), a plain sans for everything you need to read fast, and squared corners.
