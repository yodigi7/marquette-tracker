# Tasks

## 1. Regression tests

- [x] 1.1 [P] Add store tests in `src/core/store/__tests__/postPeakFill.store.test.ts` proving algorithm-off placement and derived output use user evidence only while inferred rows remain stored, are hidden, and return through reconciliation when the algorithm is re-enabled; run the targeted store suite to establish the expected failures.
- [x] 1.2 [P] Add frontend tests in the existing Calendar, cycle-chart, Status, and History test files proving inferred rows are absent from all interpretation surfaces while off and user-authored records remain visible/editable; run the targeted feature suites to establish the expected failures.
- [x] 1.3 [P] Add hydration tests in `src/core/store/__tests__/postPeakFill.store.test.ts` and `src/app/__tests__/hydration.test.tsx` proving the loading gate remains until reconciliation/final refresh and a failed hydration leaves the store non-hydrated; run the targeted suites to establish the expected failures.
- [x] 1.4 [P] Add failure-injection store tests for day-record, deletion, settings, and cycle-start mutations proving a reconciliation failure rolls back the source mutation and generated-row effects; run the targeted store suite to establish the expected failures.

## 2. User-only evidence and frontend filtering

- [x] 2.1 Add a shared active-record selector/helper in `src/core/store/selectors.ts` that returns all user records plus inferred records only when interpretation is enabled; use it in Calendar, cycle-chart, Status, and History data paths and verify the feature tests pass.
- [x] 2.2 Update algorithm-off reconciliation in `src/core/store/useAppStore.ts` to derive cycles and engine output from user evidence only, leave inferred rows persisted and unassigned/hidden while off, and reconcile all records on re-enable; verify placement, output, and re-enable tests pass.

## 3. Atomic mutation and hydration ordering

- [x] 3.1 Extract the transaction body of reconciliation in `src/core/store/useAppStore.ts` into a transaction-aware internal operation and add one outer-transaction mutation helper covering day-record writes, deletions, settings updates, and cycle starts; call `refresh()` only after commit and verify rollback tests pass.
- [x] 3.2 Update `hydrate()` and `src/app/providers.tsx` so initial reconciliation and final refresh complete before `hydrated` becomes true, while rejection leaves the loading gate active; verify hydration and provider tests pass.

## 4. Validation gates

- [x] 4.1 Run `pnpm test`, `pnpm lint`, and `pnpm build`; verify all commands pass with no new dependency, TypeScript, test, lint, or production-build regressions.
- [x] 4.2 Run `openspec validate --changes` and `git diff --check`; verify the combined change artifacts and implementation diff are clean. The target change validates cleanly; the repository-wide check also reports pre-existing errors in the unrelated `monitor-only-peak-inference` change, which was left untouched.
