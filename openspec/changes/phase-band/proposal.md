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

## What Changes

- **Every phase keeps a painted treatment**, and all three are identified by a **band along the top
  edge of the day** in that phase's full-chroma colour. The band is not painted beneath a marker, so
  the marker cap does not apply to it and it is free of the constraint that caps the fills. Worst-pair
  separation goes from `0.0572` to `0.2118` in dark mode and `0.1721` in light.
- **The tiles stay dark.** A marker's contrast on its own tile is unchanged, so nothing about reading
  legibility is traded for the band.
- **The fertile band is the most prominent of the three**, and the fertile window is marked at its
  ends by shaping the band, not by adding a separate mark.
- The band spans the grid gap so consecutive same-phase days read as one continuous run.
- The Cycle-chart fertile band is aligned to the same hue.
- The palette guard keeps the marker and text rules, **gains** rules for the bands, and reads its
  values from the stylesheet instead of hand-copying them.

Not in scope: any change to the engine, the window computation, or the status semantics; the Status
view's badges, which show the precise status and must keep four distinguishable treatments; the
instructor surfaces; the meaning of the three legend entries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fertility-visuals`: each status treatment is composed of a fill and a band with different
  obligations. The band is the element that distinguishes the statuses and is mutually separable; the
  fill is not, because a marker is painted on it. The contrast requirement changes accordingly.
- `calendar`: the day cell paints a band for every phase, marks the fertile run's ends by shaping the
  band, and the legend shows the band.

## Impact

- `src/index.css` — per-phase band tokens in both themes; the chart band hue.
- `src/lib/fertility-visuals.ts` — a band class on each status visual and on each Calendar phase.
- `src/features/calendar/day-cell.tsx` — paints the band and shapes the fertile run's ends.
- `src/features/calendar/grid.ts` — the fertile window's two end days, for the shaping.
- `src/features/calendar/layers.ts` — the band as a first-class paint slot; the legend swatch.
- `scripts/__tests__/fertility-palette.test.mjs` — rewritten guard: reads the stylesheet, asserts the
  markers, the text, and the bands.

No new dependencies. No engine change. No data-model or storage change. No change to the tile fills,
so nothing about the reading markers moves.
