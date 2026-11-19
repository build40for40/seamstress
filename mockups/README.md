# Seamstress app mockups

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

## Things these are not

- Not the real app. Nothing is saved, and only the hours steppers and the three choices on `log-time.html` respond.
- Not final design. The colours and type are a first pass.
- Not complete. There are no screens yet for changing the date, marking an order finished, or the timer in SEAM-6.

No client names appear on any screen, only order numbers and garments.
