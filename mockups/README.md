# Seamless: seamstress app mockups

Fourteen clickable screens for the seamstress's phone, covering the seamstress stories in [docs/PRD.md](../docs/PRD.md). They are plain HTML with no build step and no backend: every number on them is typed in, taken from the fake data in [fixtures](../fixtures) for seamstress `S03` on Thursday 19 November.

To look at them, open `index.html` in a browser, or serve the folder:

```sh
npx serve mockups
```

Then open the address it prints, at phone width.

| File | Screen | Stories |
| --- | --- | --- |
| `index.html` | My orders: each order with its due date and flags, her garments with their stage and a one-tap Start, general time, and her hours this month | SEAM-1, SEAM-6 |
| `timer-running.html` | Timer running: the bar at the bottom with the garment, the time so far, the kind and Stop | SEAM-6 |
| `timer-stopped.html` | Timer stopped: a short message that it saved, with change to fitting or tidying, add photo and undo | SEAM-6, SEAM-3 |
| `timer-forgotten.html` | Forgotten timer: an amber bar asking when she really stopped | SEAM-6 |
| `garment.html` | Garment: the brief, the stage picker, photos, her entries, Start, add time and add photo | SEAM-1, SEAM-7 |
| `log-time.html` | Add time: the typed fallback, in quarter hours, with what it was, when and a note | SEAM-2 |
| `saved.html` | Time saved: repeats back what went in, with a way to fix it | SEAM-2, SEAM-4 |
| `photo.html` | Add a photo: camera or gallery, and a caption | SEAM-3 |
| `photo-failed.html` | Photo didn't send: the photo and caption are kept, with try again or send it later | SEAM-3 |
| `timesheet.html` | My timesheet: the month by order and by day, with estimated pay | SEAM-5 |
| `general-time.html` | General time, typed: hours with no order, for waiting. Paid, and no client is billed | SEAM-2 |
| `general-saved.html` | General time saved: repeats back what went in, and says it's paid and not billed | SEAM-2 |
| `link-expired.html` | Link not working: what she sees if her personal link was replaced or switched off | CEO-8 |
| `which-order.html` | Stretch goal only: the "say it or type it" follow-up when a spoken line could mean two garments | Stretch |

`timer-forgotten.html`, `photo-failed.html`, `link-expired.html` and `which-order.html` are states no other screen links to. Open them directly.

To click through the main path: Start on `index.html`, Stop on the timer bar, then Add photo.

## How these line up with the PRD

These were redrawn on 19 November to match the merged PRD: the timer comes first, orders hold garments, express and due dates are flagged, and each garment has a stage. Where a mockup and the PRD disagree, the PRD wins.

Still different from the PRD or the plan:

- The timer doesn't tick, and the kind chip on the bar doesn't cycle.
- The timesheet has no month picker.
- Add photo has a caption but no label.
- "I stopped at…" has no time picker screen.
- Stopping within a minute, and starting a second garment while one runs, aren't drawn.

## Mood boards

Two other directions for the brand, to compare with the dressmaker look the screens use now. Neither is applied to any screen.

| File | Direction |
| --- | --- |
| `moodboard-godmother.html` | The godmother: midnight blue and stardust gold, a needle for a wand, a clock before midnight for due dates and the timer |
| `moodboard-designer.html` | The designer: black, white and signal red, pattern pieces as cards, pins as flags, technical drawings |

## Things these are not

- Not the real app. Nothing is saved, and only the hours steppers and the three choices on `log-time.html` respond. Everything else is links between screens.
- Not final design. See the brand notes below.
- Not complete. See the list above.

No client names appear on any screen, only order numbers and garments.

## Brand and voice

The product is called **Seamless**. It talks like a Regency society dressmaker: sharp, sassy, sure of herself and discreet about her clients.

- **Voice:** plain English with attitude. "Express first. The veil can wait." "Noted. Not a minute missed." "Still going? I doubt it." No French.
- **Where the sass goes:** headings and asides. Labels, buttons, hours and money stay plain and exact.
- **Tailoring details:** a tape measure across the top of every screen, pinstripe cloth as the ground, order numbers as sewn-in labels, running stitch for dividers and round the main button, a sewing machine on the home screen, scissors on "fix it", a spool on the timesheet and a dress form where a photo will go. All drawn in code, with no image files and no real maker's name or logo.
- **Look:** aubergine text on a powder ground, claret for the main button, a high-contrast serif for headings and her asides (in italics), a plain sans for everything you need to read fast, and squared corners.
