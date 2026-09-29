# Proposal

## Why

Hiding a cycle in the comparison view's legend repaints every other cycle's bars, so the legend and the plotted data disagree. The labels and legend read a cycle's colour from the full set of selected cycles, while the bars read it from whatever survives hiding; the two only agree while nothing is hidden. The user-visible result is that a cycle the legend says is green is drawn blue, and the same happens to every row below the hidden one.

The defect was introduced when the view changed from a single overlaid chart (one list served both) to stacked rows, and the label lookup was deliberately re-pointed at the full set to keep the legend stable while the bar lookup was left pointing at the visible set. No test asserts a colour, so the half-fix went unnoticed.

## What Changes

- **A cycle's colour becomes a stable identity** derived from its position among **all logged cycles, newest first**, recomputed whenever the view reads the data. It is never stored on a cycle record, matching the project rule that nothing computed is persisted.
- **Hiding, resizing, or re-selecting the comparison no longer repaints any cycle.** Colour is anchored to the full logged set rather than the selected set, so all three controls that change which cycles are shown behave identically.
- **The palette grows from 8 to 12 entries**, matching the cycle-count control's maximum and removing the wrap-around that currently gives cycles 9-12 the colours of cycles 1-4.
- **The first six palette entries are made maximally mutually distinguishable**, measured rather than asserted. The weakest pair among the current first six scores a CIEDE2000 distance of 12.0; the replacement's weakest pair scores 28.8.
- **Colour identity becomes testable** by exposing the resolved colour on the rendered band, and asserting that a cycle's colour is invariant across hide, count change, and custom selection.
- **Unused comparison helpers carrying the same positional-index assumption are removed**, so the assumption is not reintroduced by the next person to reach for a shared helper.

Explicitly unchanged, both decided deliberately:

- The **fertile-window band stays neutral**. Tinting it per-cycle was rejected: the window's faintest neighbour is the unlogged-day track, and a colour wash behind it would nearly erase that track, which exists specifically to keep "no reading" distinct from "a short reading".
- The **day axis still rescales when a cycle is hidden**, re-measuring to the longest _visible_ cycle.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cycle-comparison`: the per-cycle colour treatment is currently required only to be "a distinct per-cycle visual treatment". It becomes a stable identity that is invariant under changes to which cycles are shown, derived from the full logged set rather than the selection, with a palette sized to the control's maximum and a measured separation floor for the first six entries.

## Impact

- `src/features/cycle-chart/comparison-chart.tsx` — the colour resolution and the three call sites that consume it.
- `src/features/cycle-chart/lib.ts` — the palette itself, and removal of the unreferenced comparison-data helpers.
- `src/features/cycle-chart/comparison.tsx` — supplies the full logged set that anchors colour.
- Tests in `src/features/cycle-chart/__tests__/`.
- A spec delta against `openspec/specs/cycle-comparison/spec.md`.

No engine change, no stored-data change, no migration, no backup-format change, and no new dependency. The change is confined to how the comparison view resolves and renders colour.
