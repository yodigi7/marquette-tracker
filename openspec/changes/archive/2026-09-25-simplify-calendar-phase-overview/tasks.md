# Tasks

## 1. Presentation Contract and Preferences

- [x] 1.1 [P] Add failing tests in `src/features/calendar/__tests__/calendar.test.tsx` and a focused visual-mapping test for collapsing `pre-fertile`/`fertile`/`post-peak`/`post-calendar` to `Before`/`Fertile`/`After`; verify the new tests fail before implementation.
- [x] 1.2 [P] Add failing store/settings tests for a persisted `calendarDetailMode` preference whose default is `simple`, including hydration of legacy settings and restoration of an explicit `full` value; verify the tests fail before the setting is added.
- [x] 1.3 Add the `calendarDetailMode` type, default, and hydration/persistence handling in `src/core/store/entities.ts`, the store/repository path, and related settings tests; verify a fresh user gets `simple` and a saved choice survives reload without changing records.
- [x] 1.4 Add the shared Calendar phase mapping and simplified visual tokens/marker classes in `src/lib/fertility-visuals.ts` and `src/index.css`; verify mapping and token tests cover light/dark values and preserve the existing precise status values for other surfaces.

## 2. Calendar Summary and Day Cell

- [x] 2.1 Add failing component tests for the current-cycle summary states (interpreted cycle, missing monitor reading, logging-only mode, and no derived cycle) in `src/features/calendar/__tests__/calendar.test.tsx`; verify the tests fail before the summary exists.
- [x] 2.2 Add a focused `CalendarSummary` component under `src/features/calendar/` that renders cycle number, cycle day, simplified phase, monitor value, and the logging-only/no-cycle states; verify it is read-only and does not intercept day-cell selection.
- [x] 2.3 Add failing `DayCell` tests for the bottom menses stripe, `date*` assumed marker, one shape/color-coded monitor marker, accessible text, and full-detail secondary indicators; verify the tests fail against the old marker row.
- [x] 2.4 Refactor `src/features/calendar/day-cell.tsx` to render the simplified phase background, date/asterisk, bottom menses stripe, one color-coded monitor marker, and an optional full-detail indicator area; verify menses and monitor values remain readable at the existing mobile cell size.
- [x] 2.5 Wire the summary and display-mode props through `src/features/calendar/index.tsx` and the grid resolution path, keeping future-date rejection, auto-open, dialog entry, forecast, and algorithm-disabled behavior unchanged; verify the Calendar integration tests pass.

## 3. Legend and Full-Detail Presentation

- [x] 3.1 Add failing tests for the grouped simple legend (`Before`, `Fertile`, `After`, menses, grouped monitor key, `* Assumed`) and the expanded full-detail legend; verify legend samples match the active cell treatments.
- [x] 3.2 Replace the flat Calendar legend in `src/features/calendar/index.tsx` with the grouped simple legend and a full-detail legend, coordinating the preference model with GitHub issue #15; verify no duplicate or conflicting visibility state is introduced.
- [x] 3.3 Add full-detail rendering for available intercourse, predicted ovulation, source/forecast, and provenance cues without changing the underlying records or the simple default; verify the existing detailed marker behavior remains reachable.
- [x] 3.4 Update `src/features/calendar/__tests__/postPeakFill.test.tsx`, `calendar.test.tsx`, and any affected `src/lib/__tests__/fertility-visuals.test.ts` assertions for the new observable marker/legend contract; verify algorithm-off mode hides inferred asterisks and interpretation styling while retaining user-authored data.

## 4. Verification and Quality Gates

- [x] 4.1 Run the focused Calendar and visual tests after each shared-file task and resolve failures without changing engine semantics; verify `pnpm test` passes for the affected suites.
- [x] 4.2 Perform manual visual QA at approximately 320px and desktop widths in light and dark themes with algorithm on and off, seeded/user/inferred data, future forecasts, and both simple/full-detail modes; verify the summary, stripe, asterisk, monitor colors, contrast, and legend remain readable.
- [x] 4.3 Run the complete project gates — `pnpm test`, `pnpm lint`, and `pnpm build` — and verify all pass with no new dependency, engine, or data-model changes.

## 5. Verification Follow-ups

- [x] 5.1 Add a MODIFIED block for "Fertility states use a shared theme-aware visual language" in `specs/fertility-visuals/spec.md` so the app-level rule permits the Calendar's collapsed phase aliases while precise-status surfaces keep all four treatments distinct; verify `openspec validate --strict` passes.
- [x] 5.2 Add a `DayCell` test asserting the accessible label names the date, phase, monitor value, menses, and assumed provenance.
- [x] 5.3 Add a backup test proving a legacy settings document without `calendarDetailMode` restores as `simple`.
- [x] 5.4 Replace the vacuous algorithm-off `Assumed data` assertion and the stale status-class guards with checks against the markers and phase tokens the Calendar actually renders (`data-phase`, `calendar-assumed-marker`).
- [x] 5.5 Remove the duplicated `--fertility-phase-*` palette and the unused phase `foreground`/`border` tokens so `FERTILITY_CALENDAR_PHASE_VISUALS` reuses the existing status treatments; verify rendered colors are unchanged in light and dark and re-run the gates.
