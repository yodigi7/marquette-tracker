# Tasks

## 1. Shared fertility visual foundation

- [x] 1.1 [P] Add table-driven tests in `src/lib/__tests__/fertility-visuals.test.ts` for mappings covering all four `DayStatus` values, confirmed/predicted source cues, forecast cues, monitor/menses/intercourse markers, inferred provenance, warning text, and light/dark token roles; run the targeted test to establish the expected failures.
- [x] 1.2 Add semantic fertility color/text/border custom properties for `:root` and `.dark` in `src/index.css`, expose them through the existing Tailwind theme configuration, and verify the generated theme variables compile with `pnpm exec tsc -b` and the production CSS build path.
- [x] 1.3 Add the typed shared presentation mapping in `src/lib/fertility-visuals.ts` without React, Dexie, browser, or engine imports; run `src/lib/__tests__/fertility-visuals.test.ts` and verify every status/source/marker role maps deterministically.

## 2. Calendar status, forecast, and legend presentation

- [x] 2.1 [P] Extend `src/features/calendar/__tests__/calendar.test.tsx` with assertions for theme-aware classes/tokens on all four recorded statuses, post-calendar legend coverage, confirmed/predicted source cues, forecast cells, inferred-data markers, raw-marker visibility when the algorithm is off, and unchanged `data-status`/`data-source`/`data-forecast`/provenance attributes; run the targeted Calendar suite to establish the expected failures.
- [x] 2.2 Replace the private light-only status map in `src/features/calendar/day-cell.tsx` and the duplicated legend mappings in `src/features/calendar/index.tsx` with the shared visual vocabulary; preserve recorded-only status fills, forecast-on-unlogged behavior, today/focus rings, raw markers, the #2 assumed-data marker plus normal Low marker, and accessible labels; run the Calendar component and grid tests.
- [x] 2.3 Verify the Calendar legend samples, day-cell treatments, source/forecast cues, and algorithm-off behavior against `src/features/settings/__tests__/algorithm-off.test.tsx`; run the targeted Calendar and algorithm-off suites and confirm no change to date entry, future-date rejection, or auto-open behavior.

## 3. Status presentation

- [x] 3.1 [P] Extend `src/features/status/__tests__/status.test.tsx` with assertions for theme-aware status badge/source/forecast tokens, readable explanatory text classes, predicted-period treatment, and the existing algorithm-off branch; run the targeted Status suite to establish the expected failures.
- [x] 3.2 Update `src/features/status/lib.ts`, `src/features/status/status-card.tsx`, and any affected text in `src/features/status/index.tsx` to consume the shared status/source/text tokens; preserve status labels, date selection, read-only behavior, no-disclaimer behavior, and the logging-only explanation; run the Status tests.
- [x] 3.3 Verify Status and Calendar use the same semantic status/source palette and that a theme switch changes presentation without changing the selected status or source; run the combined Status, Calendar, and algorithm-off tests.

## 4. Existing Cycle chart presentation

- [x] 4.1 [P] Extend `src/features/cycle-chart/__tests__/strip-chart.test.tsx`, `src/features/cycle-chart/__tests__/cycle-chart.test.tsx`, and `src/features/cycle-chart/__tests__/overlays.test.tsx` with assertions for tokenized empty/Low/High/Peak bands, theme-aware overlay markers, CSS-variable values for the fertile-window fill/stroke, solid versus dashed source cues, unknown-end behavior, and no additional per-day status-band layer; run the targeted chart suites to establish the expected failures.
- [x] 4.2 Update `src/features/cycle-chart/strip-chart.tsx` and `src/features/cycle-chart/index.tsx` to use the shared tokens for existing bands, empty track, BBT/mucus/intercourse markers, legend samples, and the single fertile-window reference area; preserve `StripModel`, geometry, overlay data, solid/dashed semantics, and accessible window metadata; run the chart tests.
- [x] 4.3 Verify the chart still hides only the computed window when interpretation is disabled while retaining raw monitor bands and enabled raw overlays; run all `src/features/cycle-chart/__tests__/` tests and the existing algorithm-off suite.

## 5. History and Stats forecast presentation

- [x] 5.1 [P] Extend `src/features/history/__tests__/history.test.tsx` with assertions for theme-aware forecast/stat/warning text, visible predicted labeling, and the algorithm-off/re-enable behavior that suppresses computed forecast/fertility summaries while retaining logged cycle information; run the targeted History suite to establish the expected failures.
- [x] 5.2 Update `src/features/history/index.tsx` to consume the shared text/warning/prediction tokens and read `algorithmEnabled` at the view boundary; preserve normal algorithm-on calculations and table data, add the logging-only/reduced display guard required by the existing settings contract, and run the History tests.
- [x] 5.3 Verify History forecast values remain numerically identical across theme changes and that re-enabling interpretation restores the existing panels without a data migration; run the History, Settings algorithm-off, and store tests.

## 6. Documentation and manual visual verification

- [x] 6.1 Add `docs/VISUAL_QA.md` with a reproducible manual matrix covering light/dark themes, narrow/mobile and wide/desktop widths, all four statuses, confirmed/predicted source, future forecast, predicted ovulation, raw markers, inferred data, and algorithm on/off; verify every checklist item names an observable expected result and the relevant route/state.
- [x] 6.2 Update `docs/MILESTONE_4_STATUS.md`, `docs/MILESTONE_5_CALENDAR.md`, and `docs/MILESTONE_6_CYCLE_STRIP_CHART.md` (and the project status documentation if needed) to describe the shared visual vocabulary, preserved chart structure, legend coverage, and contrast/manual-verification expectations; verify the documentation matches the implemented labels and behavior.
- [x] 6.3 [P] Run the manual visual matrix with the local app and record any failed contrast, mobile-scanability, legend-sync, forecast-certainty, or light-mode regression findings in the change notes; do not mark the task complete until each required state has been checked in both themes.

## 7. Final validation gates

- [x] 7.1 [P] Run `pnpm test` and verify the new mapping, Calendar, Status, Cycle chart, History, and algorithm-off coverage passes without changing engine or storage tests.
- [x] 7.2 [P] Run `pnpm lint` and `pnpm build`; verify strict TypeScript, production CSS/PWA output, and the absence of a new dependency or engine/data-model change.
- [x] 7.3 Review `git diff --stat` and `git diff -- src/core/engine src/core/store` to confirm the implementation is presentation/accessibility-only, then summarize the manual QA results and any accepted limitations.
