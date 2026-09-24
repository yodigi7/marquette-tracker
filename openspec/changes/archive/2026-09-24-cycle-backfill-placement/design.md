# Design

## Context

- The Calendar dialog (`src/features/calendar/index.tsx:93-121`) only renders its body when `selectedCycle = cycleForDate(cycles, selected)` exists, so dates before the first cycle (or every date in a wiped app) produce an empty dialog. Demo seeding is one-shot (`providers.tsx` gates on `demoSeeded`; `clearAllData()` sets it true), which made this reachable in normal use.
- Cycles and day records are stored rows; each `DayRecord` carries denormalized `cycleId` and `dayInCycle` (`src/core/store/entities.ts`).
- Domain anchor: Day 1 = first day of menses. The engine derives all statuses at read time from cycles + records, so any correct re-partition is picked up by `refresh()`.
- Decision from review: **no cycle is protected, including the live cycle.** Cycle structure is fully re-derived from logged days on every save.

## Goals / Non-Goals

**Goals:**
- The date dialog is usable for any date up to and including today; no empty dialog.
- Future dates cannot be logged, blocked at the UI and at the save boundary.
- One placement pass re-derives all cycles from all logged days by the menses-run rule, so any logging order yields a single forward pass's grouping.
- Declared cycle starts ("Start a new cycle") remain boundaries so that explicit user intent is not overwritten by the automatic rule.
- The algorithm is pure, table-driven-testable, and portable (AGENTS.md).

**Non-Goals:**
- No early-postpartum/non-cycling/transitioning logic.
- No cycle deletion UI, export/backup, cloud sync, or reminders.
- No change to engine rules, calendar rendering beyond the dialog, or settings.

## Decisions

### 1. Pure partition with anchor support (`planCycles(days, anchors)`)
Walk the logged days in date order. Because the walk visits only logged days, "the previous logged day, ignoring 0 days" is the previous walk element. A boundary is opened at: an anchor date, the first logged day when no boundary has been opened yet, or an M day whose previous logged day is N. Anchors are then unioned in, the set is sorted, and each record is assigned to the latest boundary at or before it. Classification: a day is M iff its stored `bloodFlow` is `light|medium|heavy`.

- `NNNNNN MMMM NNNN` with no anchors -> `[N..N]`, `[M..M-N..N]`.
- `M000M 0 NNNNNN` with no anchors -> one cycle, Day 1 = first M.
- Anchor at 1 Mar with records on 1 Mar and 14 Mar (both N) -> one cycle, Day 1 = 1 Mar, record on 14 Mar is day 14 (the "first logged day" rule does not fire because a boundary already exists).
- Order independence falls out of sorting: grouping depends only on the set of logged days.

### 2. Anchors are marked, not inferred
`CycleEntity` gains `pinned: boolean`, set only by `setNewCycle`. It is a data field, not an index, so no Dexie schema bump is required and existing rows read as `false`. Inferring anchors instead (for example "a cycle whose day1 has no record") was rejected: a derived cycle whose day-1 record is later deleted would be misread as an anchor and survive as an empty cycle the user cannot remove. `pinned` is orthogonal to protection — a pinned cycle is still re-partitioned; it only guarantees its day1 opens a cycle.

### 3. One placement pass per write, inside a single transaction
`addDayRecord(cycleId, date, dayInCycle, patch)` stays the single write path for entry forms (its `cycleId` / `dayInCycle` arguments become advisory):
1. reject `date > today`;
2. load cycles and records, read `pinned` day1 values as anchors;
3. upsert/insert the record, then run `planCycles` over every logged day;
4. reconcile cycle rows in one Dexie `rw` transaction: reuse a cycle whose `day1` matches a derived boundary, create missing ones, set each cycle's `closedAt` to the day before the next boundary (last boundary stays open), re-assign every record's `cycleId` + `dayInCycle`, drop cycles that are no longer boundaries and hold no records, then renumber `cycleNo` by day1 order;
5. `refresh()`.

Existing call sites (Today view, tests) keep working unchanged while exercising the real behavior. A separate `saveDayRecordForDate` action was dropped as unnecessary: folding the pass into `addDayRecord` keeps a single write path, and the Calendar dialog needs no save override. `removeDayRecord(id)` re-runs the pass without that record, so a deleted anchor cannot leave a stale cycle.

### 4. Dialog renders for any date up to today
`DialogContent` renders whenever a date is selected and `selected <= today`. Covered dates keep the existing status header; uncovered dates show a read-only pending-placement header computed from `planCycles` with the date added (derived Day 1 and cycle day) and a note that saving re-derives cycle structure. Selecting a future date opens no form and shows the "future dates cannot be logged" message. `QuickEntry` saves through `addDayRecord`, so no save-path override is needed.

### 5. Repository additions
`cycles.create` accepts `pinned`; `cycles.update(id, patch)` covers `day1` / `closedAt` / `cycleNo` / `pinned`; `days.update(id, patch)` covers re-assignment. Sync metadata is bumped through the existing helpers.

## Risks / Trade-offs

- **Sparse logging fuses periods.** Per the M/0 rule, two menses days with only unlogged days between them fuse into one long cycle. This is the requested behavior, but it can lengthen a cycle in stats; the engine's 21-42 day band warning still flags it.
- **The live cycle can move.** With no protection, backfilling a menses day that the rule groups with the current cycle changes its Day 1. This is accepted deliberately; the alternative (protecting the live cycle) contradicts the requested grouping and leaves a per-chunk cycle behind.
- **Re-deriving everything on each save** is heavier than a single-record write, but bounded by personal data scale and keeps grouping globally consistent with no incremental bookkeeping to drift.
- **Anchors can split a cycle** if the user starts a cycle mid-run; that is the declared intent, and it is visible because the new boundary shows in the calendar.
- **Transactionality** keeps a failed placement from leaving half-applied `cycleId` / `dayInCycle` values.
