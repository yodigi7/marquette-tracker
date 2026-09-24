# Tasks

## 1. Pure placement engine (`core/engine`)

- [x] 1.1 Extend the table-driven `planCycles` tests with anchor cases: an anchor date opens a cycle even with no record on it, a record after an unrecorded anchor lands in the anchor's cycle with the correct cycle day, and the "first logged day" rule does not fire before an existing boundary. Re-run the canonical charts `NNNNNNMMMMNNNN` and `M000M0NNNNNN`.
- [x] 1.2 Implement `planCycles(days, anchors)` in `src/core/engine/placement.ts` (pure, no React/Dexie imports, portable to Python): boundaries at anchors, at the first logged day when none is open yet, and at every menses day whose previous logged day is non-menses; assign each record to the latest boundary at or before it.

## 2. Cycle model and store placement pass

- [x] 2.1 Mark declared cycle starts: add `pinned` to `CycleEntity`, have `setNewCycle` create pinned cycles, let `repos.cycles.create` accept `pinned`, and include it in the `cycles.update` patch type.
- [x] 2.2 Make `addDayRecord` the single placement-aware write path: reject dates after today, upsert the record, run `planCycles` over all logged days with pinned day1 values as anchors, then reconcile cycles in one Dexie transaction (reuse by day1, create missing, `closedAt` = day before the next boundary with the last open, re-assign every record's `cycleId` / `dayInCycle`, delete emptied non-boundary cycles, renumber `cycleNo` by day1) and `refresh()`.
- [x] 2.3 Re-run placement from `removeDayRecord` so a deleted anchor leaves no stale cycle, and keep existing `addDayRecord` call sites working.
- [x] 2.4 Store tests (`src/core/store/__tests__/store.test.ts`): backfill after a wipe creates a cycle from logged days; an earlier menses day merges into a later-logged cycle with Day 1 moved back; the live cycle is re-derived rather than protected; a pinned cycle keeps its boundary and its records' cycle days; future dates are rejected with no write; deleting a record re-derives the remaining structure.

## 3. Calendar dialog and entry form

- [x] 3.1 Update `src/features/calendar/index.tsx`: render the dialog for any selected date up to today (remove the `selected && selectedCycle` gate), show a pending-placement header for uncovered dates, and show the "future dates cannot be logged" message without opening a form for future dates.
- [x] 3.2 Let `QuickEntry` (`src/features/today/quick-entry.tsx`) keep saving through `addDayRecord`, which now derives the cycle, so uncovered dates create their cycle on save.
- [x] 3.3 Calendar view tests: empty app -> clicking a past date opens a blank form that saves; a covered date opens pre-populated; a future date is rejected with a message and writes nothing; open-and-close without saving creates nothing.

## 4. Milestone gates

- [x] 4.1 Run `pnpm test` (all suites green, including the new engine, store, and calendar tests).
- [x] 4.2 Run `pnpm lint` and `pnpm build` (no new warnings or errors).
