# Tasks

## 1. Regression Coverage

- [x] 1.1 Update `src/app/__tests__/layout.test.tsx` first for Calendar `/`, Status `/status`, History, and Settings on desktop/mobile, active-state behavior, and absence of Today/`/calendar`; verify: the targeted layout test fails before route and navigation changes.
- [x] 1.2 Add status-view component tests first for date selection, read-only status output, no input/start-cycle/disclaimer controls, algorithm-off messaging, and the no-cycle state; verify: the targeted status test fails before the status feature exists.
- [x] 1.3 Extend `src/features/calendar/__tests__/calendar.test.tsx` first with the auto-open matrix: no record/no Peak/no session marker opens today, an existing record does not, monitor or mucus Peak does not, multiple Peaks do not, a consumed date does not, and a no-cycle first record is eligible; verify: the targeted Calendar test fails before auto-open behavior exists.
- [x] 1.4 Update `src/features/settings/__tests__/algorithm-off.test.tsx`, `src/features/settings/__tests__/clear-data.test.tsx`, and `src/features/cycle-chart/__tests__/cycle-chart.test.tsx` first to expect Status/Calendar behavior and the Calendar empty-state link; verify: the targeted tests fail against the current Today-oriented behavior.

## 2. Feature Ownership and Routing

- [x] 2.1 Move the shared daily-entry implementation from `src/features/today/quick-entry.tsx` into the Calendar feature, update all imports, and preserve existing save/delete/future-date behavior; verify: Calendar entry tests still exercise the same form successfully.
- [x] 2.2 Create `src/features/status/` with the date picker and status-only view, move/reuse `StatusCard` and status labels, remove `QuickEntry`/`StartCycleCard` from that view, and remove the obsolete Today input/start-cycle modules; verify: the new status tests pass and no production import references the removed Today modules.
- [x] 2.3 Change `src/app/router.tsx` so `/` renders Calendar, `/status` renders Status, and `/calendar` is removed; change `src/app/layout.tsx` navigation labels/destinations and active matching; verify: app-shell tests pass and a root route renders Calendar.

## 3. Calendar Auto-Open

- [x] 3.1 Implement Calendar auto-open eligibility from the post-replan current cycle, today's date record, and derived `peakDay`, with a date-specific browser-session marker written only when the dialog actually opens; verify: the Calendar auto-open test matrix passes.
- [x] 3.2 Integrate the auto-open selection with the existing Calendar dialog so an automatic opening selects today, respects manual date selection, closes normally, and does not reopen after the session marker is consumed; verify: Calendar entry and auto-open tests pass together.

## 4. Supporting Views and Documentation

- [x] 4.1 Update the cycle-chart empty state to link to Calendar at `/` with Calendar-oriented copy, and update settings/clear-data/status expectations to use the new routes; verify: all affected view tests pass.
- [x] 4.2 Remove the medical disclaimer from application code and delete its requirement/references from `AGENTS.md`, `README.md`, `IMPLEMENTATION_PLAN.md`, `openspec/config.yaml`, and stale milestone documentation while updating Today/Calendar/Status route descriptions; verify: repository search finds no obsolete disclaimer requirement or removed route/navigation references outside historical archives.

## 5. Integration Verification

- [x] 5.1 Run the focused app-shell, status, Calendar, settings, and cycle-chart suites; verify: all targeted tests pass with no Today imports or `/calendar` expectations remaining.
- [x] 5.2 Run `pnpm test && pnpm lint && pnpm build` and review the scoped diff; verify: all project gates pass and no persistence/engine behavior changed.

## 6. Verification Follow-up

- [x] 6.1 Add `src/app/__tests__/router.test.tsx` covering `/` → Calendar, `/status` → Status, and no `/calendar` route; verify: the router test passes.
- [x] 6.2 Extend `src/features/status/__tests__/status.test.tsx` to assert confirmed/predicted source, window explanation, and next-period output when available; verify: the Status suite passes.
- [x] 6.3 Add an algorithm re-enable scenario to `src/features/settings/__tests__/algorithm-off.test.tsx`; verify: logging-only mode and restored interpretation are both covered.
- [x] 6.4 Add an already-empty clear-data scenario to `src/features/settings/__tests__/clear-data.test.tsx`; verify: the no-op path passes without errors.
- [x] 6.5 Add a consecutive monitor-Peak case to the Calendar auto-open matrix and export the storage-key helper for test reuse; verify: the Calendar suite passes without duplicated key literals.
- [x] 6.6 Re-run focused tests, full tests, lint, and build; verify: all project gates remain green.
