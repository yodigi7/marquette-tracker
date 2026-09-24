# Proposal

## Why

After clearing all data — or before any cycle exists — clicking a date in the Calendar opens an empty dialog: the entry form only renders when a cycle already covers the clicked date, so days before the first cycle (or in a wiped app, every day) cannot be logged or viewed. The user cannot backfill history through the Calendar, which is the intended entry point for past days.

## What Changes

- The Calendar date dialog opens a full day-entry form for **any date up to and including today**: pre-populated when a Day Record exists, blank and ready for input otherwise. No more empty box.
- **Future dates cannot be logged** — no day record may be saved for a date after today.
- Cycle structure is **re-derived from all logged days on every save** using the menses-run rule. A day is Menses (M), logged no-menses (N), or no data (0). A new cycle begins at the first logged day and at every M whose previous *logged* day (skipping 0s) is an N. 0s never break a cycle; only an explicit N does. A leading N-run is its own cycle with no menses recorded yet; trailing N days continue the current cycle.
- **No cycle is protected.** Records, Day 1 values, cycle boundaries, and open/closed state may all change on any save, including the live current cycle. The only exceptions are boundaries the user declared explicitly with "Start a new cycle", which are always cycle starts.
- Placement is therefore a global re-partition, so history logged in random chunks and in any order lands in the same cycles a single forward pass would produce.
- Cycles derived from backfill appear in history, predictions, and stats like any other cycle.

## Capabilities

### New Capabilities
- `calendar`: the Calendar view's per-day entry dialog (open-and-log any day up to today, pre-population, future-date block) and the menses-run placement rule that re-derives cycle structure from logged days.

### Modified Capabilities
- *(none — existing specs `app-shell` and `app-settings` are unaffected)*

## Impact

- `src/features/calendar/index.tsx`: the date dialog renders the entry form for uncovered (backfillable) dates and blocks future dates.
- `src/features/today/quick-entry.tsx`: saves through the single placement-aware store path instead of writing to a caller-supplied cycle.
- Store: one placement pass re-derives all cycles and re-assigns every record's `cycleId` / `dayInCycle` inside a single Dexie transaction, then `refresh()` recomputes engine output. Adds a `pinned` marker on cycles declared via "Start a new cycle".
- Existing `setNewCycle` gains the boundary marker; `addDayRecord` / `removeDayRecord` route through the placement pass. Existing `setNewCycle` no-op guard is retained.
- No new dependencies.
