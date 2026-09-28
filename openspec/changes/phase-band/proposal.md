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

A first pass at this put the same kind of mark on all three phases and fixed the reported problem. It
then failed a second test: a band is a horizontal line along a day's **top** edge and the menses stripe
is a horizontal line along the **bottom** edge of the day above, so across a week boundary the two sit
8px apart and read as a single stripe. No adjustment to a band fixes that, because a band is the same
kind of mark as the stripe. The window is therefore drawn as a **bar** instead.

## What Changes

- **Every phase keeps a painted treatment.** The two phases outside the window are identified by a
  **band along the top edge of the day**; the window is drawn as a **solid bar at full cell height**, so
  it is the only filled shape on the Calendar and the phases either side of it stay quiet. Worst-pair
  separation of the quiet phases' bands goes from `0.0572` to `0.2118` in dark mode and `0.1721` in
  light. This is the shape every mainstream calendar uses for a multi-day span: a solid bar, rounded at
  the ends, no outline.
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

- The Cycle-chart fertile band is aligned to the same hue.
- The palette guard keeps the marker and text rules, **gains** rules for the bands and the bar, and
  reads its values from the stylesheet instead of hand-copying them.

Not in scope: any change to the engine, the window computation, or the status semantics; the Status
view's badges, which show the precise status and must keep four distinguishable treatments; the
menses stripe; the instructor surfaces; the meaning of the three legend entries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fertility-visuals`: each status treatment is composed of parts with different obligations. A band is
  the element that distinguishes the quiet statuses and is mutually separable; the fill is not, because a
  marker is painted on it. The window is drawn as a bar, which is a surface like a fill and is held to
  the marker rules, and is told from the page and the neighbouring fills by colour distance rather than
  by a contrast ratio.
- `calendar`: the day cell paints a band for the two quiet phases and a bar for the window; the bar's
  shape is derived from the whole month with every day positioned rather than counted; the bar spans day
  gaps and never week gaps; the window's two true ends are the only rounded ones; and the legend shows
  each phase's actual mark.

## Impact

- `src/index.css` — per-phase band tokens in both themes and a bar token for the window; the chart band
  hue.
- `src/lib/fertility-visuals.ts` — a band class per status and phase, and a bar class on the fertile
  phase.
- `src/features/calendar/day-cell.tsx` — paints the band and the bar, and shapes the run's ends.
- `src/features/calendar/grid.ts` — the window's two end days, and `windowEdgesByDay`, which derives
  every day's bar shape from the whole displayed month.
- `src/features/calendar/layers.ts` — the band and the bar as first-class paint slots; the legend
  swatch and each phase key's footprint.
- `scripts/__tests__/fertility-palette.test.mjs` — rewritten guard: reads the stylesheet, asserts the
  markers, the text, the bands, and the bar.

No new dependencies. No engine change. No data-model or storage change. No change to the tile fills or
to the menses stripe, so nothing about the reading markers or the recorded menses cue moves.
