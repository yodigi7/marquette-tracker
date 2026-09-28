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

The consequence that decides this design: **a background a marker sits on cannot be loud.** The window
is a region — it occupies the whole day — so it is still a background, and the cap still applies to its
interior. Anything that is allowed to be bright has to be something no marker is painted on.

## Goals / Non-Goals

**Goals:**

- Make `Before`, `Fertile`, and `After` genuinely distinguishable in dark mode.
- Make the fertile window unmistakably the thing the eye lands on.
- Make the window's mark impossible to confuse with the menses stripe.
- Keep every reading marker's legibility exactly as it is today.
- Make the window's opening and closing days identifiable without a second mark on screen.

**Non-Goals:**

- No engine, window-computation, or status-semantics change.
- No change to the Status view's badges, which show the precise status and need four distinguishable
  fills of their own.
- No change to the tile fills, so nothing about the reading markers moves.
- No change to the menses stripe, which stays where it is, in its own colour.
- No new dependency.

## Decisions

### The window is a region; the two quiet phases keep a band

The first pass at this change put a 4px band on the top edge of every day, in the phase's full-chroma
colour. It worked on the reported problem and it was built and verified. It then failed on a second
complaint, which is the one that decided the final shape:

> the fertile window band and the menses stripe get confused with the next week being close vertically

That is a real defect and it is structural rather than cosmetic. A band is a horizontal line along a
cell's **top** edge; the menses stripe is a horizontal line along the **bottom** edge of the cell above.
The grid separates rows by 4px, so across a week boundary the two are 8px apart and both horizontal.
They read as one stripe. No change to a band can fix that, because a band is the same kind of mark as the
stripe; only changing the kind of mark fixes it.

So the window is now a full-height outlined region, and the two quiet phases keep their bands:

| mark                | worst pair vs page | shape                           |
| ------------------- | ------------------ | ------------------------------- |
| fills               | 0.0572             | large background                |
| band (before/after) | 0.2118 dark        | 4px bar along a cell's top      |
| region (window)     | —                  | 2px closed outline, full height |

The region's **interior** is the ordinary phase fill, unchanged. That is not an oversight: the interior
is a background a marker is painted on, so the cap applies to it and it cannot be lightened without
either breaching the marker rules or dropping a reading's legibility. The brightness lives in the
**outline**, because no marker is painted on an edge. That is the whole reason the window reads as an
object rather than as a tint, and it is why the reading markers are exactly as legible as they are
today.

The two quiet phases keeping their bands is a deliberate asymmetry: the window is the thing the user
scans for, and a region on every phase would put three regions in competition for that attention.

### The region's edges are computed from the month, not from the cell

A day cell cannot decide the region's edges, because it does not know whether the day above or beside
it is inside the window. `windowEdgesByDay` therefore takes the whole displayed month and returns, per
day, which of the four sides the window has. Two properties of that result are the entire fix for the
two rendering defects found on the first attempt:

- **No edge across the middle of a run.** A side is painted only where the window genuinely stops in
  that column. Where the run continues down, neither the bottom edge nor the top edge below it is
  drawn, so the outline runs unbroken through the row gap.
- **No half-rounded ends.** Rounding is applied at the window's two true ends and nowhere else, and the
  vertical edge is painted on the same cell that rounds. A row that begins mid-window stays square,
  which is what makes the run's ends legible as its ends.

### Each side is coloured in its own right, and this is load-bearing

The first attempt at the region carried a single `border-<colour>` class. A border-colour utility sets
all four sides at once, and setting a side's **width** does not undo a **colour** that has been set. So
the region outlined itself through the middle of every run that wrapped weeks, and squared off the
rounded corners it had just drawn — which is exactly the pair of defects reported against it, and the
reason a fix to the width logic alone changed nothing on screen.

`BlockEdges` is therefore four classes, and an unpainted side is left transparent. The test that guards
this asserts the **absence** of every side's colour class on an interior day, because the failure mode
is a class that is present when it should not be. The class names are written out in full rather than
built from a token, because Tailwind generates its utilities from the class names it finds in the
source and a computed `border-l-${token}` is not one of them.

### A window that wraps weeks is two runs, and the render says so

A window is 11 days in a 7-wide grid. Its last day in one row is in the final column and its next day
is in the first, so the two cells are not neighbours in any direction. There is no shape that joins
them, and a rendering that looked like one connected region would misrepresent the calendar's geometry.

The region is therefore drawn per row, with the grid gap between segments left open. The eye joins them
because they are the same colour, aligned, and in adjacent rows. The region bleeds 4px into the row gap
**only** in a column where the run actually continues, which is what keeps the vertical edges unbroken
without bleeding over a day that is not part of the window.

### The region's ends are the window's ends, not the month's

A run clipped by the edge of the displayed month is not finished, and rounding it would report a window
end the protocol does not have — which in a fertility app reads as a clinical result. The true end day
is passed into the edge calculation, and a clipped run's outer edge stays square. The same rule already
applied to the band, and still does.

### The menses stripe is left alone

The obvious remedy for the band/stripe collision is to restyle the menses. It is not needed here, and
restyling it would be the wrong trade for two reasons:

- **They never share a day.** Menses is cycle days 1–5 and the window is days 6 and later, so the
  stripe is never painted on the region's fill. The collision was between a _band_ and a stripe in
  adjacent cells, not between two marks on one cell.
- **The band is gone.** The collision existed because the window's mark was a line. A region is a
  closed shape and cannot be read as a stripe, so the conflict is resolved by the window's mark, at no
  cost to the user.

Worth recording what the collision _would_ have cost, had the marks shared a day: a red stripe on a rose
fill is 2.90:1 and the same hue, so it would have sunk into the region it was annotating. A near-white
stripe would have worked (9.40:1 on the fill, 18.96:1 on a plain day) at the price of the calendar
having two near-white things on it.

## Rejections worth recording

- **A backing disc behind the reading marker.** Invisible at the size the marker is drawn, and it does
  not help: the marker already clears 3:1 against every fill.
- **Lifting all three reading markers** so the fills could be lighter. Raises the fill cap by 1.6x but
  drops the readings' own separation to 0.197, under their 0.25 floor. Two accessibility rules in direct
  conflict, and the marker's should not give.
- **Painting only the fertile window** and leaving `Before` and `After` untinted. Fixes the reported
  problem more thoroughly than anything here, and was implemented. Withdrawn because all three phases
  are wanted, and it is a decision about which information the Calendar offers rather than how to render
  it.
- **A single connected outline** traced around a window that wraps weeks. Needs a bespoke path per
  window shape, and it would misrepresent the grid.

## Risks / Trade-offs

- **The region needs the whole month to draw one cell.** A cell cannot decide its own edges, so the
  Calendar resolves every cell once and derives the edges from that. The cost is that the edge
  calculation is no longer local to a cell; the mitigation is that it is a pure function with its own
  tests, and resolving the month once is cheaper than resolving each cell twice.
- **A rose outline is intrinsically close to the amber `Before` band.** Rose-400 is 0.227 from it in
  dark and rose-600 is 0.172 in light; no rose step clears light's 0.15 floor by much, and the two are
  told apart by shape and position long before hue — a 2px closed box round a run against a 4px bar
  along the top edge of a single day. The guard asserts the pair anyway, per theme, because the risk is
  worth watching even when the margin is thin.
- **Light mode's marks only reach 0.1721** against each other, because a mark on white has to clear 3:1
  and the dark values that satisfy that crowd each other. → The guard's separation floor is per theme
  for this reason.
- **The region's outline and the menses stripe can still be close vertically** on a week boundary. →
  They are different kinds of mark — a closed box against a bar — which is the distinction the change
  was made to establish. Verified on a month whose window wraps three rows.

## Migration Plan

Entirely presentational. No stored data, no schema, no persisted preference changes; the legend's
layer-visibility ids are unchanged. Rollback is a revert.

## Open Questions

None.
