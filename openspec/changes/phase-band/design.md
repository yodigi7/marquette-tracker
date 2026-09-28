# Design

## Context

See proposal.md — Why. The constraint that shapes everything, and which is worth restating because it
dictates the whole shape of the solution:

```
dark dot      hex        luminance   max fill luminance it permits
low           #0d9488      0.2304     0.1866
high          #fb923c      0.4139     0.1046
peak          #e879f9      0.3767     0.0922   <- binding
```

A monitor marker is painted inside the day cell, on top of the fill, so every tinted fill is capped at
`0.0922` relative luminance. The current dark fills sit at 19–22% of that. A search over hue and
lightness for the best three-phase palette inside the cap reaches a worst-pair separation of `0.0616`,
against `0.0572` today. Three tinted fills are not separable in the dark theme.

## Goals / Non-Goals

**Goals:**

- Make `Before`, `Fertile`, and `After` genuinely distinguishable in dark mode.
- Make the fertile window the most prominent of the three.
- Keep every reading marker's legibility exactly as it is today.
- Make the window's opening and closing days identifiable without a second mark on screen.

**Non-Goals:**

- No engine, window-computation, or status-semantics change.
- No change to the Status view's badges, which show the precise status and need four distinguishable
  fills of their own.
- No change to the tile fills, so nothing about the reading markers moves.
- No new dependency.

## Decisions

### The band carries the distinction; the fill keeps the hue

A 4px band along the top of each day, in the phase's full-chroma colour. Nothing is painted on it, so
the marker cap does not apply and it is free of the constraint that caps the fills:

|                                     | worst pair | vs page      |
| ----------------------------------- | ---------- | ------------ |
| fills, today                        | 0.0572     | 1.27–1.58:1  |
| fills, best possible inside the cap | 0.0616     | —            |
| **bands, dark**                     | **0.2118** | 7.36–11.86:1 |
| **bands, light**                    | **0.1721** | 4.70–5.47:1  |

The dark band values already exist in the stylesheet as the `--fertility-status-*-border` tokens. They
are already contrast-checked against their own fills, and they are simply never painted. The palette
already contains the answer.

The tile fills are left exactly as they are. That is the reason this change is cheap on legibility: the
readings sit on the same background they always did, at 6.09:1 or better.

### The band bridges the grid gap

The grid is `grid-cols-7 gap-1`. The band extends 4px into the gap on each side, so an 11-day window
reads as one region rather than 11 dashes. The cell therefore cannot be `overflow-hidden`, and the
band deliberately overhangs the cell's `rounded-md` corner — it is a stroke across the top of the
calendar, not a fill clipped to the tile.

### The run's ends are marked by shaping the band

A first attempt drew a short stub below the band's edge in the band's own colour. Verified in the
browser as pixel-identical to the band (`rgb(251, 113, 133)` on both), and at true size a 4×10px stub
below a 4px bar reads as a floating period. The tests asserted the element _existed_ and never that it
was _legible_, which is the gap that let it ship.

The band's outer corners are now rounded on the first and last day of a run and square everywhere else.
Same colour, no additional element, and nothing on screen that can be read as debris. The tests now
assert that the first and last day are presented differently from an interior day, which is the
property that was actually required.

### A run clipped by a month is shaped as though it continued

The window's end is 3 days after the last Peak. A band rounded at the last day of a displayed month
would report an end the window does not have, and in a fertility app that reads as a protocol result.
The two flags are pure functions of the window and carry no month information, so paging the calendar
cannot change what is marked.

### A rejection worth recording

Painting **only** the fertile window, and leaving `Before` and `After` untinted, does fix the reported
problem much more thoroughly — a single band is findable at 0.279 lightness above the page, and no
marker has to survive a tint. That was implemented and is the subject of the previous revision of this
branch.

It was withdrawn because all three phases are wanted, and it is the wrong trade for that requirement:
it is a decision about which information the Calendar offers, not about how to render it. Worth noting
in the record that the same reasoning _does_ apply to the fills within a phase, which is why the fills
are exempt from separation while the bands are not.

## Risks / Trade-offs

- **The band is a thin mark, and the fill is most of what is seen.** The band fixes the boundary and
  the phase identity; it does not lift the month out of a dark field the way a lighter fill would.
  This is the honest limit of what a band can do, and it is the cost of painting all three phases.
  → Accepted, and named in the issue, because the alternative tops out at 0.0616 and does not work.

- **The band overhangs the rounded corners.** → Deliberate; recorded rather than smoothed over.

- **Light mode's bands only reach 0.1721**, because a 4px band on white has to clear 3:1 and the dark
  values that satisfy that crowd each other. → The guard's separation floor is per theme for this
  reason, with a comment naming what it replaced.

- **The band is easy to lose behind the reading marker** if the two are ever drawn in the same place.
  → The marker sits mid-tile and the band at the top edge, verified by the coexisting test.

## Migration Plan

Entirely presentational. No stored data, no schema, no persisted preference changes; the legend's
layer-visibility ids are unchanged. Rollback is a revert.

## Open Questions

None.
