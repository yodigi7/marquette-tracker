# Proposal

## Why

The cycle chart shows one cycle at a time, so cross-cycle comparison — the core of the Marquette calendar rule (earliest/latest Peak of the last 6 cycles) — is only available as a summary range in History. Users cannot see cycles against each other to understand why the range is what it is. This change adds a multi-cycle overlay chart aligned by cycle day.

## What Changes

- Add a **Cycle comparison** view at `/cycle-compare` that overlays multiple cycles on a single chart, aligned by cycle day (day 1..longest).
- Each cycle's monitor band (Low/High/Peak) and fertile-window band render with a per-cycle visual treatment so cycles are distinguishable where they overlap.
- Shorter cycles pad to the longest cycle in the set so day columns line up.
- A user-selectable count (default = configured `historyWindow`) controls how many recent cycles participate; the user can also pick specific cycles.
- Hover/focus on a band identifies its cycle (cycle number and length).
- The algorithm toggle is respected: with interpretation disabled, no window bands render.
- Reuses the existing Recharts-based chart component and the existing fertility visual language — no new dependency, no charting-library change.
- Handles zero cycles, a single cycle, and an open-cycle-only set without errors or an empty shell.

## Capabilities

### New Capabilities

- `cycle-comparison`: Multi-cycle overlay chart aligned by cycle day, with per-cycle visual distinction, hover identification, algorithm-toggle respect, and empty/single-cycle handling.

### Modified Capabilities

None. The single-cycle chart behavior is unchanged; the comparison is a new view that reuses the existing chart component and visual language.

## Impact

- **New files**: `src/features/cycle-chart/comparison.tsx`, `src/features/cycle-chart/comparison-chart.tsx`, and their tests.
- **Modified files**: `src/features/cycle-chart/index.tsx` (add comparison entry point), `src/features/cycle-chart/lib.ts` (add comparison helpers), `src/App.tsx` (add route). The single-cycle `StripChart` and `CycleChartView` behavior is unchanged.
- **No engine changes**: All bands shown are already derived output per cycle.
- **No new dependencies**: Reuses Recharts and existing visual tokens.
