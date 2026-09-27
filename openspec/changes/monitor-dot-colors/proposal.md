# Proposal

## Why

The Low, High, and Peak monitor reading markers are hard to tell apart on the Calendar, most
notably Low from Peak. The three current colors differ in hue but sit at nearly the same
lightness, so at the 10px dot size the eye reads them as the same mark in a slightly different
tint. Measuring perceptual separation, Low-to-Peak is 0.198 in light mode and 0.158 in dark
mode, the weakest of the three pairs in both themes.

The same measurement surfaced a second problem: the current light-mode Low dot sits at 2.90:1
against the light "Fertile" phase fill, below the 3:1 floor that the `fertility-visuals`
capability already requires of markers. The palette is under-specified in a way that let that
drift, and no test guards the values.

## What Changes

- Recolor the three monitor reading markers to a **cool -> warm -> hot** progression (teal,
  orange, magenta) chosen so the readings are mutually distinguishable at dot size and each one
  clears the 3:1 marker-contrast floor against every Calendar phase fill in its theme.
- Dark-mode Lightness now carries part of the progression; light-mode distinction is carried by
  hue, because the 3:1 floor against the light "Fertile" fill compresses all three into a narrow
  band. This is stated rather than papered over.
- Fix the pre-existing light-mode Low contrast violation as part of the same edit.
- Add a regression test that asserts the 3:1 floor for all three readings against every Calendar
  phase fill in both themes, so the palette cannot silently drift out of compliance again.
- **No** change to the data model, the engine, the marker shapes, the legend, or the accessible
  text that names each reading.

The Cycle chart's multi-cycle comparison view is deliberately untouched: it encodes readings by
block height plus opacity and does not consume the monitor color tokens, so it is unaffected.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `fertility-visuals`: The contrast requirement currently says markers must clear 3:1 "against
  adjacent colors" without saying which colors are adjacent to a monitor marker. This change
  makes explicit that the set is every Calendar phase fill the marker can be painted on, and adds
  the requirement that the three monitor readings be mutually distinguishable at marker size,
  since the pair the user reported (Low versus Peak) is not covered by the requirement as written.

## Impact

- `src/index.css`: the six `--fertility-monitor-{low,high,peak}` custom properties, in both the
  light and dark blocks. Token names are unchanged, so no class name, component, or call site
  moves.
- Surfaces affected: the Calendar day cell and legend swatch, and the single-cycle Cycle chart
  band plus its legend. Both read the same tokens, so they change together by construction.
- Tests: one new test file asserting contrast compliance for the palette. Existing tests assert
  class names rather than color values, so they are unaffected.
- No new dependency. No engine, schema, or backup-format change, so stored data and restore
  compatibility are untouched.
