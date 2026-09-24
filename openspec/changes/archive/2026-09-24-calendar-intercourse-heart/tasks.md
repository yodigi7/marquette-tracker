# Tasks

## 1. Regression Coverage

- [x] 1.1 Extend `src/features/calendar/__tests__/calendar.test.tsx` to record intercourse and assert that a small filled red heart appears in the day cell and legend but not on an unrecorded day — verify: `pnpm exec vitest run src/features/calendar/__tests__/calendar.test.tsx` fails against the current dot for the expected reason.

## 2. Calendar Implementation

- [x] 2.1 Replace the intercourse dot in `src/features/calendar/day-cell.tsx` with a `Heart` using `size-2`, `fill-red-500`, and `text-red-500`, preserving the “Intercourse” title — verify: the targeted day-cell assertions pass.
- [x] 2.2 Replace the Intercourse legend dot in `src/features/calendar/index.tsx` with the same heart while leaving `LegendDot` and other entries unchanged — verify: `pnpm exec vitest run src/features/calendar/__tests__/calendar.test.tsx` passes.

## 3. Integration Verification

- [x] 3.1 Run the full project quality gates and review the scoped diff — verify: `pnpm test && pnpm lint && pnpm build` all pass and no unrelated Calendar behavior changed.
