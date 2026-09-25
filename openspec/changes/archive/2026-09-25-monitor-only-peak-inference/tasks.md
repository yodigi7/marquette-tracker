# Tasks

## 1. Monitor-only and default-four test contract (tests first)

- [x] 1.1 [P] Update the existing table cases in `src/core/engine/__tests__/marquette.test.ts` so monitor-plus-mucus uses the monitor Peak, mucus-only Peak produces no monitor Peak, and `PeakSource` no longer reports mucus/both; run the focused suite to establish the expected failures.
- [x] 1.2 [P] Update `src/core/engine/__tests__/marquette.test.ts` and `src/core/engine/__tests__/predict.test.ts` to use the four-day default and assert P through P+4 fertility with the first inferred Low at P+5; add engine-facing provenance cases proving inferred Low cannot change Peak/window evidence; run both focused suites to establish the expected failures.
- [x] 1.3 [P] Update `src/features/calendar/__tests__/calendar.test.tsx` so a monitor Peak suppresses today's auto-open while a mucus-only Peak does not under the monitor-only contract; run the focused suite to establish the expected failures.
- [x] 1.4 [P] Update existing default-dependent expectations in `src/core/store/__tests__/store.test.ts`, `src/core/store/__tests__/postPeakFill.store.test.ts`, `src/features/settings/__tests__/settings.test.tsx`, `src/features/settings/__tests__/clear-data.test.tsx`, `src/features/calendar/__tests__/postPeakFill.test.tsx`, `src/features/status/__tests__/status.test.tsx`, and `src/features/history/__tests__/history.test.tsx` from 3/P+4 to 4/P+5; leave fixtures that pass an explicit window unchanged; run the focused suites to establish the expected failures.

## 2. Pure engine and settings implementation

- [x] 2.1 Update `src/core/engine/types.ts` so `DayRecordInput` exposes optional `dataOrigin` and `PeakSource` reflects monitor-only output; document that absent provenance is user-authored and keep mucus fields available for logging/display.
- [x] 2.2 Update `src/core/engine/marquette.ts` to derive Peak, begin, end, and source from a user-origin monitor-evidence subset while returning day results for all records; ignore mucus Peak evidence and change `DEFAULT_POST_PEAK_DAYS` to 4.
- [x] 2.3 Verify `src/core/engine/engineSdk.ts` and `src/core/engine/predict.ts` pass all records for day/coverage results while the cycle rules use only user-origin monitor evidence; run the engine, predict, and smoke suites.
- [x] 2.4 Update `src/core/store/entities.ts` so missing/new settings default to `postPeakDays: 4`; verify the existing repository default merge preserves an explicitly persisted value and run store/settings tests.

## 3. Post-Peak interruption tests (tests first)

- [x] 3.1 [P] Update `src/core/engine/__tests__/postPeakFill.test.ts` for the default P+5 start, monitor-only anchor, mucus-only no-fill, monitor-High stop, later monitor-Peak restart, `after-user-low` High bound, and cap reset; run the focused suite to establish the expected failures.
- [x] 3.2 [P] Extend `src/core/store/__tests__/postPeakFill.store.test.ts` for High interruption and stale-tail removal, later-Peak fresh window/budget, inferred algorithm-on coverage, and user-only final placement; run the focused suite to establish the expected failures.
- [x] 3.3 Confirm existing provenance, suppression, atomic-mutation, hydration, and algorithm-off regression tests remain green and are not duplicated by the new cases.

## 4. Planner and reconciliation implementation

- [x] 4.1 Update `src/core/engine/postPeakFill.ts` to use explicit `monitorPeakDay` semantics, stop generation at the earliest user monitor High on/after the tail start, invalidate downstream inferred rows, and restart from a later monitor Peak while preserving `auto-after-window`, `after-user-low`, and the 30-row budget.
- [x] 4.2 Update `src/core/store/useAppStore.ts` so the final post-generation assignment still derives plans from the existing user-only placement context; pass all records only for assignment/coverage when interpretation is enabled and preserve the archived atomic, hydration, and algorithm-off behavior.
- [x] 4.3 Run the complete `src/core/store/__tests__/` suite and verify user-authored records/provenance are preserved, no future writes occur, and generated rows never split or move cycles.

## 5. Calendar, auto-open, and status presentation

- [x] 5.1 [P] Extend Calendar tests to assert the day-entry dialog never renders status/source/forecast text, while inferred provenance, editing, deletion, future-date rejection, algorithm-off logging, and monitor-only auto-open behavior remain correct; run the focused suites to establish the expected failures.
- [x] 5.2 Remove the selected computed-status calculation and `Status:` description from `src/features/calendar/index.tsx`; keep the date, input form, provenance marker, and edit/delete path, with the read-only Status view as the sole derived-status surface.
- [x] 5.3 Update `src/features/status/lib.ts` and Status tests so post-Peak rule text reflects the configured number of days rather than hard-coded 3; run Status, Calendar, and algorithm-off suites.

## 6. Documentation and validation

- [x] 6.1 Update `AGENTS.md`, `IMPLEMENTATION_PLAN.md`, `README.md`, `docs/MILESTONE_2_ENGINE.md`, `docs/MILESTONE_3_STORE.md`, and the relevant Calendar/Settings documentation to describe monitor-only evidence, default 4/P+5, High interruption, mucus remaining visible but inert, algorithm-on coverage, and the logging-only day dialog.
- [x] 6.2 Run `pnpm test`, `pnpm lint`, `pnpm build`, `openspec validate monitor-only-peak-inference --type change`, `openspec validate --all`, and `git diff --check`; verify all gates pass, no dependency was added, and the earlier post-Peak fill/hardening changes remain archived as the baseline.
