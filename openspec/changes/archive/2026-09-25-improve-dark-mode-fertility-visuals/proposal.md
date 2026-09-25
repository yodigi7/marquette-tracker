# Proposal

## Why

Issue #8 identifies a real readability and differentiation problem in the existing fertility visuals: Calendar, Status, Cycle chart, and History/Stats use separate hard-coded light-theme colors and mappings, while dark mode is already a supported presentation. The result is inconsistent contrast and ambiguity between raw readings, derived status, confirmed versus predicted information, forecasts, and inferred data. A shared, theme-aware visual language is needed before these surfaces grow further.

## What Changes

- Add a semantic fertility-visual palette and reusable state-to-style mapping for light and dark themes.
- Make Calendar day cells and the Calendar legend theme-aware while preserving the four existing derived statuses, recorded-only status shading, forecast treatment, raw-data markers, and the assumed-data marker introduced by #2.
- Make Status badges, source indicators, explanatory text, and forecast text readable in both themes.
- Make the existing Cycle chart monitor bands, empty track, fertile-window reference area, legend, and overlay markers theme-aware. Keep the chart's current structure: monitor bands plus one fertile-window overlay; do not add per-day status bands.
- Make the History/Stats Forecast panel, predicted badge, fertility/period values, warnings, and related stat text theme-aware without changing its calculations or normal algorithm-on layout; when interpretation is disabled, honor the existing logging-only contract by hiding computed forecast/fertility summaries.
- Add subtle non-color cues where they improve differentiation, especially for confirmed/predicted/forecast information and inferred data.
- Define contrast and visual-distinguishability requirements for text, markers, borders, and graphical state boundaries.
- Add automated coverage for state-to-style mappings where practical and documented manual checks across light/dark themes and narrow/wide viewports.
- Preserve Marquette calculations, forecast derivation, status semantics, raw-data visibility, algorithm-off behavior, and the existing light-mode presentation as the behavioral baseline.

## Capabilities

### New Capabilities

- `fertility-visuals`: Cross-surface semantic fertility palette, cue precedence, contrast targets, and shared light/dark visual language.
- `cycle-chart`: Theme-aware presentation of the existing monitor strip, fertile-window overlay, legend, and optional overlays without changing the chart model.
- `history`: Theme-aware and visibly predictive presentation of forecast and fertility statistics.

### Modified Capabilities

- `calendar`: Extend Calendar status-cell, source/forecast, marker, and legend behavior with theme-aware, accessible visual states while preserving the existing day-entry and algorithm contracts.
- `status`: Extend read-only status presentation with theme-aware status/source/forecast treatments and readable explanatory text.

## Impact

- Theme tokens and shared visual mappings: `src/index.css` and/or a small shared feature utility.
- Calendar presentation and tests: `src/features/calendar/day-cell.tsx`, `src/features/calendar/index.tsx`, and related tests.
- Status presentation and tests: `src/features/status/lib.ts`, `src/features/status/status-card.tsx`, and related tests.
- Cycle-chart presentation and tests: `src/features/cycle-chart/strip-chart.tsx`, `src/features/cycle-chart/index.tsx`, and related tests.
- History presentation and tests: `src/features/history/index.tsx` and related tests.
- The change must coordinate with the completed/in-flight post-Peak-fill work so the assumed-data marker and normal Low marker remain distinct from derived fertility styling.
- No changes to the pure Marquette engine, persisted data model, forecast calculations, storage, backend, or dependencies are expected.
