# Tasks

## 1. Comparison chart component (tests first)

- [x] 1.1 Write tests for `CycleComparisonChart` covering: alignment by cycle day, overlapping cycles with mixed lengths, algorithm-disabled (no window bands), and empty/single-cycle cases. Verify tests fail (component does not exist yet).
- [x] 1.2 Implement `CycleComparisonChart` component in `src/features/cycle-chart/comparison-chart.tsx`: render a Recharts `ComposedChart` with per-cycle bar series and reference areas, using the per-cycle color palette from the design. Verify tests from 1.1 pass.
- [x] 1.3 Add per-cycle color palette and helper functions to `src/features/cycle-chart/lib.ts`. Verify existing `lib.test.ts` still passes.

## 2. Comparison view (tests first)

- [x] 2.1 Write tests for `CycleComparisonView` covering: default selection (recent N = historyWindow), changing N, custom cycle selection, algorithm-disabled respect, and empty/single-cycle handling. Verify tests fail (view does not exist yet).
- [x] 2.2 Implement `CycleComparisonView` in `src/features/cycle-chart/comparison.tsx`: cycle selection controls (Recent N mode with number input, Custom mode with checkboxes), render `CycleComparisonChart` with selected cycles, handle empty state. Verify tests from 2.1 pass.

## 3. Route and navigation

- [x] 3.1 Add `/cycle-compare` route to `src/App.tsx` rendering `CycleComparisonView`. Verify the route resolves and renders.
- [x] 3.2 Add a "Compare cycles" link from the History view (`src/features/history/index.tsx`) to `/cycle-compare`. Verify the link is present and navigates correctly.

## 4. Integration and verification

- [x] 4.1 Run `pnpm test` and verify all tests pass, including existing cycle-chart tests.
- [x] 4.2 Run `pnpm check` and verify the full gate is green (format, lint, test, build).
- [x] 4.3 Run `openspec validate --all` and verify the change artifacts are valid.
