# Proposal

## Why

In dark mode the three Calendar phase treatments — `Before`, `Fertile`, `After` — are hard to tell
apart, and the fertile block does not stand out. The day cell paints each phase as a full-tile
background fill, and in dark mode all three sit within `0.017` OKLab lightness of each other and
within about `0.1` of the page behind them. The fertile fill is very slightly _darker_ than the
`Before` fill, so the window recedes rather than standing out.

The reason a recolour appeared not to fix this is structural, and the structure turned out to be a
mis-framed constraint rather than a real limit. A monitor marker is painted inside the day cell, on top
of the fill, so every fill's lightness is bounded by the 3:1 rule the palette guard enforces. That rule
was being solved for the background alone: the background was treated as the thing with a limit, and the
marker as the thing to fit inside it. The 3:1 rule is a property of the **pair** — the marker and the
background together — and the background is only bounded by how _dark_ the darkest of the three readings
is. In the dark theme `Low` permitted `0.0435` relative luminance, and the fills sat at 19–22% of it. A
search across hue and lightness inside that cap reaches a worst-pair separation of `0.0616`, against
`0.0572` at the time, which is what made the cap look like a property of the palette rather than of one
colour choice.

**The binding reading is `Low`, not `Peak`.** That was recorded the other way round for most of this
change's life. Getting it backwards is exactly the error that lets a "make the window more obvious" edit
push a background past what a reading can survive, and it is why the guard now names the binding reading
in its failure message.

Lifting the `Low` reading raised what the rule permits a background to be, from `0.0435` to `1.0406` — at
which point the cap is no longer a constraint on anything. That single change freed the two phase fills
**and** the window bar, none of which had ever been near their own limits; all three were being held down
by the same dot. See design.md.

A first pass at this put a 4px band along the top edge of all three phases and fixed the reported
problem. It then failed a second test: a band is a horizontal line along a day's **top** edge and the
menses stripe is a horizontal line along the **bottom** edge of the day above, so across a week boundary
the two sit 8px apart and read as a single stripe. No adjustment to a band fixes that, because a band is
the same kind of mark as the stripe. The bands are therefore gone from every phase, and the window is
drawn as a **bar** instead.

## What Changes

- **All three phases keep a painted treatment, and nothing is dropped.** The two phases outside the
  window are identified by the tints they already had; the window is drawn as a **solid bar at full cell
  height**, so it is the only filled shape on the Calendar and the phases either side stay quiet. This is
  the shape every mainstream calendar uses for a multi-day span: a solid bar, rounded at the ends, no
  outline.
- **No day cell draws a line along its top edge, on any phase.** A strip there and the menses stripe at
  the bottom edge of the day above are 8px apart across a week boundary, where they read as a single
  mark — and a month of them is a great deal of line to read past.
- **The bar carries its own colour**, because a full-height shape at the cell tint's lightness is not a
  surface. In dark it is `#800630` at `0.0493` luminance, `0.2355` from the card against the Before fill's
  `0.2232`, and it clears the binding reading — **Low** — at `3.66:1`. In light the tint is already the
  loudest thing on a white page, so the bar and the tint are the same value there.
- **The bar is not as bright as it can be, and that is deliberate.** The bar is the lightest surface a
  reading marker is ever painted on, so its luminance sets the floor for all three markers: at the first
  value tried, `#9d0041` at `0.0755`, that floor was `0.3265` and squeezed the three readings into a band
  too narrow to tell apart. `0.0493` drops the floor to `0.2480` while the bar still out-separates the
  Before fill. A marker floor and a window that is loud enough to find are in tension, and the window
  yields, because a window you cannot read the readings inside is not a window.
- **The three monitor readings are spaced on lightness, not on hue.** They now sit at `0.31`, `0.44` and
  `0.47` luminance. The reported symptom was that `Low` and `Peak` read alike while `High` did not, and
  the cause is measurable: all three had been within `0.04` of each other in OKLab lightness, so hue was
  carrying all of it, and at the size the legend draws a marker two marks of equal lightness read as one
  however far apart their hues. Saturation could not have fixed it — all three were within `0.02` of the
  sRGB gamut edge.
- **The window's mark cannot be confused with the menses stripe**, which stays where it is, in its own
  colour, at its own width. A filled bar and a stroke are different kinds of mark.
- **The bar spans the gap between days** wherever the window continues across it, so a run of days is
  one solid shape with nothing showing through -- and it **never fills the gap between weeks**, because
  the row gap is what makes the calendar's rows legible and the window is read within them.
- **Every day is positioned by where it sits in the grid**, not by counting the days before it, so a
  month padded with leading blank days is shaped the same as one that is not.
- **The window's two ends are the only rounded ends in it**, and a row that merely opens or closes inside
  the window stays square, so the run's ends are legible as its ends.
- A run that wraps weeks is **two runs**, because the last day of one row is in the final column and
  the next is in the first. The bar does not pretend to join them.

- **The three legend phase keys are the same size.** The window's key was drawn taller to signal that its
  day-cell mark is a bar, which read as a claim about importance rather than about the shape — on the one
  key most often compared against its two neighbours. The keys are compared by colour, and a difference
  the eye has to search for is not doing the work of one it can see.
- The Cycle-chart fertile window is aligned to the same hue.
- The palette guard keeps the marker and text rules, **gains** rules for the bar, and reads its values
  from the stylesheet instead of hand-copying them. It also checks only the readings that can actually
  land on each surface, and it treats a commented-out token as absent.

Not in scope: any change to the engine, the window computation, or the status semantics; the Status
view's badges, which show the precise status and must keep four distinguishable treatments; the
menses stripe; the instructor surfaces; the meaning of the three legend entries. **The monitor readings
were originally out of scope too and moved into it** — they turned out to be the constraint holding the
fills down, so lightening them was the only route to the fills the review asked for. They moved on
lightness and hue-preserving terms; their shape, their size, and what they mean are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fertility-visuals`: a status treatment is a fill bounded in lightness by the darkest reading marker
  painted on it, and a bound that tight is why fills could not previously distinguish the statuses from
  one another. The window is therefore not a fill but a bar spanning the whole day — a surface like a
  fill, held to the same marker rules, and told from the page and the neighbouring fills by colour
  distance rather than by a contrast ratio. No surface adds a strip or stroke along a cell edge to make
  the distinction instead. The three readings are told apart on lightness, and the two that a single
  review found hard to read are now separated by more than `0.24` of luminance.
- `calendar`: the day cell paints a tint for the two quiet phases and a bar for the window; the bar's
  shape is derived from the whole month with every day positioned rather than counted; the bar spans day
  gaps and never week gaps; the window's two true ends are the only rounded ones; and the legend shows
  each phase's colour at a size that lets the three be compared directly.

## Impact

- `src/index.css` — a window token in both themes; the chart window hue.
- `src/lib/fertility-visuals.ts` — a bar class on the fertile phase, and the window colour the Calendar
  paints a window day in.
- `src/features/calendar/day-cell.tsx` — paints the bar and shapes the run's ends.
- `src/features/calendar/grid.ts` — the window's two end days, and `windowEdgesByDay`, which derives
  every day's bar shape from the whole displayed month.
- `src/features/calendar/layers.ts` — the bar as a first-class paint slot; the legend swatch, and one
  shared footprint for all three phase keys.
- `scripts/__tests__/fertility-palette.test.mjs` — rewritten guard: reads the stylesheet, asserts the
  markers, the text, and the bar.
- `src/core/engine/__tests__/marquette.test.ts` — asserts the engine invariant the guard's per-surface
  reading check now rests on: a pre-fertile day can only hold a `Low` reading or none, so it never needs
  to be checked against the `High` and `Peak` fills it cannot be painted on.

No new dependencies. **No engine change** — the added engine test asserts behaviour the engine already
had. No data-model or storage change. The menses stripe is untouched: its position, shape, and colour are
as they were. The reading markers keep their shape and size and change only in lightness.
