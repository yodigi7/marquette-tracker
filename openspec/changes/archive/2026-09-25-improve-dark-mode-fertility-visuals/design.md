# Design

## Context

See `proposal.md` for motivation and the capability deltas under `specs/` for the behavioral contract.

The current app already supports light/dark/system themes through a class-based provider, but the fertility surfaces maintain independent hard-coded color maps. `src/index.css` defines the global shadcn theme tokens only; Calendar status fills, the Calendar legend, Status badges, Recharts fills, and History text each use their own light-oriented classes or literal colors. This makes contrast and legend synchronization a cross-feature concern.

The existing data model has four derived day statuses and a separate `confirmed`/`predicted` source. Calendar forecast cells are currently a separate future-window cue, and the post-Peak-fill change in the current working tree adds an inferred-data marker while retaining the normal stored Low marker. Those are separate visual dimensions and must not be collapsed into one status color.

The Cycle chart intentionally renders monitor-reading bands and one fertile-window reference area; it does not currently render per-day pre-fertile/post-peak/post-calendar bands. The History view renders forecast and derived statistics, but currently does not read the algorithm-enabled setting even though the app-wide settings contract requires computed interpretation to be hidden when interpretation is off.

## Goals / Non-Goals

**Goals:**

- Establish one semantic, theme-aware vocabulary for status, source, forecast, raw markers, provenance, warnings, and chart overlays.
- Keep the existing Calendar behavior: only recorded days receive derived status fills, while unlogged future cells retain the predictive outline.
- Make Status, Cycle chart, and History/Stats readable in both themes without changing their underlying calculations.
- Preserve the current Cycle chart model and the #2 inferred-data marker.
- Make legends and visual mappings share one source of truth.
- Provide deterministic cue precedence and testable contrast/manual-verification criteria.
- Honor the global algorithm-off contract in History/Stats as well as the other surfaces.

**Non-Goals:**

- No changes to Marquette begin/end rules, status calculation, forecast derivation, placement, or persisted data.
- No new fertility status categories, user-selectable palette, or chart status-band layer.
- No redesign of the Calendar layout, Status information architecture, chart geometry, or History table beyond the required display guard and theme treatment.
- No new runtime dependency or visual-regression framework.

## Decisions

### 1. Use semantic theme tokens plus a typed shared mapping

Extend the global theme with semantic CSS custom properties for the visual roles that recur across features: status fills/foregrounds/borders, predicted/confirmed cues, forecast/window fills and borders, raw monitor/menses/intercourse markers, provenance, muted text, and warning text. Expose the tokens through the existing Tailwind theme configuration so DOM classes remain consistent with the current Tailwind v4 setup.

Add a small shared presentation module (under `src/lib/`) containing typed mappings from `DayStatus` and the existing source/monitor values to token names. The module may also own shared class fragments and legend labels, but it must not import React, Dexie, or engine computation code. Exact hue values are selected during implementation against the contrast requirements; the semantic roles and mappings are fixed by the specs.

Use the same CSS variables in Recharts SVG presentation attributes (`fill`/`stroke`) instead of duplicating light and dark JavaScript color maps. This keeps the browser's active theme as the single source of truth and avoids a second theme-state subscription in the chart.

Alternative considered: add `dark:` variants independently to every existing component. Rejected because it preserves the current duplication that caused the legends and surfaces to drift, and it makes future Week view support likely to grow a second palette.

### 2. Compose visual layers with deterministic precedence

The Calendar and shared visual contract use the following order:

```text
base/unlogged cell
        |
        v
derived status fill (recorded + interpretation enabled)
        |
        v
source or forecast border/pattern
        |
        v
today ring and other orthogonal state cues
        |
        v
raw-data markers
        |
        v
inferred-data provenance marker
```

Recorded status fills are never added to unlogged dates. A future forecast cell uses the forecast border/pattern without a derived status fill. A recorded cell may show a source cue and raw markers at the same time; the source cue does not change the status label. The inferred-data marker is additive and does not replace the normal Low marker or change the derived status color.

This precedence keeps the current Calendar semantics while allowing the same tokens to be reused by Status, chart legends, and future calendar layouts.

### 3. Integrate each surface without changing its information model

- **Calendar:** Replace the private light-only status class map and duplicate legend classes with the shared mapping. Add the missing `post-calendar` legend state and make source/forecast/provenance samples use the same border, line, and marker definitions as day cells. Preserve the current blank behavior for unlogged days and the existing `data-status`, `data-source`, `data-forecast`, and provenance attributes for testing and accessibility.
- **Status:** Use the shared status/source tokens for the status badge and source/forecast cues. Replace light-only explanatory text colors with theme-aware semantic text tokens. Preserve the existing labels and the logging-only branch.
- **Cycle chart:** Keep `StripModel`, monitor-band geometry, overlay series, and the single fertile-window reference area unchanged. Apply tokenized fills/strokes to the existing bands, empty track, BBT/mucus/intercourse markers, and reference area. Preserve solid versus dashed window cues and the accessible window metadata. Do not add derived-status bands.
- **History/Stats:** Apply the shared text, warning, predicted-badge, and forecast-value tokens. Read `algorithmEnabled` at the view boundary: when off, render the existing logging-only explanation and suppress computed forecast/fertility/peak summaries while retaining non-interpretive logged cycle information. Re-enabling restores the existing derived panels without data migration.

The History display guard is a presentation alignment with the existing app-settings requirement, not a new interpretation mode. It prevents this change from making previously hidden computed output look newly authoritative in a differently styled panel.

### 4. Test the mapping and observable surface contracts

Add table-driven unit tests for the shared status/source/marker mapping before wiring component styles. Add component tests for:

- all four Calendar statuses, source/forecast cues, post-calendar legend coverage, inferred markers, and algorithm-off raw-marker behavior;
- Status badge/source/forecast readability classes and logging-only behavior;
- chart monitor/empty/overlay tokens, confirmed/predicted window line styles, unknown ends, and algorithm-off behavior;
- History forecast/stat text, predictive labeling, and the algorithm-off/re-enable display guard.

JSDOM can verify semantic classes, attributes, and conditional rendering but cannot prove rendered contrast. Add a documented manual matrix for light/dark themes, narrow and wide viewports, all status/source/forecast combinations, algorithm on/off, and the #2 inferred-data case. No new visual-test dependency is required.

### 5. Keep the change reusable for the planned Week view

The shared mapping and `DayCell` styling boundary must remain independent of Month-grid layout. The future Month/Week change can consume the same status/source/forecast/provenance mapping rather than introducing a second palette or interpretation path. This change does not implement Week view.

## Risks / Trade-offs

- **Translucent fills may pass visually but fail contrast in dark mode** -> Prefer explicit light/dark token pairs and verify actual adjacent backgrounds manually; use borders or patterns where a translucent fill cannot meet the target.
- **Recharts SVG colors may not resolve consistently from CSS variables** -> Keep token names centralized, add DOM-level tests for the supplied values, and manually verify the rendered chart in both themes before considering a small theme-value adapter.
- **Too many hues could make a narrow calendar noisy** -> Use one primary fill per status and reserve borders, line styles, and marker shapes for source/forecast/provenance; verify the narrow viewport matrix.
- **The #2 inferred marker could be mistaken for a new status category** -> Keep the marker additive, retain the normal Low marker, and add a regression test for the assumed-data state.
- **History's algorithm-off guard changes which panels are visible** -> Treat it as a required consistency fix, cover off/on transitions in tests, and keep raw cycle data available.
- **Existing light-mode presentation may shift while tokens are introduced** -> Capture representative light-mode states before changing mappings and include light-mode checks in the manual matrix; do not intentionally redesign layouts.

## Migration Plan

1. Add the semantic theme tokens and shared typed visual mapping, with table-driven mapping tests.
2. Update Calendar and its legend first, then Status, preserving the #2 provenance marker and existing data attributes.
3. Update Cycle chart SVG/marker colors and legend without changing `StripModel` or window calculations.
4. Update History/Stats tokens and add the algorithm-off display guard/re-enable regression coverage.
5. Document the manual contrast and viewport matrix, then run `pnpm test`, `pnpm lint`, and `pnpm build`.

There is no data migration. Rollback is a presentation-only revert of the token/mapping and component changes; persisted records, engine output, and forecasts remain untouched.
