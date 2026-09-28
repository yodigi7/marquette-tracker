# Proposal

## Why

In dark mode the three Calendar phase treatments — `Before`, `Fertile`, `After` — are hard to tell
apart, and the fertile block does not stand out. The day cell paints each phase as a full-tile
background fill, and in dark mode all three sit within `0.017` OKLab lightness of each other and
within about `0.1` of the page behind them. The fertile fill is very slightly _darker_ than the
`Before` fill, so the window recedes rather than standing out.

The reason a recolour cannot fix this is structural. A monitor marker is painted inside the day cell,
on top of the fill, so every fill's lightness is capped by the 3:1 rule the palette guard enforces. In
the dark theme the cap is `0.0922` relative luminance, set by the `Peak` reading, and the current
fills sit at 19–22% of it. A search across hue and lightness for the best three-phase palette that
obeys that cap reaches a worst-pair separation of `0.0616` — against `0.0572` today. Three tinted
fills cannot be told apart in dark mode; that is a property of the constraint, not of the values
chosen.

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
  surface. In dark it is a `0.209` OKLab lightness step above the page against the tint's `0.106`, taken
  as far as the reading markers allow: the binding reading is **Low**, at `0.0435` luminance, not the
  Peak, and the bar stops short of that at `0.0382` with `3.18:1`. In light the tint is already the
  loudest thing on a white page, so the bar and the tint are the same value there.
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

- The Cycle-chart fertile window is aligned to the same hue.
- The palette guard keeps the marker and text rules, **gains** rules for the bar, and
  reads its values from the stylesheet instead of hand-copying them.

Not in scope: any change to the engine, the window computation, or the status semantics; the Status
view's badges, which show the precise status and must keep four distinguishable treatments; the
menses stripe; the instructor surfaces; the meaning of the three legend entries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fertility-visuals`: a status treatment is a fill, and a fill is capped in lightness by the reading
  marker painted on it, so fills cannot distinguish the statuses from one another. The window is therefore
  not a fill but a bar spanning the whole day — a surface like a fill, held to the same marker rules, and
  told from the page and the neighbouring fills by colour distance rather than by a contrast ratio. No
  surface adds a strip or stroke along a cell edge to make the distinction instead.
- `calendar`: the day cell paints a tint for the two quiet phases and a bar for the window; the bar's
  shape is derived from the whole month with every day positioned rather than counted; the bar spans day
  gaps and never week gaps; the window's two true ends are the only rounded ones; and the legend shows
  each phase's actual mark.

## Impact

- `src/index.css` — a window token in both themes; the chart window hue.
- `src/lib/fertility-visuals.ts` — a bar class on the fertile phase, and the window colour the Calendar
  paints a window day in.
- `src/features/calendar/day-cell.tsx` — paints the bar and shapes the run's ends.
- `src/features/calendar/grid.ts` — the window's two end days, and `windowEdgesByDay`, which derives
  every day's bar shape from the whole displayed month.
- `src/features/calendar/layers.ts` — the bar as a first-class paint slot; the legend swatch, and each
  phase key's declared footprint.
- `scripts/__tests__/fertility-palette.test.mjs` — rewritten guard: reads the stylesheet, asserts the
  markers, the text, and the bar.

No new dependencies. No engine change. No data-model or storage change. No change to the tile fills or
to the menses stripe, so nothing about the reading markers or the recorded menses cue moves.
