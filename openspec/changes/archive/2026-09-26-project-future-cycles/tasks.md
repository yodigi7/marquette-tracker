# Tasks

## 1. Engine: the length estimator

- [x] 1.1 Write failing table-driven tests in `src/core/engine/__tests__/` for the survival-conditioned median: conditioning on cycle day, a single-length cycle (26, 28, 29, 29, 30, 45), the two-sample floor falling back to the unconditioned median, the lookback count following `historyWindow`, and the late-cycle case where the unconditioned median would place the projected end in the past. Verify the tests fail.
- [x] 1.2 Implement the estimator in `src/core/engine/projection.ts` and verify the tests from 1.1 pass.
- [x] 1.3 Switch `computePredictions` in `src/core/engine/predict.ts` to call the same estimator instead of `mean(lengths)`, and verify a new test asserts History's `expectedPeriodStart` equals the projection's first cycle boundary so the two surfaces cannot drift.
- [x] 1.4 Run `pnpm test` and verify the engine suite is green.

## 2. Engine: the projection chain

- [x] 2.1 Write failing table-driven tests for `projectCycles` in `src/core/engine/__tests__/`: the open cycle receives a projected length, the next projected cycle starts the day after it, no date falls outside every cycle, projection continues past one additional cycle with no fixed maximum, and a cycle at or beyond `cycleMaxLength` stops the projection.
- [x] 2.2 Write failing tests for a projected cycle's fertile window: begin at `min(lookback peaks) - 6`, end at `max(lookback peaks) + postPeakDays`, the end moving with a configured post-Peak value, and no averaged or median Peak day being produced.
- [x] 2.3 Implement `projectCycles` by calling `computeCycle` with a synthetic `CycleInput`, an empty record array, the projected length, a cycle number past the history threshold, and the real `CycleHistory`. Accept an `untilDate` so the chain is computed only as far as the caller needs. Verify the tests from 2.1 and 2.2 pass.
- [x] 2.4 Update `src/core/engine/types.ts`: remove `peakDayMean` from `Forecast`, add the projected-cycle types and the estimator's inputs. Verify `pnpm test` is green and no type errors remain.
- [x] 2.5 Run `pnpm test` and verify the whole engine suite is green.

## 3. Store and settings plumbing

- [x] 3.1 Add the projection setting to `src/core/store/entities.ts` with a default of `false`, and verify a store test asserts a missing value resolves to off.
- [x] 3.2 Add a selector in `src/core/store/selectors.ts` that returns the projected cycles covering a caller-supplied range, gated on the setting, reading the engine output and settings. Amended during apply: the projection is derived per visible range rather than in `engineSdk`, because the range belongs to the Calendar and a store-side horizon would cap the chain (see design.md). Verify a test asserts the setting on and off states, that the returned range is bounded by the requested date, and that disabling it changes no stored record.
- [x] 3.3 Verify the setting round-trips through `src/core/backup/backup.ts` export and restore, and that a backup without the field restores as off. Confirm the backup format version is unchanged and the document shape is otherwise identical.

## 4. Calendar: projected days

- [x] 4.1 Write failing tests in `src/features/calendar/__tests__/grid.test.ts` for `resolveCell`: a date inside a projected cycle resolves a status and carries the forecast treatment, a date inside a real cycle is unchanged, and the existing forecast scoping to dates after today still holds.
- [x] 4.2 Update `resolveCell` in `src/features/calendar/grid.ts` to fall back to the projected collection when no stored cycle covers the date, keeping `cycleForDate` untouched for real cycles. Verify the tests from 4.1 pass.
- [x] 4.3 Add a projected menses marker to `CellInfo` and render the existing menses stripe on a projected cycle's day 1 in `src/features/calendar/day-cell.tsx`. Verify a test asserts the stripe appears on a projected day 1 and that the cell remains marked as projected.
- [x] 4.4 Verify a projected day is not selectable: a future-date selection still reports that future dates cannot be logged and creates no record.
- [x] 4.5 Compute the chain to the visible month grid's range in `src/features/calendar/index.tsx` and verify paging forward across several months keeps the chain continuous with no unpainted date.

## 5. Remove the point ovulation estimate

- [x] 5.1 Remove the predicted-ovulation marker from `src/features/calendar/day-cell.tsx` and its `predictedOvulationDay` plumbing in `src/features/calendar/index.tsx`, deleting the `Math.round(peakDayMean)` source and the `?? 14` no-data fallback. Verify no code path still produces a single-day ovulation estimate.
- [x] 5.2 Remove the ovulation marker treatment from `src/lib/fertility-visuals.ts` and verify the Calendar legend no longer renders an ovulation entry.
- [x] 5.3 [P] Remove the now-unreferenced ovulation tokens from `src/index.css` and verify `rg -n 'ovulation' src/index.css` returns nothing. This is independent of 5.2's logic and touches only the token file.
- [x] 5.4 Verify with `rg -n 'predictedOvulation|peakDayMean' src` that no production reference remains outside the estimator tests, and run `pnpm test`.

## 6. Legend and Settings UI

- [x] 6.1 In `src/features/calendar/index.tsx`, update the legend to drop the ovulation entry and add a projected-treatment entry that appears only when the projection is on. This file was last edited in 5.1; apply it after that task. Verify a legend test asserts the projected entry is present when projection is on and absent when it is off.
- [x] 6.2 Add the default-off "Project future cycles on the calendar" control to the Core section of the Settings feature. Verify a settings test asserts the default is off, that the label names the Calendar, and that toggling it persists across a reload.
- [x] 6.3 Verify the toggle governs the projection only: with it off, the next-fertile-window forecast overlay is still shown and no projected cycle appears; with the algorithm disabled, no projected output appears regardless of the toggle.

## 7. History

- [x] 7.1 Remove the average-Peak-day statistic from `src/features/history/index.tsx`, keeping the existing Peak-day range. Verify a test asserts the range is present and no averaged Peak day is rendered.
- [x] 7.2 Add the estimator disclosure to the forecast panel, stating that projected dates use the median of the configured lookback window, and verify a test asserts the disclosure names that estimator and matches the one used for the displayed date.
- [x] 7.3 Verify the panel reports that no projection is available, and names no estimator, when there is no closed cycle.

## 8. Gates and verification

- [x] 8.1 Run `pnpm test`, `pnpm lint`, and `pnpm build` and verify all three pass with no new dependency and no change to the fertile-window begin/end rules, the monitor-only Peak boundary, or cycle placement.
- [x] 8.2 Verify with `rg -n 'peakDayMean|predictedOvulation' src` that only the estimator tests reference the removed mean, and confirm the backup document shape is unchanged by diffing an export before and after.
- [x] 8.3 Manually confirm against a real database: an open cycle with no Peak shows `Fertile` from day 6 through today and continues as projected days with no seam, the next projected cycle starts the day after that tail, a projected day 1 shows the menses stripe, paging several months forward stays continuous, and no date shows a single-day ovulation marker.
- [x] 8.4 Manually confirm the setting is purely additive: with it off the calendar is identical to its state before this change, and turning it on removes nothing that was previously visible.
