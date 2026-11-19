# Seamstress app mockups

Six clickable screens for the seamstress's phone, covering the seamstress stories in [docs/PRD.md](../docs/PRD.md). They are plain HTML with no build step and no backend: every number on them is typed in, taken from the fake data in [fixtures](../fixtures) for seamstress `S02` on Tuesday 10 November.

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

## Things these are not

- Not the real app. Nothing is saved, and only the hours stepper and the three choices on `log-time.html` respond.
- Not final design. The colours and type are a first pass.
- Not complete. General time opens the same log time screen and still shows an order number, and there is no screen yet for a dead link, a failed upload or the app asking "which order?".

No client names appear on any screen, only order numbers and garments.
