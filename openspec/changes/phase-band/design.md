# Design

## Context

See proposal.md — Why. The constraint that shapes everything, and which is worth restating because it
dictates the whole shape of the solution:

```
dark dot      hex        luminance   max fill luminance it permits
low           #0d9488      0.2304     0.0435   <- binding
high          #fb923c      0.4139     0.1046
peak          #e879f9      0.3767     0.0922
```

A monitor marker is painted inside the day cell, on top of the fill, so every tinted fill is capped at
`0.0435` relative luminance. The current dark fills sit well under that. A search over hue and
lightness for the best three-phase palette inside the cap reaches a worst-pair separation of `0.0616`,
against `0.0572` today. Three tinted fills are not separable in the dark theme.

**The binding reading is Low, not Peak.** That correction matters: it was recorded the other way round
for most of this change's life, and it is exactly the kind of error that lets a "make the window more
obvious" edit push a bar past what a reading can survive. The guard now names the binding reading in its
failure message.

## Goals / Non-Goals

**Goals:**

- Make `Before`, `Fertile`, and `After` genuinely distinguishable in dark mode.
- Make the fertile window unmistakably the thing the eye lands on.
- Make the window's mark impossible to confuse with the menses stripe.
- Keep every reading marker's legibility exactly as it is today.
- Make the window's opening and closing days identifiable without a second mark on screen.
- Keep the calendar's week rows legible.

**Non-Goals:**

- No engine, window-computation, or status-semantics change.
- No change to the Status view's badges, which show the precise status and need four distinguishable
  fills of their own.
- No change to the tile fills, so nothing about the reading markers moves.
- No change to the menses stripe, which stays where it is, in its own colour.
- No new dependency.

## Decisions

### The window is a solid bar; the quiet phases are tints

The first pass at this change put a 4px band on the top edge of every day, in the phase's full-chroma
colour. It separated the three phases cleanly — worst-pair separation went from `0.0572` to `0.2118` in
dark mode — and it was built and verified. It then failed on a second report, which is what decided the
final shape:

> the fertile window band and the menses stripe get confused with the next week being close vertically

That is a real defect and it is structural rather than cosmetic. A band is a horizontal line along a
cell's **top** edge; the menses stripe is a horizontal line along the **bottom** edge of the cell above.
The grid separates rows by 4px, so across a week boundary the two are 8px apart and both horizontal. They
read as one stripe. No change to a band can fix that, because a band is the same kind of mark as the
stripe; only changing the kind of mark fixes it.

So the bands are gone from every phase and the window is a solid bar at full cell height:

| mark         | shape                        |
| ------------ | ---------------------------- |
| fills        | large background             |
| bar (window) | solid fill, full cell height |

This is the model Google Calendar and FullCalendar use for a multi-day span: a solid bar, rounded at the
ends, no outline. An outline around a filled bar is redundant, and on a 48px cell a 2px wire reads as a
box rather than a bar — which is what the intermediate revision looked like.

The two quiet phases going back to being plain tints is a second, smaller call, and it drew a second
review in turn: the tints were too dark, and `Before` looked like the window.

### The quiet phases: Before changes hue, both get lighter

Two constraints were fighting, and neither was visible in the code.

**The lift is capped.** A fill cannot be brighter than `0.0435` luminance, set by the Low reading, and
that cap is the reason the tints read as barely-there. It is also why a full-height shape at the tint's
lightness is not a surface, which is the whole argument for the window's own colour.

**The hue made the lift useless.** `Before` was amber at hue `46` and the window is rose at `14` —
thirty-two degrees apart. Brightening amber therefore walked it _toward_ the window, so "make it lighter"
and "make it look less like the window" were the same request pointed in opposite directions. An earlier
attempt lifted the tints and the review came back saying `Before` was now similar to the window. It was.

`Before` is indigo at hue `280` now, ninety-four degrees from the window and further from it than amber
ever was, and `After` stays teal. Both are lifted: `0.105 → 0.151` and `0.075 → 0.125` measured from the
card, which is the surface the Calendar actually renders on. Both sit below the window in lightness _and_
chroma, so the window is still the most prominent surface on the calendar.

**What the hue change costs.** A cool fill spends its whole luminance budget on being cool, so it is
capped harder than a warm one — indigo clears the Low reading at `3.66:1` where amber managed `4.00:1`
at a lower lightness. The visible result is that `Before` is about as light as it can be and no lighter.
That is the price of the separation, and it is the right price: mistaking the window for a `Before` day is
the complaint, and a slightly darker `Before` is not.

**Two things the search got wrong, recorded because they nearly shipped.** A search that maximises
distance from the window will always run to the widest gap on the colour wheel, and on this palette the
widest gaps sit next to a _reading marker_ — one candidate came back magenta, four degrees from the Peak
dot. And a candidate came back as prominent as the window itself and more chromatic than it, which would
have inverted the one thing this change exists for. Both are now constraints rather than preferences:
no fill may match a marker's hue, and the window must be the most prominent surface.

**Light mode is untouched, deliberately.** It has the same shape of problem — its two quiet phases are
cream and mint, both near-neutral, `0.062` apart, and the pale pink window sits among them — but the
readings there are darker steps, so the cap and the achievable lift are different, and nobody has
reported it. Worth checking on a real device rather than changing blind.

### The window day is painted in the window's own colour, cell and all

The bar carries its own value rather than reusing the cell's tint, because a full-height shape at the
tint's lightness is not a surface. In dark the tint is a step of `0.106` OKLab L above the page and the
bar is `0.209`. In light the tint is already the loudest thing on a white page, so the bar _is_ the tint
there and the two are deliberately the same value — a second, arbitrary light pink would buy nothing.

**The day cell behind the bar is that same colour**, which is not a detail and was found on screen. A
rounded corner cannot paint itself: wherever the bar's radius arcs away at the window's two ends,
whatever is behind it shows through. With the darker status tint behind it, each end of the window grew a
notch of that tint — a visible leftover of the old treatment, at exactly the two places the eye goes
first to find the window's edges. Painting the cell and the bar as one surface is also what Google
Calendar and FullCalendar do, and it means a rounded end reveals nothing but the window.

The status tint is untouched, because it is still the right value for every surface with no bar: the
Status view. The guard asserts only that the window colour is _no darker_ than the tint, rather than a
distance between them — the two are never on screen together, so demanding a separation would assert a
distinction no user ever sees, and in dark the honest distance is only `0.088`.

Because a bar spans the whole day it _is_ a surface a marker is painted on, so it joins the fill set the
marker rule checks, and dark's `#700b25` sits at `0.0382` with Low binding at `3.18:1`.

The 3:1 non-text rule does **not** apply to the bar against the page, and writing it would have been a
rule that fails a correct palette: that rule covers boundaries needed to identify a control and
indicator shapes, and no fill in either theme reaches 3:1 against its page — the phase tints sit at
`1.1:1` and `1.3:1`. The rule that does apply is colour distance from the page and from the fills the bar
sits beside, which both themes clear at `0.104` or better.

### The bar's shape is computed from the month, and positioned, not counted

A day cell cannot decide the bar's own edges, because it does not know whether the day above or beside
it is inside the window. `windowEdgesByDay` therefore takes the whole displayed month and returns, per
day, which sides the window has.

**Every day carries its own row and column.** A month that does not start on the configured first day of
the week is padded with leading blanks, and dropping those blanks and dividing a day's index by the width
puts every row after the first in the wrong row. That put the bar's edges on the wrong days, which showed
up as two faults at once: 4px tabs of window colour outside the calendar's first and last columns, and
4px holes inside the run immediately after the day that opened a row. It was invisible in the code and
obvious on screen, and it is why the slot type carries a position rather than being derived from an
index.

Left and right are decided **independently**, for the same reason. A day can open its row and still have
the window continuing to its right; a day can close its row and still have it continuing to its left.
Deciding both sides from a single flag is what produced the tabs and the holes.

### The bar spans the day gap and never the week gap

Sideways, the bar always extends the full 4px into the gap whenever the window continues across it, so a
run of days is one solid shape. A version that did not was a comb: the fill was the _cell's_, so every
pair of adjacent window days was separated by 4px of page showing through, which is the single most
visually broken thing this change has produced.

Vertically it does not extend at all. An earlier revision bled it into the row gap wherever the run
continued downward, on the reasoning that this would keep the outline unbroken. It did — and it dissolved
the calendar's weeks inside the window. The row gap is the only cue that tells you which week you are
looking at, and the window is the one thing on the calendar you read _within_ that structure. The bar is
now exactly the cell's height, always.

### A window that wraps weeks is two runs, and the render says so

A window is 11 days in a 7-wide grid. Its last day in one row is in the final column and its next day
is in the first, so the two cells are not neighbours in any direction. There is no shape that joins them,
and a rendering that looked like one connected region would misrepresent the calendar's geometry. The eye
joins the segments because they are the same colour, aligned, and in adjacent rows.

### The bar's rounded ends are the window's ends, not the month's

A run clipped by the edge of the displayed month is not finished, and rounding it would report a window
end the protocol does not have — which in a fertility app reads as a clinical result. The true end day is
passed into the edge calculation and a clipped run's outer end stays square. A row that merely opens or
closes inside the window is square for the same reason: a week boundary is not a window boundary.

### The menses stripe is left alone

The obvious remedy for the band/stripe collision is to restyle the menses. It is not needed here, and
restyling it would be the wrong trade for two reasons:

- **They never share a day.** Menses is cycle days 1–5 and the window is days 6 and later, so the stripe
  is never painted on the bar. The collision was between a _band_ and a stripe in adjacent cells, not
  between two marks on one cell.
- **The band is gone.** The collision existed because the window's mark was a line. A filled bar cannot be
  read as a stripe, so the conflict is resolved by the window's mark, at no cost to the user.

Worth recording what the collision _would_ have cost, had the marks shared a day: a red stripe on a rose
fill is 2.90:1 and the same hue, so it would have sunk into the region it was annotating. A near-white
stripe would have worked (9.40:1 on the fill, 18.96:1 on a plain day) at the price of the calendar
having two near-white things on it.

## Rejections worth recording

- **A band on every phase.** It separated the three phases better than anything else here, and it is the
  reason a second report arrived. A strip along a cell's top edge and the menses stripe along the cell
  above's bottom edge are 8px apart across a week boundary and read as one mark.
- **A backing disc behind the reading marker.** Invisible at the size the marker is drawn, and it does
  not help: the marker already clears 3:1 against every fill.
- **Lifting all three reading markers** so the fills could be lighter. Raises the fill cap by 1.6x but
  drops the readings' own separation to 0.197, under their 0.25 floor. Two accessibility rules in direct
  conflict, and the marker's should not give.
- **Painting only the fertile window** and leaving `Before` and `After` untinted. Fixes the reported
  problem more thoroughly than anything here, and was implemented. Withdrawn because all three phases are
  wanted, and it is a decision about which information the Calendar offers rather than how to render it.
- **An outline around the window, carried by a colour nothing is painted on.** The first attempt at making
  the window a shape, and rejected twice over. It puts a line through the middle of a run that wraps
  weeks unless every side is coloured separately — and a `border-<colour>` class sets all four at once,
  while a side's width cannot undo a colour that has been set, so the two defects it was written to fix
  survived the fix. Even corrected, a 2px wire on a 48px cell reads as a box.
- **Bleeding the bar into the row gap** to keep a wrapping run visually continuous. It works, and it costs
  the calendar's week structure.
- **A single connected outline** traced around a window that wraps weeks. Needs a bespoke path per
  window shape, and it would misrepresent the grid.

## Risks / Trade-offs

- **The region needs the whole month to draw one cell.** A cell cannot decide its own edges, so the
  Calendar resolves every cell once and derives the shape from that. The cost is that the shape is no
  longer local to a cell; the mitigation is that it is a pure function with its own tests, including
  tests for a padded month.
- **`Before` and `After` are still told apart by hue alone**, now `0.144` apart rather than `0.062`. Better,
  and still the weakest pair in the palette. → Accepted, guarded against regressing, and named here rather
  than left to be discovered.
- **Light mode has the same shape of problem and has not been fixed** — cream and mint, `0.062` apart, with
  the pale pink window among them. → Deliberate: the readings there are darker, so the numbers differ and
  nobody has reported it. Flagged for the device check.
- **The bar is intrinsically close to the amber `Before` tint in hue.** The two are told apart by shape
  long before hue — a full-height filled bar against a tinted day with nothing on it.
- **Dark's bar clears its worst reading by 0.18:1.** That is the price of being the loudest thing on a
  dark calendar, and it is thin. The guard asserts it, and names which reading binds, so a later
  brightening is made against the right number rather than the wrong one.
- **Light mode's marks only reach 0.1721** against each other, because a mark on white has to clear 3:1
  and the dark values that satisfy that crowd each other. → The guard's separation floor is per theme for
  this reason.

## Migration Plan

Entirely presentational. No stored data, no schema, no persisted preference changes; the legend's
layer-visibility ids are unchanged. Rollback is a revert.

## Open Questions

None.
