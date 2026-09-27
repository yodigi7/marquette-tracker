# Design

## Context

The existing cycle chart (`/cycle/:cycleId`) renders one cycle at a time using a Recharts `ComposedChart` with a `Bar` series for monitor bands and a `ReferenceArea` for the fertile window. The `StripModel` in `lib.ts` captures a single cycle's days and window. The comparison view reuses this model and the same Recharts stack — no new charting library, no engine changes.

## Goals / Non-Goals

**Goals:**

- Overlay 2+ cycles on one chart aligned by cycle day
- Per-cycle visual distinction where bands overlap
- Hover/focus identification of individual cycles
- Configurable cycle selection (recent N or custom)
- Algorithm-toggle respect (no window bands when disabled)
- Graceful empty/single-cycle handling

**Non-Goals:**

- No averaged or blended window across cycles
- No new engine output — all bands are existing derived output
- No new dependency or charting-library change
- No replacement for the per-cycle chart or its overlay settings

## Decisions

### Decision 1: Per-cycle color palette with opacity-graded monitor levels

Each cycle in the comparison gets a color from a fixed palette of 8 distinguishable hues. Within a cycle, monitor levels are distinguished by opacity: `none` at 0.15, `low` at 0.35, `high` at 0.65, `peak` at 1.0. The fertile-window band uses the cycle's color at 0.12 fill opacity and 0.4 border opacity.

**Rationale:** This preserves the relative meaning of monitor levels (darker = stronger reading) while making cycles distinguishable by hue. The palette colors are chosen to work in both light and dark themes.

**Alternatives considered:**

- _Per-cycle opacity only_ (all cycles same hue, different opacity): rejected because with up to 12 cycles, opacity alone is not distinguishable enough.
- _Per-cycle stroke patterns_ (solid, dashed, dotted): rejected because patterns are hard to distinguish at small band sizes and add visual noise.
- _Keep monitor colors, add per-cycle border_: rejected because borders on small bands are hard to see and don't help with window band distinction.

**Assumption (load-bearing):** The per-cycle color palette with opacity-graded monitor levels is visually distinguishable enough for the user to tell cycles apart. This affects what the user sees on screen. If the user finds the colors insufficiently distinct, the palette can be adjusted without changing the architecture.

### Decision 2: Comparison chart as a separate component reusing Recharts

A new `CycleComparisonChart` component renders the overlay. It uses the same Recharts `ComposedChart`, `Bar`, and `ReferenceArea` primitives as the existing `StripChart`, but accepts an array of `StripModel`s instead of a single model.

**Rationale:** Reuses the existing charting stack and visual language. The single-cycle `StripChart` is unchanged.

**Alternatives considered:**

- _Extend `StripChart` with an overlay mode_: rejected because the single-cycle and comparison rendering logic differ enough (multiple bar series, multiple reference areas, custom tooltip) that a separate component is cleaner.
- _New charting library_: rejected by the issue's non-goal.

### Decision 3: Cycle selection with "Recent N" default and custom multi-select

The comparison view has two modes:

1. **Recent N** (default): a number input (1–12) controlling how many of the most recent cycles to show. Defaults to the configured `historyWindow`.
2. **Custom**: a checkbox list of all cycles, letting the user pick specific ones.

**Rationale:** The "Recent N" mode satisfies the acceptance criterion (default = historyWindow, N user-selectable). The custom mode satisfies the scope requirement ("allow choosing which cycles participate").

**Assumption (routine):** The two-mode selection UI is the simplest approach that satisfies both the acceptance criteria and the scope. A more sophisticated UI (drag-to-reorder, etc.) is not needed for MVP.

### Decision 4: Hover identification via Recharts custom tooltip

A custom tooltip component shows the cycle number, length, and monitor reading when the user hovers over a band. Keyboard focus uses the same information via an accessible label.

**Rationale:** Recharts' built-in tooltip mechanism is the standard way to show additional information on hover. It reuses the existing charting stack.

**Assumption (routine):** The custom tooltip is sufficient for cycle identification. A more sophisticated mechanism (e.g., highlighting the entire cycle on hover) is not needed for MVP.

### Decision 5: Route and navigation

New route `/cycle-compare` renders the comparison view. A link from the History view and the cycle chart header navigates to it.

**Rationale:** A dedicated route keeps the comparison view separate from the single-cycle chart, preserving the existing `/cycle/:cycleId` behavior.

**Assumption (routine):** The route path `/cycle-compare` is clear and doesn't conflict with existing routes.

## Risks / Trade-offs

- **[Risk]** Per-cycle colors may be hard to distinguish for users with color-vision deficiency. → **Mitigation:** The opacity grading within each cycle provides a secondary visual cue. A future improvement could add pattern or shape differentiation.

- **[Risk]** With many cycles (up to 12), the chart may become cluttered. → **Mitigation:** The default is the configured `historyWindow` (typically 6), and the user can reduce N. The chart is horizontally scrollable.

- **[Trade-off]** The comparison chart does not show overlays (mucus, BBT, intercourse) from the single-cycle chart. → **Rationale:** The issue's scope is monitor bands and fertile-window bands. Adding overlays would clutter the comparison. This can be added later if needed.

## Migration Plan

No migration needed. The comparison view is additive; existing data and behavior are unchanged.

## Open Questions

None. All decisions are resolved.
