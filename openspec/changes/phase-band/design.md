# Design

## Context

See proposal.md — Why. The constraint that shapes everything, and which is worth restating because it
dictates the whole shape of the solution:

```
dark dot      hex        luminance   max fill luminance it permits
low           #04ab96      0.3135     1.0406   <- binding
high          #ff9853      0.4434     1.4302
peak          #f195ff      0.4742     1.5225
```

A monitor marker is painted inside the day cell, on top of the fill, so every tinted fill is bounded by
the 3:1 rule — and the bound is set by the **darkest** reading in the theme.

**The binding reading is Low, not Peak.** That correction mattered for most of this change's life and was
recorded the other way round: getting it backwards is exactly the error that lets a "make the window more
obvious" edit push a background past what a reading can survive. The guard now names the binding reading
in its failure message.

**The bound was never a property of the fills.** For most of this change the dark `Low` reading was
`#0d9488`, which permitted a fill of `0.0435` relative luminance. The fills sat within `0.017` OKLab
lightness of one another inside that, and a search over hue and lightness found a worst-pair separation
of `0.0616` against `0.0572` at the time — which is what made the number read as a property of the
palette rather than of one colour choice. It was not. The 3:1 rule is a property of the **pair**: the
background is bounded by how dark the darkest reading is, so moving that reading moves the bound. Lifting
`Low` to `#04ab96` raised what a fill may be from `0.0435` to `1.0406`, at which point nothing in this
palette is capped at all — the `Before` fill is at 7% of what it is now permitted. See "The cap was in
the reading, not the fill" below.

## Goals / Non-Goals

**Goals:**

- Make `Before`, `Fertile`, and `After` genuinely distinguishable in dark mode.
- Make the fertile window unmistakably the thing the eye lands on.
- Make the window's mark impossible to confuse with the menses stripe.
- Keep every reading marker legible — by lightness, so the three are told apart at the size they are drawn.
- Make the window's opening and closing days identifiable without a second mark on screen.
- Keep the calendar's week rows legible.

**Non-Goals:**

- No engine, window-computation, or status-semantics change. The one engine addition is a test asserting
  behaviour the engine already had.
- No change to the Status view's badges, which show the precise status and need four distinguishable
  fills of their own.
- No change to the menses stripe, which stays where it is, in its own colour.
- **No change to a reading marker's shape, size, or meaning.** The readings were originally out of scope
  entirely and moved into it late: they turned out to be the constraint holding the fills down, so
  lightening them was the only route to the fills the review asked for. They moved on lightness, within
  their existing hues, and nothing about what a marker looks like as an object changed.
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

### The cap was in the reading, not the fill

This is the decision the rest of the change hangs on, and it was reached late and by being wrong about the
constraint rather than about the colours.

**The mis-framing.** A monitor marker is painted on a Calendar day's fill, so the 3:1 rule bounds how light
that fill may be — and the 3:1 rule is a property of the **pair**. Every attempt to move the fills treated
the fill as the thing with a limit and the marker as the thing to fit inside it, so the search space was
"which fill values inside `0.0435` separate best". It is not. The fill's bound is set by how _dark_ the
darkest of the three readings is, so the reading is the input that moves the fill's ceiling, not a
constraint the fill has to live under.

That single mis-framing explains most of what went wrong on this change. It is why a review asking for
yellower, lighter, further-from-the-window `Before` days could not be satisfied and appeared to be asking
for something impossible; it is why the fills ended up at 94% of a ceiling that was itself arbitrary; and
it is why the window bar was lifted to `0.0755` to compensate, which then squeezed the readings and caused
a second round of the same complaint one level up.

**The fix.** Lifting the `Low` reading raises what any fill may be. The dark `Low` went from `#0d9488` at
`0.2304` luminance — which permitted a fill of `0.0435` — to `#04ab96` at `0.3135`, which permits
`1.0406`. Nothing in this palette is capped now. The `Before` fill is at 7% of what it is permitted, the
window bar at 5%, and the headroom that three of the four original complaints were fighting for turned out
to have been sitting in a marker colour the whole time.

**Why it was the right call despite the scope.** The readings were explicitly out of scope, and repeatedly
described as the one thing that must not move. They also turned out to be the only lever that moved the
fills, so the choice was between leaving the review's request unsatisfiable and moving the thing that was
out of scope. What moved was the readings' **lightness**, within their existing hues: the markers keep
their shape, their size, their role, and what they mean. The product owner directed it after being shown
that the alternative was shipping near-black days.

**The window bar had to come back down afterwards**, which is the part that is easy to miss. The bar is the
lightest surface a reading is ever painted on, so _its_ luminance sets the floor for all three markers. At
`#9d0041` and `0.0755` that floor was `0.3265`, which left the three readings in a band too narrow to
separate and was the direct cause of "Peak and Low are too close". Dropping the bar to `#800630` at
`0.0493` puts the floor at `0.2480` while the bar still out-separates the `Before` fill from the card. The
two constraints are in genuine tension and the window yields, because a window whose brightness makes the
readings painted on it unreadable is not a more visible window. The margin is `0.0123` and it is thin.

### The quiet phases: Before changes hue, both get lighter

The cap argument is gone, but two of the three constraints that came with it are not, and the second one is
still load-bearing.

**The hue made the lift nearly useless.** `Before` was amber at hue `46` and the window is rose at `11` —
thirty-five degrees apart. Brightening amber therefore walked it _toward_ the window, so "make it lighter"
and "make it look less like the window" were the same request pointed in opposite directions. An earlier
attempt lifted the tints and the review came back saying `Before` was now similar to the window. It was.

`Before` is a warm gold at hue `93` now, eighty-two degrees from the window, and `After` stays teal at
hue `169`. From the card — the surface the Calendar actually renders on — the window is `0.2355`, `Before`
`0.2232`, and `After` `0.1253`. The window is still the most prominent surface, but the `Before` fill is
`0.0123` behind it, so the ordering the review asked for holds on a thin margin rather than a comfortable
one.

**Indigo was tried and rejected**, and the reason is worth keeping. A cool fill spends its whole luminance
budget on being cool, so it is capped harder than a warm one — indigo cleared the `Low` reading at `3.66:1`
where amber managed `4.00:1`, and landed at `0.151` against the card against gold's `0.149`, at a lower
lightness and with more chroma. A cooler hue bought separation and paid for it in exactly the dimension the
review had complained about. Warm, moved away from rose rather than across the wheel, is the answer that
does not cost the thing that was asked for. This reasoning still holds now that the cap is gone, because
the underlying observation is about how a cool fill spends its budget, not about the ceiling it hits.

**The `Before`/`After` trade, restated.** In the warm band, moving the hue from amber toward gold is a
straight line: distance from the window improves, distance from `After` degrades. They are `0.131` apart
now, against `0.057` where this started and `0.144` at the tightest point of the earlier gold work. If
`Before` and `After` turn out to be hard to tell apart on a device, the honest place to fix that is the
summary or the legend rather than another mark on every day.

**The readings are now spaced on lightness**, which is the other half of what the review was reporting and
was not visible as a colour problem at all. The symptom was specific and diagnostic: `High` was
distinguishable, `Low` and `Peak` were not. The cause is measurable — all three sat within `0.037` of each
other in OKLab lightness, so hue was carrying all of the distinction, and hue discrimination degrades
sharply below roughly 10px while a lightness difference does not. The markers are drawn at 10px in a day
cell and **6px** in the legend. Rendering the pairs confirmed the gap between the metric and the eye
entirely: the two colours differ in 79% of the dot's pixels with a mean channel delta of 129 out of 255,
and still read as one mark.

They are now at `0.31`, `0.44` and `0.47` luminance, a spread of `0.16` where there was `0.037`. Saturation
could not have done it: all three readings were within `0.02` of the sRGB gamut edge, so there was
essentially nothing left to take, and pushing all three to their gamut limits moved the worst pair only
from `0.261` to `0.277`.

**Two things the search got wrong, recorded because they nearly shipped.** A search that maximises
distance from the window will always run to the widest gap on the colour wheel, and on this palette the
widest gaps sit next to a _reading marker_ — one candidate came back magenta, four degrees from the Peak
dot. And a candidate came back as prominent as the window itself and more chromatic than it, which would
have inverted the one thing this change exists for. Both are now constraints rather than preferences:
no fill may match a marker's hue, and the window must be the most prominent surface.

**Light mode is untouched, deliberately.** It has the same shape of problem — its two quiet phases are
cream and mint, both near-neutral, `0.062` apart, and the pale pink window sits among them — but the
readings there are darker steps, so the achievable lift and the resulting distances differ, and nobody has
reported it. Its readings are at `0.264`, `0.347` and `0.274` apart, all above the floor. Worth checking on
a real device rather than changing blind.

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
marker rule checks, and dark's `#800630` sits at `0.0493` with Low binding at `3.66:1`.

**The bar is bounded from above by the readings, not only by its own rules**, which is the constraint that
shaped its final value. Being the lightest surface in the palette, it sets the floor every reading must
clear: `3 x (bar luminance + 0.05) - 0.05`. The first value bright enough to be unmistakable, `#9d0041`,
put that floor at `0.3265` and collapsed the three readings into a band too narrow to separate. `#800630`
puts it at `0.2480` and still leaves the bar the most prominent surface on the Calendar. The temptation to
keep brightening the bar is exactly the move that produced the second round of the same complaint, so the
reasoning is recorded here rather than left as a value someone will want to improve.

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
- **Lifting all three reading markers together, to the same lightness.** Rejected, and this is a different
  proposal from the one that shipped. Raising the markers by the same amount lifts the fill ceiling by
  about 1.6x but leaves the three readings _more_ alike, dropping their own separation to `0.197` under
  their `0.25` floor. Two accessibility rules in direct conflict, and this one should not give. Lifting
  one marker and then spacing the three across the headroom is the version that works; see "The cap was
  in the reading, not the fill".
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
- **The `Peak`/`High` pair is knowingly under the separation floor.** `0.231` against `0.25`, in the dark
  theme, held at a named `0.20` by an exception in the guard rather than by lowering the floor for
  everything. `Peak` was set at OKLab L `0.80` by the product owner after a sweep was rendered; clearing
  the floor needs it darker, at L `0.76` or below, which visibly pinks it down. → Accepted knowingly, and
  a test asserts the set of things under the real floor is exactly that one pair, so it cannot spread and
  a further regression on it still fails.
- **The window out-separates the `Before` fill by `0.0123`.** That is the thinnest margin in the palette
  and the one most likely to be eaten by a later well-meaning brightening. → The guard holds the rule, so
  it fails rather than passing quietly, but it is worth knowing before editing either value.
- **The separation floor is a poor proxy for legibility, and the guard is now documented as such.** OKLab
  distance sums hue with lightness into one figure, so a pair backed only by hue scores the same as one
  backed by lightness — and at 6px those are not the same thing. This is why a guard rule and a visual
  review disagreed about the same palette, and why the exception above was written rather than the metric
  being moved. Anyone treating a passing separation number as evidence that markers are tellable apart is
  reading the wrong thing.
- **`Before` and `After` are still the closest phase pair**, `0.131` apart against `0.057` where this
  started. Better, and still the weakest pair among the phases. → Accepted, guarded against regressing,
  and named here rather than left to be discovered. If it fails on a device the fix belongs in the summary
  or the legend, not in a fourth mark on every day.
- **Light mode has the same shape of problem and has not been fixed** — cream and mint, `0.062` apart, with
  the pale pink window among them. → Deliberate: the readings there are darker, so the numbers differ, all
  three pairs clear the floor, and nobody has reported it. Flagged for the device check.
- **The bar is intrinsically close to the `Before` tint in hue.** The two are told apart by shape long
  before hue — a full-height filled bar against a tinted day with nothing on it.
- **Dark's bar clears its worst reading by `0.66:1`** above the `3:1` floor, and that margin is set by the
  `Low` reading. → The guard asserts it and names which reading binds, so a later brightening is made
  against the right number.
- **Light mode's readings are closer together than dark's**, at `0.264`, `0.274` and `0.347`, because a
  mark on white has to clear 3:1 and the dark values that satisfy that crowd each other. → The guard's
  separation floor is per theme for this reason.
- **The `Low` reading against the `Before` fill sits at `3.00:1`**, which is the floor to two decimal
  places. It clears, and it leaves nothing for a later edit to either value.

## Migration Plan

Entirely presentational. No stored data, no schema, no persisted preference changes; the legend's
layer-visibility ids are unchanged. Rollback is a revert.

## Open Questions

None.

One decision this change was required to make and did: for most of its life it carried an unresolved
conflict — the readings were declared the one thing that must not move, and the quiet phases were the
thing that had to get lighter, and the two could not both hold because the readings were what capped the
fills. It was resolved by moving the readings, on lightness, within their existing hues, at the product
owner's direction and against the recommendation recorded here at the time. Recorded in "The cap was in
the reading, not the fill" so the reasoning survives; there is no open question left on it.
