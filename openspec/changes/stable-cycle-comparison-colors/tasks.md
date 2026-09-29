# Tasks

## 1. Palette

- [x] 1.1 Replace `CYCLE_COLORS` in `src/features/cycle-chart/lib.ts` with the twelve-colour palette in `design.md`, ordered so the first six are the measured set, and keep the exported name and array shape. Verify the export still resolves and the file type-checks.
- [x] 1.2 Add a pure CIEDE2000 colour-distance helper beside the palette with no new dependency, plus a test asserting the first six entries clear a floor of 25 and that the weakest consecutive pair across all twelve is well clear of it. Verify `pnpm test` passes, and that lowering the floor below the measured value fails the test.
- [x] 1.3 Add a test asserting all twelve entries are distinct and that the palette length is at least the comparison view's maximum cycle count, so a full-size selection can never repeat a colour. Verify `pnpm test` passes.

## 2. Colour resolution

- [x] 2.1 Add a `colorByCycleId` resolver in the cycle-chart lib that maps every logged cycle, newest first, to a palette colour, and have the comparison view pass the full logged set to the chart. Verify a test covering a five-cycle set resolves the newest cycle to the first palette colour and the oldest to the fifth.
- [x] 2.2 Change the chart to take the resolved map and use it for the row label swatch, the legend swatch, and the plotted band fill, removing every index-based colour lookup including `models.indexOf`. Verify the three call sites read the same value by asserting a row label, its legend entry, and one of its bands all report the same colour.
- [x] 2.3 Expose the resolved colour on the rendered band as an attribute. Verify the attribute is present and matches the label and legend swatch for a given cycle.

## 3. Invariance

- [x] 3.1 Add tests asserting a cycle's colour is unchanged when another cycle is hidden via the legend, when the cycle count is changed, and when cycles are hand-picked in custom mode. Verify each fails against the pre-change behaviour and passes now.
- [x] 3.2 Add a test asserting the same logged cycles produce the same colours on re-read, covering the derived-at-read-time requirement with no stored value involved. Verify `pnpm test` passes.

## 4. Cleanup and neutrality

- [x] 4.1 Remove the unreferenced `buildComparisonData`, `ComparisonBand`, and `ComparisonDayDatum` from the cycle-chart lib. Verify no references remain anywhere in `src/` and that `pnpm build` type-checks.
- [x] 4.2 Confirm the fertile-window band still renders in a single neutral treatment for every cycle and is unchanged by this work, with the unlogged-day track still distinguishable against it. Verify by test that the band carries no cycle colour and that an unlogged day still renders its track within a window band.

## 5. Gates

- [x] 5.1 Run `pnpm check` and `openspec validate --all` and confirm both are clean. Verify the full gate output shows format, lint, test, and build all passing.
